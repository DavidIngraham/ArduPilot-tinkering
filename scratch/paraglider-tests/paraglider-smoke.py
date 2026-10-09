import math
import pathlib
import subprocess
import tempfile
import time
from pymavlink import mavutil

root = pathlib.Path('/workspace/ardupilot')
for model in ('paraglider', 'paraglider-throw', 'paraglider-tow'):
    work = tempfile.mkdtemp(prefix=model + '-')
    log = open(work + '/sitl.log', 'w')
    process = subprocess.Popen([
        str(root / 'build/sitl/bin/arduplane'), '-M', model,
        '--defaults', str(root / 'Tools/autotest/default_params/paraglider.parm'),
        '--home', '-35.363261,149.165230,584,353', '--speedup', '5',
        '--serial0', 'tcp:5760', '-w',
    ], cwd=work, stdout=log, stderr=subprocess.STDOUT)
    connection = None
    try:
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError('SITL exited: ' + pathlib.Path(work + '/sitl.log').read_text())
            try:
                connection = mavutil.mavlink_connection('tcp:127.0.0.1:5760')
                break
            except OSError:
                time.sleep(0.2)
        assert connection is not None, 'SITL TCP startup timed out'
        assert connection.wait_heartbeat(timeout=20), 'No heartbeat'
        for name, expected in [('TECS_PG_ENABLE', 1), ('SERVO1_FUNCTION', 190), ('SERVO2_FUNCTION', 191)]:
            connection.mav.param_request_read_send(connection.target_system, connection.target_component, name.encode(), -1)
            deadline = time.monotonic() + 10
            found = False
            while time.monotonic() < deadline:
                param = connection.recv_match(type='PARAM_VALUE', blocking=True, timeout=1)
                if param and param.param_id == name:
                    assert param.param_value == expected, (name, param.param_value)
                    found = True
                    break
            assert found, 'Missing parameter ' + name
        connection.mav.request_data_stream_send(connection.target_system, connection.target_component, mavutil.mavlink.MAV_DATA_STREAM_ALL, 10, 1)
        samples = 0
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            attitude = connection.recv_match(type='ATTITUDE', blocking=True, timeout=1)
            if attitude:
                assert all(math.isfinite(getattr(attitude, field)) for field in ['roll', 'pitch', 'yaw', 'rollspeed', 'pitchspeed', 'yawspeed'])
                samples += 1
        assert samples >= 10, ('Too few attitude samples', samples)
        assert process.poll() is None, 'SITL crashed'
        print(f'PASS {model}: heartbeat, configured brake/TECS parameters, {samples} finite attitude samples. Log: {work}/sitl.log', flush=True)
    finally:
        if connection:
            connection.close()
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        log.close()
