# AP_FLAKE8_CLEAN
import csv
import json
import math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pymavlink import mavutil

root = Path(__file__).parent
summary = []
series = {}
joint_series = {}
for path in sorted(root.glob('*.csv')):
    name = path.stem
    configpath = root / (name + '-config.json')
    if not configpath.exists():
        continue
    config = json.loads(configpath.read_text())
    metadata = json.loads(Path(str(path) + '.json').read_text())
    rows = list(csv.DictReader(path.open()))
    if not rows:
        runpath = root / (name + '-run.json')
        run = json.loads(runpath.read_text()) if runpath.exists() else {}
        summary.append(dict(name=name, config=config, completed_course=False, error=run.get('error'), no_track_samples=True))
        continue
    data = {key: np.array([float(row[key]) for row in rows]) for key in rows[0]}
    series[name] = (data, metadata, config)
    runpath = root / (name + '-run.json')
    run = json.loads(runpath.read_text()) if runpath.exists() else {'error': None}
    seq = data['seq'].astype(int)
    home = data['time_s'][seq == 12]
    flight_end = home[0] if len(home) else data['time_s'][-1]
    course = data['time_s'] <= flight_end
    straight = course & ~np.isin(seq, (3, 8, 12))
    errors = [metric['altitude_at_closest_m'] - metadata['route'][int(i)-1][3]
              for i, metric in metadata['metrics'].items()
              if metric['altitude_at_closest_m'] is not None and metadata['route'][int(i)-1][0] == 16]
    overruns = [metric['next_track_overshoot_m'] for metric in metadata['metrics'].values()
                if metric['next_track_overshoot_m'] is not None]
    result = dict(name=name, config=config, error=run['error'], completed_course=bool(len(home)),
                  course_time_s=float(flight_end - data['time_s'][0]),
                  waypoint_altitude_max_error_m=float(max(map(abs, errors))),
                  waypoint_altitude_rmse_m=float(np.sqrt(np.mean(np.array(errors)**2))),
                  maximum_corner_overshoot_m=max(overruns) if overruns else None,
                  straight_cross_track_rms_m=float(np.sqrt(np.mean(data['nav_cross_track_error_m'][straight]**2))),
                  average_groundspeed_mps=float(np.mean(data['groundspeed_mps'][course])),
                  throttle_mean_pct=float(np.mean((data['throttle_pwm'][course]-1000)/10)),
                  throttle_std_pct=float(np.std((data['throttle_pwm'][course]-1000)/10)),
                  minimum_altitude_m=float(np.min(data['relative_alt_m'])),
                  maximum_altitude_m=float(np.max(data['relative_alt_m'])),
                  payload_pitch_min_deg=float(np.min(data['pitch_rad'][course])*180/math.pi),
                  payload_pitch_max_deg=float(np.max(data['pitch_rad'][course])*180/math.pi))
    logs = list((root / (name + '-logs')).glob('*.BIN'))
    if logs:
        log = max(logs, key=lambda p: p.stat().st_size)
        reader = mavutil.mavlink_connection(str(log))
        mode = None
        tecs, joints = [], []
        while True:
            message = reader.recv_match(type=['MODE', 'TECS', 'PGJT'])
            if message is None:
                break
            kind = message.get_type()
            if kind == 'MODE':
                mode = message.ModeNum
            elif mode == 10 and message.TimeUS*1e-6 <= flight_end:
                if kind == 'TECS':
                    tecs.append((message.TimeUS*1e-6, message.h, message.hdem, message.th))
                else:
                    joints.append((message.TimeUS*1e-6, message.Rel, message.QRel, message.QP, message.QC))
        if tecs:
            tecs = np.array(tecs)
            result['tecs_height_demand_rms_error_m'] = float(np.sqrt(np.mean((tecs[:, 1]-tecs[:, 2])**2)))
            result['tecs_height_demand_max_error_m'] = float(np.max(np.abs(tecs[:, 1]-tecs[:, 2])))
        if joints:
            joints = np.array(joints)
            joint_series[name] = joints
            result['payload_pitch_rate_rms_deg_s'] = float(np.sqrt(np.mean(joints[:, 3]**2)))
            result['canopy_pitch_rate_rms_deg_s'] = float(np.sqrt(np.mean(joints[:, 4]**2)))
            result['payload_pitch_rate_peak_deg_s'] = float(np.max(np.abs(joints[:, 3])))
            result['relative_pitch_range_deg'] = [float(np.min(joints[:, 1])), float(np.max(joints[:, 1]))]
    summary.append(result)
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
for result in summary:
    if result.get('no_track_samples'):
        print(result['name'], 'FAILED before valid track samples:', result['error'])
        continue
    print(result['name'], 'course', result['completed_course'], 'error', result['error'],
          'time', round(result['course_time_s'], 1), 'WP altitude max', round(result['waypoint_altitude_max_error_m'], 2),
          'corner max', round(result['maximum_corner_overshoot_m'] or 0, 2),
          'q RMS', round(result['payload_pitch_rate_rms_deg_s'], 2) if 'payload_pitch_rate_rms_deg_s' in result else 'not recorded')

