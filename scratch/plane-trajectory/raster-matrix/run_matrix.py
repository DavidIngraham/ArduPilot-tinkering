"""Local experiment runner using the native Plane autotest flight lifecycle."""
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import runpy
import sys
import time

REPO = Path('/workspace/ardupilot-plane-trajectory')
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(REPO / 'Tools/autotest'))
import arduplane
from pymavlink import mavutil
from vehicle_test_suite import AutoTestTimeoutException, NotAchievedException

BINARY_SHA = hashlib.sha256((REPO / 'build/sitl/bin/arduplane').read_bytes()).hexdigest()
SPACINGS = (40, 80, 160)
SPEEDS = (0, 5, 10)
DIRECTIONS = (0, 45, 90)  # Wind FROM north, northeast, east; survey legs run north/south.


def metrics(rows, home, route, spacing):
    lines = 320 // spacing + 1
    bins = [set() for _ in range(lines)]
    square_errors = []
    survey_times = [[] for _ in range(lines)]
    for row in rows:
        t, seq, lat, lon, alt, bank, vn, ve = row
        seq = int(seq)
        north = math.radians(lat - home.lat) * 6371000
        east = math.radians(lon - home.lng) * 6371000 * math.cos(math.radians(home.lat))
        speed = math.hypot(vn, ve)
        if not 3 <= seq <= len(route) or not 300 <= north <= 900 or speed < 1:
            continue
        nearest = int(round(east / spacing))
        if 0 <= nearest < lines:
            sign = 1 if nearest % 2 == 0 else -1
            if abs(east - nearest * spacing) <= 10 and sign * vn / speed >= math.cos(math.radians(15)):
                bins[nearest].add(min(59, int((north - 300) / 10)))
        # Error is relative to the commanded survey line, never the nearest line.
        if seq >= 3 and (seq - 3) % 2 == 0:
            lane = (seq - 3) // 2
            if 0 <= lane < lines:
                sign = 1 if lane % 2 == 0 else -1
                if sign * vn / speed >= math.cos(math.radians(15)):
                    square_errors.append((east - lane * spacing) ** 2)
                    survey_times[lane].append(t)
    terminal = len(route) + 1
    end = next((r[0] for r in rows if r[1] == terminal), None)
    duration = end - rows[0][0] if end is not None and rows else None
    return dict(course_duration_s=duration,
                survey_duration_s=(survey_times[-1][-1] - survey_times[0][0]
                                   if survey_times[0] and survey_times[-1] else None),
                survey_line_rms_m=(math.sqrt(sum(square_errors) / len(square_errors)) if square_errors else None),
                survey_samples=len(square_errors),
                coverage_percent=100 * sum(len(x) for x in bins) / (60 * lines),
                row_coverage_percent=[100 * len(x) / 60 for x in bins],
                peak_bank_deg=max((abs(r[5]) for r in rows), default=None))


