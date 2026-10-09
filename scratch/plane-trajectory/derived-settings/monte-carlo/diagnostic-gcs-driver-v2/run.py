#!/usr/bin/env python3
# AP_FLAKE8_CLEAN
"""Local paired gust experiments using the native Plane autotest lifecycle.

The seed controls the weather schedule, not ArduPilot's internal sensor/turbulence
PRNG. Paired flights see identical time-indexed targets; their realised turbulence
and initial flight state need not be bit-identical. No simulator wind enters the
navigation controller directly. This script is deliberately outside the repo.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import random
import runpy
import sys
import time

REPO = Path('/workspace/ardupilot-plane-trajectory')
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(REPO / 'Tools/autotest'))
import arduplane  # noqa: E402
from pymavlink import mavutil  # noqa: E402
from vehicle_test_suite import AutoTestTimeoutException, NotAchievedException  # noqa: E402

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--seeds-per-stratum', type=int, default=2)
parser.add_argument('--speedup', type=int, default=40)
parser.add_argument('--pilot', action='store_true', help='Run one severe pair before the full ensemble')
parser.add_argument('--resume', action='store_true')
ARGS = parser.parse_args()
BINARY_SHA = hashlib.sha256((REPO / 'build/sitl/bin/arduplane').read_bytes()).hexdigest()
SCHEMA = 2
DT = 1.0
MAX_TIME = 1800
STRATA = (
    ('mild', (2, 5), (0.5, 1.2), (3, 8), 0.2),
    ('moderate', (5, 8), (1.2, 2), (4, 10), 0.5),
    ('severe', (8, 11), (2, 3.5), (4, 12), 1.0),
    ('stress', (10, 12), (3, 4), (2, 5), 1.5),
)
TORTURE = [(300, 0), (700, 0), (700, 90), (1100, 90),
           (1100, 500), (1010, 500), (1010, 900),
           (600, 900), (600, 980), (950, 980),
           (950, 600), (400, 600), (450, 250),
           (-50, 250), (-50, -100), (-400, -100),
           (-400, -450), (0, -450), (0, -100)]


def scenario(course, stratum, replicate):
    index = next(i for i, value in enumerate(STRATA) if value[0] == stratum)
    seed = 20261008 + ('torture', 'raster40', 'raster160').index(course) * 10000 + index * 100 + replicate
    rng = random.Random(seed)
    _, means, sigmas, taus, turb = STRATA[index]
    mean = rng.uniform(*means)
    direction = rng.uniform(0, 360)
    sigma = rng.uniform(*sigmas)
    tau = rng.uniform(*taus)
    base = [mean * math.cos(math.radians(direction)), mean * math.sin(math.radians(direction))]
    alpha = math.exp(-DT / tau)
    innovation = sigma * math.sqrt(1 - alpha * alpha)
    gust = [rng.gauss(0, sigma), rng.gauss(0, sigma)]
    weather = []
    for tick in range(int(MAX_TIME / DT) + 2):
        gust = [alpha * x + rng.gauss(0, innovation) for x in gust]
        vector = [base[i] + gust[i] for i in range(2)]
        speed = math.hypot(*vector)
        # This stress envelope intentionally reaches the planner's wind guard.
        if speed > 18:
            vector = [x * 18 / speed for x in vector]
            speed = 18
        weather.append((tick * DT, speed, math.degrees(math.atan2(vector[1], vector[0])) % 360))
    return dict(name=f'{course}-{stratum}-{replicate:02d}', course=course, stratum=stratum,
                replicate=replicate, seed=seed, mean_speed_mps=mean, mean_from_deg=direction,
                gust_component_sigma_mps=sigma, gust_correlation_s=tau, turbulence_parameter=turb,
                wind_target_cap_mps=18, wind_tc_parameter_s=2, weather=weather)


def route_for(course):
    if course == 'torture':
        return TORTURE, {3: 35, 6: 35, 9: 35, 15: 35}
    spacing = int(course.removeprefix('raster'))
    route = [(100, -250)]
    for lane in range(320 // spacing + 1):
        route.extend([(100 if lane % 2 == 0 else 1100, lane * spacing),
                      (1100 if lane % 2 == 0 else 100, lane * spacing)])
    return route, {}


def raster_metrics(rows, home, route, spacing):
    # Use exactly the same coverage definition as the constant-wind regression.
    spec = importlib.util.spec_from_file_location('regression_raster', ROOT.parent / 'regression/raster/run_cases.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.metrics([row[:8] for row in rows], home, route, spacing)


def fly(self, case, enabled):
    controller = 'trajectory' if enabled else 'L1'
    name = case['name'] + '-' + controller
    result_path = ROOT / (name + '.json')
    signature = dict(schema=SCHEMA, binary_sha256=BINARY_SHA, scenario=case['name'], seed=case['seed'],
                     controller=controller, airspeed_mps=20, bank_limit_deg=45, nav_period_s=8,
                     nav_damping=0.9, turn_space_m=0 if case['course'] == 'torture' else 200,
                     acceptance_radius_m=50, max_course_time_s=MAX_TIME, weather_sha256=hashlib.sha256(
                         json.dumps(case['weather']).encode()).hexdigest())
    if ARGS.resume and result_path.exists():
        old = json.loads(result_path.read_text())
        if old['configuration'] == signature:
            self.progress('Reusing recorded Monte Carlo flight ' + name)
            return old
    self.start_subtest(name)
    self.context_push()
    rows, groups, fallbacks, ack, sent = [], [], [], [], []
    protected_crossings = {}
    completed = False
    failure = None
    home = self.home_position_as_location()
    route, passby = route_for(case['course'])
    terminal = len(route) + 1
    t0 = None
    last_seq = 1
    last_tick = -1
    last_position_s = None
    try:
        self.set_rc_default()
        self.set_parameters({'NAVTP_ENABLE': enabled, 'NAVTP_EXTENT': signature['turn_space_m'],
                             'NAVL1_PERIOD': 8, 'NAVL1_DAMPING': 0.9,
                             'AHRS_EKF_TYPE': 3, 'EK3_ENABLE': 1,
                             'WP_RADIUS': 50, 'WP_MAX_RADIUS': 0,
                             'ROLL_LIMIT_DEG': 45, 'AIRSPEED_CRUISE': 20,
                             'SIM_WIND_SPD': 0, 'SIM_WIND_TURB': 0, 'SIM_WIND_DIR_Z': 0,
                             'SIM_WIND_T': 1, 'SIM_WIND_TC': case['wind_tc_parameter_s']})
        self.takeoff(alt=100, mode='TAKEOFF')
        self.set_rc(3, 1500)
        home = self.home_position_as_location()
        items = self.create_simple_relloc_mission(
            home, [(mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, n, e, 100) for n, e in route] +
            [(mavutil.mavlink.MAV_CMD_NAV_LOITER_UNLIM, -150, 160, 100)])
        for item in items[1:-1]:
            item.param2 = 50
        for seq, distance in passby.items():
            items[seq].param2 = 0
            items[seq].param3 = distance
        items[-1].param3 = 100
        self.check_mission_upload_download(items)
        self.set_current_waypoint(1)
        self.set_parameters({'SIM_WIND_SPD': case['mean_speed_mps'], 'SIM_WIND_DIR': case['mean_from_deg'],
                             'SIM_WIND_TURB': case['turbulence_parameter']})
        self.delay_sim_time(15, reason='Allow initial EKF wind convergence before weather changes')
        for message in ('GLOBAL_POSITION_INT', 'ATTITUDE', 'MISSION_CURRENT', 'SYSTEM_TIME', 'WIND', 'VFR_HUD'):
            self.context_set_message_rate_hz(message, 10 if message not in ('WIND', 'VFR_HUD') else 2)
        t0 = self.get_sim_time()
        last_position_s = t0

        def observe(mav, message):
            nonlocal last_seq, last_tick, last_position_s
            kind = message.get_type()
            if kind == 'PARAM_VALUE' and message.param_id in ('SIM_WIND_SPD', 'SIM_WIND_DIR'):
                ack.append((last_position_s - t0, message.param_id, message.param_value))
            if kind == 'STATUSTEXT':
                if 'Trajectory WP' in message.text:
                    groups.append(message.text)
                elif 'Trajectory ' in message.text and 'fallback' in message.text:
                    fallbacks.append(message.text)
            if kind != 'GLOBAL_POSITION_INT':
                return
            last_position_s = message.time_boot_ms * 0.001
            elapsed = last_position_s - t0
            tick = min(int(max(0, elapsed) / DT), len(case['weather']) - 1)
            if tick > last_tick:
                target_time, speed, direction = case['weather'][tick]
                self.send_set_parameter_direct('SIM_WIND_SPD', speed)
                self.send_set_parameter_direct('SIM_WIND_DIR', direction)
                sent.append((elapsed, target_time, speed, direction))
                last_tick = tick
            attitude = mav.messages.get('ATTITUDE')
            mission = mav.messages.get('MISSION_CURRENT')
            if attitude is None or mission is None:
                return
            seq = mission.seq
            if seq < last_seq or seq > last_seq + 1:
                raise NotAchievedException(f'Non-monotone mission progression {last_seq} -> {seq}')
            if seq > last_seq and last_seq in passby and rows:
                an, ae = route[last_seq - 2]
                bn, be = route[last_seq - 1]
                dn, de = bn - an, be - ae
                n = math.radians(rows[-1][2] - home.lat) * 6371000
                e = math.radians(rows[-1][3] - home.lng) * 6371000 * math.cos(math.radians(home.lat))
                beyond = ((n - bn) * dn + (e - be) * de) / math.hypot(dn, de)
                protected_crossings[last_seq] = beyond
                if beyond < passby[last_seq] - 10:
                    raise NotAchievedException(f'Protected WP {last_seq} shortcut: {beyond:.1f}m beyond')
            last_seq = seq
            altitude = message.relative_alt * 0.001
            bank = math.degrees(attitude.roll)
            if not all(math.isfinite(x) for x in (altitude, bank, attitude.pitch, attitude.yaw)):
                raise NotAchievedException('Non-finite flight state')
            wind = mav.messages.get('WIND')
            wn = -wind.speed * math.cos(math.radians(wind.direction)) if wind else None
            we = -wind.speed * math.sin(math.radians(wind.direction)) if wind else None
            hud = mav.messages.get('VFR_HUD')
            rows.append((message.time_boot_ms * 0.001, seq, message.lat * 1e-7, message.lon * 1e-7,
                         altitude, bank, message.vx * 0.01, message.vy * 0.01, elapsed,
                         wn, we, hud.airspeed if hud else None))
            if not 60 <= altitude <= 150 or abs(bank) > 65:
                raise NotAchievedException(f'Flight envelope exceeded: alt={altitude:.1f} bank={bank:.1f}')

        self.install_message_hook_context(observe)
        self.change_mode('AUTO')
        wall_start = time.monotonic()
        while time.monotonic() - wall_start < 300:
            message = self.assert_receive_message('MISSION_CURRENT', timeout=10)
            if self.mav.flightmode != 'AUTO':
                raise NotAchievedException('Flight left AUTO')
            self.assert_armed()
            if message.seq == terminal:
                self.assert_receive_message('GLOBAL_POSITION_INT', timeout=10)
                completed = bool(rows) and rows[-1][1] == terminal
                if not completed:
                    raise NotAchievedException('Missing terminal position measurement')
                break
            if rows and rows[-1][8] > MAX_TIME:
                raise AutoTestTimeoutException(f'Course exceeded {MAX_TIME} simulated seconds')
        else:
            raise AutoTestTimeoutException('Course exceeded 300 wall seconds')
        if set(protected_crossings) != set(passby):
            raise NotAchievedException('Missing protected waypoint passage measurement')
        for group in groups:
            words = group.split()
            first, count = int(words[2]), int(words[4])
            if any(seq in range(first, first + count) for seq in passby):
                raise NotAchievedException('Planner rounded a protected waypoint')
    except Exception as exc:
        failure = type(exc).__name__ + ': ' + str(exc)
        self.progress('MONTE CARLO FLIGHT FAILED ' + name + ': ' + failure)
    finally:
        terminal_time = next((r[0] for r in rows if r[1] == terminal), None)
        measured = dict(course_duration_s=terminal_time - rows[0][0] if terminal_time and rows else None,
                        peak_bank_deg=max((abs(r[5]) for r in rows), default=None),
                        minimum_altitude_m=min((r[4] for r in rows), default=None),
                        maximum_altitude_m=max((r[4] for r in rows), default=None))
        if case['course'].startswith('raster'):
            measured.update(raster_metrics(rows, home, route, int(case['course'].removeprefix('raster'))))
        # Acknowledge every target update independently; no assumed parameter delivery.
        acknowledged = 0
        for elapsed, _, speed, direction in sent:
            if all(any(abs(at - elapsed) < 2 and param == name and
                       abs(value - target) < 0.001 for at, param, value in ack)
                   for name, target in (('SIM_WIND_SPD', speed), ('SIM_WIND_DIR', direction))):
                acknowledged += 1
        expected_updates = int(rows[-1][8] / DT) + 1 if rows else 0
        transport_ok = (bool(sent) and acknowledged / len(sent) >= 0.98 and
                        len(sent) / max(1, expected_updates) >= 0.98)
        result = dict(name=name, configuration=signature,
                      scenario={k: v for k, v in case.items() if k != 'weather'}, route=route,
                      home_lat=home.lat, home_lng=home.lng, completed=completed, failure=failure,
                      protected_crossings_m=protected_crossings,
                      metrics=measured, planned_groups=groups, fallbacks=fallbacks,
                      weather_transport_ok=transport_ok, weather_updates=len(sent),
                      weather_updates_expected=expected_updates,
                      weather_updates_acknowledged=acknowledged, recording_t0_boot_s=t0)
        with (ROOT / (name + '.csv')).open('w') as target:
            writer = csv.writer(target)
            writer.writerow(('time_s', 'seq', 'latitude_deg', 'longitude_deg', 'altitude_m', 'roll_deg',
                             'vn_mps', 've_mps', 'elapsed_s', 'estimated_wind_n_mps', 'estimated_wind_e_mps',
                             'indicated_airspeed_mps'))
            writer.writerows(rows)
        result_path.write_text(json.dumps(result, indent=2))
        (ROOT / (name + '-weather.json')).write_text(json.dumps(dict(sent=sent, acknowledged=ack), indent=2))
        self.progress('MONTE CARLO RESULT ' + json.dumps(result))
        # Stop the weather hook before restoring parameters and rebooting.
        try:
            self.context_pop()
        finally:
            self.reboot_sitl(force=True)
    return result


def GustMonteCarlo(self):
    """Paired controller flights in four strata of coloured gusts and turbulence."""
    if ARGS.pilot:
        cases = [scenario('torture', 'severe', 0)]
    else:
        cases = [scenario(course, stratum[0], replicate)
                 for course in ('torture', 'raster40', 'raster160')
                 for stratum in STRATA for replicate in range(ARGS.seeds_per_stratum)]
    (ROOT / ('pilot-scenarios.json' if ARGS.pilot else 'scenarios.json')).write_text(json.dumps(cases, indent=2))
    results = []
    for i, case in enumerate(cases):
        # Alternate order to avoid systematically favouring the first controller.
        for enabled in ((0, 1) if i % 2 == 0 else (1, 0)):
            results.append(fly(self, case, enabled))
            (ROOT / ('pilot-results.json' if ARGS.pilot else 'results.json')).write_text(json.dumps(results, indent=2))
    if any(not result['weather_transport_ok'] for result in results):
        raise NotAchievedException('Weather parameter delivery was not sufficiently verified')
    # Flight failures are results of this assessment, not reasons to omit samples.


original_tests = arduplane.AutoTestPlane.tests1a
arduplane.AutoTestPlane.GustMonteCarlo = GustMonteCarlo
arduplane.AutoTestPlane.tests1a = lambda self: original_tests(self) + [self.GustMonteCarlo]
os.chdir(REPO)
sys.argv = ['Tools/autotest/autotest.py', '--speedup', str(ARGS.speedup), 'test.Plane.GustMonteCarlo']
runpy.run_path(str(REPO / 'Tools/autotest/autotest.py'), run_name='__main__')