colors = {'rigid-calm-g0.2': '#555555', 'joint-calm-g0': '#3366aa', 'joint-calm-g0.2': '#228844',
          'joint-wind-g0': '#cc4433', 'joint-wind-g0.2': '#aa55aa', 'rigid-wind-g0.2': '#aa8800',
          'joint-rampwind-g0': '#cc4433', 'joint-rampwind-g0.2': '#aa55aa', 'rigid-rampwind-g0.2': '#aa8800'}
fig, axes = plt.subplots(1, 2, figsize=(13, 6), sharex=True, sharey=True)
for name, (data, metadata, config) in series.items():
    ax = axes[1 if config['wind'] else 0]
    course = data['seq'] <= 11
    home_lat, home_lon = metadata['home_lat'], metadata['home_lng']
    north = np.radians(data['latitude_deg']-home_lat)*6371000
    east = np.radians(data['longitude_deg']-home_lon)*6371000*math.cos(math.radians(home_lat))
    ax.plot(east[course], north[course], lw=1, color=colors.get(name), label=name)
for ax, title in zip(axes, ('Calm', '3 m/s wind from 45°, turbulence setting 0.5')):
    ax.set_title(title);ax.set_xlabel('East (m)');ax.set_aspect('equal');ax.grid(alpha=0.25)
    if ax.lines:
        ax.legend(fontsize=7)
    if series:
        metadata = next(iter(series.values()))[1]
        route = np.array([[item[1], item[2]] for item in metadata['route']])
        ax.plot(route[:, 1], route[:, 0], 'k:', alpha=0.4)
        ax.scatter(route[:, 1], route[:, 0], color='black', s=15)
        for i, (north, east) in enumerate(route, 1):
            ax.annotate(str(i), (east, north), xytext=(3, 3), textcoords='offset points', fontsize=8)
axes[0].set_ylabel('North (m)')
fig.suptitle('Existing paraglider AUTO mission with canopy–payload pitch articulation')
fig.tight_layout();fig.savefig(root / 'mission-comparison.png', dpi=160);fig.savefig(root / 'mission-comparison.pdf')

fig, axes = plt.subplots(3, 2, figsize=(13, 9), sharex='col')
for name, (data, metadata, config) in series.items():
    col = 1 if config['wind'] else 0
    time = data['time_s'] - data['time_s'][0]
    for row, values in enumerate((data['relative_alt_m'], np.degrees(data['pitch_rad']), (data['throttle_pwm']-1000)/10)):
        axes[row, col].plot(time, values, lw=0.8, color=colors.get(name), label=name)
for ax, label in zip(axes[:, 0], ('Relative altitude (m)', 'Payload pitch (deg)', 'Throttle (%)')):
    ax.set_ylabel(label)
for ax in axes.flat:
    ax.grid(alpha=0.25)
axes[0, 0].set_title('Calm');axes[0, 1].set_title('Wind and turbulence')
for ax in axes[0]:
    if ax.lines:
        ax.legend(fontsize=7)
for ax in axes[-1]:
    ax.set_xlabel('Time after AUTO entry (s)')
fig.suptitle('Longitudinal response during the native AUTO mission')
fig.tight_layout();fig.savefig(root / 'longitudinal-comparison.png', dpi=160);fig.savefig(root / 'longitudinal-comparison.pdf')
