# AP_FLAKE8_CLEAN
import json,shutil,subprocess
from pathlib import Path
root=Path(__file__).parent
repo=Path('/workspace/ardupilot')
source=repo/'libraries/SITL/SIM_Paraglider.cpp'
original=source.read_text()
(root/'production.cpp').write_text(original)
shutil.copy2(repo/'build/sitl/bin/arduplane',root/'production-arduplane')
old=(root.parent/'physics-review/airborne-experiment.cpp').read_text()
start=old.index('    if (launch_accel < 0 && launch_start_ms == 0)')
end=old.index('    update_wind(input);',start)
initialization=old[start:end]
s=original.replace('    if (strstr(frame_str, "-tow")) {','''    // LOCAL EXPERIMENT ONLY: airborne trim preparation.
    if (strstr(frame_str, "-airborne")) {
        have_launcher = true;
        launch_accel = -60;
        launch_time = 0;
    }
    if (strstr(frame_str, "-tow")) {''')
needle='    // Keep a guided aircraft supported until the launch command, rather'
s=s.replace(needle,initialization+needle)
s=s.replace('#include <AP_Math/AP_Math.h>','#include <AP_Math/AP_Math.h>\n#include <cstdlib>')
s=s.replace('''    const float throttle = constrain_float(filtered_servo_range(input, 2), 0.0f, 1.0f);''','''    // LOCAL ORACLE: simulated joint truth; no deployable controller/bindings.
    static const float ka = getenv("PG_ORACLE_KA") ? atof(getenv("PG_ORACLE_KA")) : 0;
    static const float kr = getenv("PG_ORACLE_KR") ? atof(getenv("PG_ORACLE_KR")) : 0;
    static const float kq = getenv("PG_ORACLE_KQ") ? atof(getenv("PG_ORACLE_KQ")) : 0;
    static float angle_lpf, rate_lpf, payload_rate_lpf, correction;
    static bool initialized;
    static uint64_t last_sample_us;
    if (!initialized) {
        angle_lpf = joint_pitch_rad;
        initialized = true;
        last_sample_us = time_now_us;
    }
    if (time_now_us - last_sample_us >= 20000) {
        const float dt = (time_now_us-last_sample_us)*1.0e-6f;
        last_sample_us = time_now_us;
        angle_lpf += dt/(2+dt)*(joint_pitch_rad-angle_lpf);
        const float a = dt/(1/(2*M_PI*10)+dt);
        rate_lpf += a*(joint_pitch_rate-rate_lpf);
        payload_rate_lpf += a*(gyro.y-payload_rate_lpf);
        correction = constrain_float(-ka*(joint_pitch_rad-angle_lpf)-kr*rate_lpf-kq*payload_rate_lpf, -.25f, .25f);
    }
    auto corrected_input = input;
    const float raw = (float(input.servos[2])-1000)*.001f;
    corrected_input.servos[2] = uint16_t(1000+1000*constrain_float(raw+correction,0,1));
    const float throttle = constrain_float(filtered_servo_range(corrected_input, 2), 0.0f, 1.0f);
    if (time_now_us == last_sample_us) {
        AP::logger().WriteStreaming("PGOR", "TimeUS,Raw,Correction,Act,AngleHP,QRel", "Qfffff",
                                   AP_HAL::micros64(),raw,correction,throttle,joint_pitch_rad-angle_lpf,rate_lpf);
    }''')
s=s.replace('    const ForceBreakdown F = compute_forces_bf(brake_left_rad, brake_right_rad, throttle);',
    '    const ForceBreakdown F = compute_forces_bf(brake_left_rad, brake_right_rad, throttle);\n'
    '    if (time_now_us == last_sample_us) {\n'
    '        AP::logger().WriteStreaming("PGAF", "TimeUS,Alpha,VCanopy,Rho", "Qfff",\n'
    '                                   AP_HAL::micros64(),degrees(F.alpha_pf_rad),F.V_pf,air_density);\n'
    '    }')
(root/'oracle-model.cpp').write_text(s)
try:
 source.write_text(s)
 with (root/'oracle-build.txt').open('w') as log:
  subprocess.run(['./waf','plane','-j','4'],cwd=repo,stdout=log,stderr=subprocess.STDOUT,check=True)
 shutil.copy2(repo/'build/sitl/bin/arduplane',root/'oracle-arduplane')
finally:
 source.write_text(original)
 shutil.copy2(root/'production-arduplane',repo/'build/sitl/bin/arduplane')