def fly_case(self, spacing, wind, direction, enabled):
    name = 'raster-%03d-w%02d-d%03d-%s' % (spacing, wind, direction, 'line' if enabled else 'L1')
    out = ROOT / (name + '.json')
    signature = dict(binary_sha256=BINARY_SHA, spacing_m=spacing, wind_mps=wind,
                     wind_from_deg=direction, enabled=enabled, airspeed_mps=20, bank_limit_deg=45,
                     survey_length_m=600, survey_width_m=320, turnaround_extension_m=200,
                     acceptance_radius_m=50, turbulence=0, schema=1)
    if out.exists() and json.loads(out.read_text()).get('configuration') == signature:
        self.progress('Reusing recorded matrix case ' + name)
        return json.loads(out.read_text())
    lines = 320 // spacing + 1
    route = [(100, -250)]
    for lane in range(lines):
        route.extend([(100 if lane % 2 == 0 else 1100, lane * spacing),
                      (1100 if lane % 2 == 0 else 100, lane * spacing)])
    rows, groups, fallbacks = [], [], []
    completed = False
    failure = None
    home = self.home_position_as_location()
    self.start_subtest(name)
    self.context_push()
    try:
        self.set_rc_default()
        self.set_parameters({'NAVTP_ENABLE': enabled, 'NAVTP_PERIOD': 8,
                             'NAVL1_PERIOD': 8, 'NAVL1_DAMPING': 0.9,
                             'WP_RADIUS': 50, 'WP_MAX_RADIUS': 0,
                             'ROLL_LIMIT_DEG': 45, 'AIRSPEED_CRUISE': 20,
                             'SIM_WIND_SPD': 0, 'SIM_WIND_TURB': 0})
        self.takeoff(alt=100, mode='TAKEOFF')
        self.set_rc(3, 1500)
        home = self.home_position_as_location()
        items = self.create_simple_relloc_mission(
            home, [(mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, n, e, 100) for n, e in route] +
            [(mavutil.mavlink.MAV_CMD_NAV_LOITER_UNLIM, -150, 160, 100)])
        for item in items[1:-1]:
            item.param2 = 50
        items[-1].param3 = 100
        self.check_mission_upload_download(items)
        self.set_current_waypoint(1)
        self.set_parameters({'SIM_WIND_SPD': wind, 'SIM_WIND_DIR': direction})
        for message in ('GLOBAL_POSITION_INT', 'ATTITUDE', 'MISSION_CURRENT'):
            self.context_set_message_rate_hz(message, 10)
        last_seq = [1]
        terminal = len(route) + 1

        def observe(mav, message):
            kind = message.get_type()
            if kind == 'STATUSTEXT':
                if 'Trajectory WP' in message.text:
                    groups.append(message.text)
                elif 'Trajectory L1 fallback' in message.text:
                    fallbacks.append(message.text)
            if kind != 'GLOBAL_POSITION_INT':
                return
            attitude = mav.messages.get('ATTITUDE')
            mission = mav.messages.get('MISSION_CURRENT')
            if attitude is None or mission is None:
                return
            seq = mission.seq
            if seq < last_seq[0] or seq > terminal:
                raise NotAchievedException('Non-monotone raster mission progression')
            last_seq[0] = seq
            altitude = message.relative_alt * 0.001
            bank = math.degrees(attitude.roll)
            if not all(math.isfinite(x) for x in (altitude, bank, attitude.pitch, attitude.yaw)):
                raise NotAchievedException('Non-finite raster flight state')
            if not 60 <= altitude <= 150 or abs(bank) > 65:
                raise NotAchievedException('Raster flight envelope exceeded: alt=%.1f bank=%.1f' % (altitude, bank))
            rows.append((message.time_boot_ms * 0.001, seq, message.lat * 1e-7,
                         message.lon * 1e-7, altitude, bank, message.vx * 0.01, message.vy * 0.01))

        self.install_message_hook_context(observe)
        self.change_mode('AUTO')
        wall_start = time.monotonic()
        while time.monotonic() - wall_start < 300:
            message = self.assert_receive_message('MISSION_CURRENT', timeout=10)
            if self.mav.flightmode != 'AUTO':
                raise NotAchievedException('Raster flight left AUTO')
            self.assert_armed()
            if message.seq == terminal:
                completed = True
                break
            if rows and rows[-1][0] - rows[0][0] > 1500:
                raise AutoTestTimeoutException('Raster course exceeded 1500 simulated seconds')
        else:
            raise AutoTestTimeoutException('Raster course exceeded 300 wall seconds')
        self.delay_sim_time(2, reason='Record terminal handover')
    except Exception as exc:
        failure = type(exc).__name__ + ': ' + str(exc)
        self.progress('MATRIX CASE FAILED ' + name + ': ' + failure)
    finally:
        measured = metrics(rows, home, route, spacing)
        covered = set()
        for group in groups:
            words = group.split()
            first, count = int(words[2]), int(words[4])
            covered.update(range(first, first + count))
        turns = set(range(3, 2 * lines + 1))
        result = dict(name=name, configuration=signature, route=route,
                      home_lat=home.lat, home_lng=home.lng, completed=completed,
                      failure=failure, metrics=measured, planned_groups=groups, fallbacks=fallbacks,
                      raster_turn_corners=len(turns), planned_raster_corners=len(turns.intersection(covered)))
        with (ROOT / (name + '.csv')).open('w') as target:
            writer = csv.writer(target)
            writer.writerow(('time_s','seq','latitude_deg','longitude_deg','altitude_m','roll_deg','vn_mps','ve_mps'))
            writer.writerows(rows)
        out.write_text(json.dumps(result, indent=2))
        self.progress('MATRIX RESULT ' + json.dumps({k: result[k] for k in ('name','completed','failure','metrics','planned_raster_corners')}))
        try:
            self.context_pop()
        finally:
            self.reboot_sitl(force=True)
    return result


def RasterSurveyMatrix(self):
    """Compare fixed-area raster coverage across spacing, wind speed and direction."""
    results = []
    for spacing in SPACINGS:
        for wind in SPEEDS:
            for direction in ((0,) if wind == 0 else DIRECTIONS):
                for enabled in (0, 1):
                    results.append(fly_case(self, spacing, wind, direction, enabled))
    (ROOT / 'flights.json').write_text(json.dumps(results, indent=2))
    failures = [r['name'] for r in results if r['failure'] or not r['completed']]
    if failures:
        raise NotAchievedException('Raster matrix failed cases: ' + ', '.join(failures))


original_tests = arduplane.AutoTestPlane.tests1a
arduplane.AutoTestPlane.RasterSurveyMatrix = RasterSurveyMatrix
arduplane.AutoTestPlane.tests1a = lambda self: original_tests(self) + [self.RasterSurveyMatrix]
os.chdir(REPO)
sys.argv = ['Tools/autotest/autotest.py', '--speedup', '20', 'test.Plane.RasterSurveyMatrix']
runpy.run_path(str(REPO / 'Tools/autotest/autotest.py'), run_name='__main__')
