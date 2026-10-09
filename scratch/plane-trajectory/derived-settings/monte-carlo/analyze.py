#!/usr/bin/env python3
# AP_FLAKE8_CLEAN
"""Analyze every flight, retaining failures and explicitly conditioning timing."""
import csv
import json
import math
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parent
RESULTS = json.loads((ROOT / 'results.json').read_text())
SCENARIOS = {case['name']: case for case in json.loads((ROOT / 'scenarios.json').read_text())}
COURSES = ('torture', 'raster40', 'raster160')
STRATA = ('mild', 'moderate', 'severe', 'stress')
COLORS = {'L1': '#a7672c', 'trajectory': '#228747'}
MARKERS = {'torture': 'o', 'raster40': 's', 'raster160': '^'}
RNG = np.random.default_rng(20261008)


def read(result):
    with (ROOT / (result['name'] + '.csv')).open() as source:
        rows = list(csv.DictReader(source))
    north = np.array([math.radians(float(r['latitude_deg']) - result['home_lat']) * 6371000 for r in rows])
    east = np.array([math.radians(float(r['longitude_deg']) - result['home_lng']) * 6371000 *
                     math.cos(math.radians(result['home_lat'])) for r in rows])
    seq = np.array([int(r['seq']) for r in rows])
    return rows, north, east, seq


def overrun(result, excluded):
    rows, north, east, seq = read(result)
    route = np.array(result['route'])
    values, indices = [], []
    for i in range(1, len(route) - 1):
        if i + 1 in excluded:
            continue
        incoming = route[i] - route[i - 1]
        outgoing = route[i + 1] - route[i]
        length = np.linalg.norm(outgoing)
        sign = 1 if incoming[0] * outgoing[1] - incoming[1] * outgoing[0] > 0 else -1
        dn, de = north - route[i, 0], east - route[i, 1]
        along = (dn * outgoing[0] + de * outgoing[1]) / length
        mask = ((seq == i + 1) | (seq == i + 2)) & (along >= -150) & (along <= min(150, length * 0.8))
        if mask.any():
            error = -sign * (outgoing[0] * de - outgoing[1] * dn) / length
            values.append(max(0, float(error[mask].max())))
            indices.append(i + 1)
    return dict(mean_m=float(np.mean(values)) if values else None, corner_indices=indices)


def success(result):
    return result['completed'] and result['failure'] is None and result['weather_transport_ok']


def bootstrap_mean(values):
    values = np.array(values)
    if not len(values):
        return None
    draws = values[RNG.integers(0, len(values), (5000, len(values)))].mean(axis=1)
    return [float(v) for v in np.quantile(draws, (0.025, 0.975))]


by_case = {}
for result in RESULTS:
    rows = read(result)[0]
    terminal = next((float(row['time_s']) for row in rows if int(row['seq']) == len(result['route']) + 1), None)
    result['analysis_time_s'] = terminal - result['weather_t0_boot_s'] if terminal is not None else None
    by_case.setdefault(result['configuration']['scenario'], {})[result['configuration']['controller']] = result
expected_names = set(SCENARIOS)
if set(by_case) != expected_names or any(set(pair) != {'L1', 'trajectory'} for pair in by_case.values()):
    raise RuntimeError('Missing paired scenarios')
if len({r['configuration']['binary_sha256'] for r in RESULTS}) != 1:
    raise RuntimeError('Mixed binaries')
if any(not r['weather_transport_ok'] for r in RESULTS):
    raise RuntimeError('Unverified weather delivery: do not produce pooled flight claims')
pairs = []
for name, pair in by_case.items():
    old, new = pair['L1'], pair['trajectory']
    if old['configuration']['weather_sha256'] != new['configuration']['weather_sha256']:
        raise RuntimeError('Paired weather schedules differ')
    excluded = set()
    for flight in pair.values():
        for group in flight['planned_groups']:
            words = group.split()
            first, count = int(words[2]), int(words[4])
            excluded.update(range(first, first + count - 1))
    both = success(old) and success(new)
    old_time, new_time = old['analysis_time_s'], new['analysis_time_s']
    old_overrun = overrun(old, excluded) if old['scenario']['course'] == 'torture' else None
    new_overrun = overrun(new, excluded) if new['scenario']['course'] == 'torture' else None
    pairs.append(dict(scenario=name, course=old['scenario']['course'], stratum=old['scenario']['stratum'],
                      seed=old['scenario']['seed'], L1_success=success(old), trajectory_success=success(new),
                      L1_time_s=old_time, trajectory_time_s=new_time,
                      paired_time_change_percent=100 * (new_time / old_time - 1) if both else None,
                      L1_coverage_percent=old['metrics'].get('coverage_percent'),
                      trajectory_coverage_percent=new['metrics'].get('coverage_percent'),
                      trajectory_fallback_events=len(new['fallbacks']),
                      L1_mean_overrun_m=old_overrun['mean_m'] if old_overrun else None,
                      trajectory_mean_overrun_m=new_overrun['mean_m'] if new_overrun else None,
                      excluded_internal_legs=sorted(excluded)))

summaries = []
for course in COURSES:
    selected = [p for p in pairs if p['course'] == course]
    for controller in ('L1', 'trajectory'):
        flights = [by_case[p['scenario']][controller] for p in selected]
        times = [r['analysis_time_s'] for r in flights if success(r)]
        coverage = [r['metrics']['coverage_percent'] for r in flights if 'coverage_percent' in r['metrics']]
        summaries.append(dict(course=course, controller=controller, flights=len(flights),
                              completed_successfully=sum(success(r) for r in flights),
                              median_time_s=float(np.median(times)) if times else None,
                              median_coverage_percent=float(np.median(coverage)) if coverage else None,
                              minimum_coverage_percent=min(coverage) if coverage else None,
                              flights_with_fallback=sum(bool(r['fallbacks']) for r in flights),
                              fallback_events=sum(len(r['fallbacks']) for r in flights)))
paired_time = [p['paired_time_change_percent'] for p in pairs if p['paired_time_change_percent'] is not None]
summary = dict(binary_sha256=RESULTS[0]['configuration']['binary_sha256'], paired_scenarios=len(pairs),
               total_flights=len(RESULTS), course_summaries=summaries,
               paired_mean_time_change_percent=float(np.mean(paired_time)) if paired_time else None,
               paired_mean_time_change_95_bootstrap_ci_percent=bootstrap_mean(paired_time),
               failures=[dict(name=r['name'], failure=r['failure'], completed=r['completed'])
                         for r in RESULTS if not success(r)],
               pairs=pairs,
               timing_condition=('From actual AUTO entry (first physics replay frame) to first recorded terminal position; '
                                 'only pairs with both flights successful; failures remain in counts.'),
               coverage_condition='All recorded raster flights, including failures.',
               wind_source='Active EKF3; seeded weather target is applied only to SITL.',
               replay_build=json.loads((ROOT / 'replay-build.json').read_text()),
               maximum_weather_update_lateness_s=max(r['maximum_weather_update_lateness_s'] for r in RESULTS),
               independence='24 independently seeded weather draws; paired controllers share a target schedule.',
               limitation='Small stratified engineering experiment, not an operational reliability estimate; '
                          'weather is time indexed, spatially uniform OU gusts plus native SITL turbulence. '
                          'Native sensor/turbulence realisations are not guaranteed bit-identical between pairs.')
(ROOT / 'summary.json').write_text(json.dumps(summary, indent=2))
with (ROOT / 'paired-comparison.csv').open('w') as target:
    writer = csv.DictWriter(target, fieldnames=list(pairs[0]))
    writer.writeheader()
    writer.writerows(pairs)
for row in summaries:
    print(json.dumps(row))
print('Paired mean time change and 95% bootstrap interval:', summary['paired_mean_time_change_percent'],
      summary['paired_mean_time_change_95_bootstrap_ci_percent'])
print('Failures:', summary['failures'])

fig, axes = plt.subplots(2, 2, figsize=(12, 9), layout='constrained')
ax = axes[0, 0]
for course in COURSES:
    selected = [p for p in pairs if p['course'] == course and p['paired_time_change_percent'] is not None]
    ax.scatter([p['L1_time_s'] for p in selected], [p['trajectory_time_s'] for p in selected],
               marker=MARKERS[course], s=55, label=course)
limits = ax.get_xlim(), ax.get_ylim()
lo, hi = min(limits[0][0], limits[1][0]), max(limits[0][1], limits[1][1])
ax.plot([lo, hi], [lo, hi], '--', color='.5')
ax.set_xlabel('L1 course time (s)')
ax.set_ylabel('Trajectory course time (s)')
ax.set_title('Paired flight times; below diagonal is faster')
ax.legend()
ax = axes[0, 1]
for i, stratum in enumerate(STRATA):
    values = [p['paired_time_change_percent'] for p in pairs if p['stratum'] == stratum and
              p['paired_time_change_percent'] is not None]
    ax.scatter(i + RNG.uniform(-0.12, 0.12, len(values)), values, color=COLORS['trajectory'])
    interval = bootstrap_mean(values)
    if interval:
        mean = float(np.mean(values))
        ax.errorbar(i, mean, yerr=[[mean - interval[0]], [interval[1] - mean]], fmt='D', color='black', capsize=5)
ax.axhline(0, color='.5', ls='--')
ax.set_xticks(range(4), STRATA)
ax.set_ylabel('Time change relative to L1 (%)')
ax.set_title('Paired changes; mean and 95% bootstrap interval')
ax = axes[1, 0]
for i, course in enumerate(('raster40', 'raster160')):
    selected = [p for p in pairs if p['course'] == course]
    for j, pair in enumerate(selected):
        x = i + (j - 3.5) * 0.035
        ax.plot([x - 0.11, x + 0.11], [pair['L1_coverage_percent'], pair['trajectory_coverage_percent']],
                color='.7', lw=0.7)
        for offset, controller in ((-0.11, 'L1'), (0.11, 'trajectory')):
            ax.scatter(x + offset, pair[controller + '_coverage_percent'], color=COLORS[controller], s=30,
                       label=controller if i == 0 and j == 0 else None)
ax.set_xticks(range(2), ['40 m raster', '160 m raster'])
ax.set_ylim(0, 103)
ax.set_ylabel('Survey coverage (%)')
ax.set_title('Coverage within 10 m and 15°; all flights retained')
ax.legend()
ax = axes[1, 1]
for i, stratum in enumerate(STRATA):
    selected = [p for p in pairs if p['stratum'] == stratum]
    ax.bar(i - 0.17, sum(p['trajectory_fallback_events'] > 0 for p in selected), width=0.34,
           color=COLORS['trajectory'], label='Trajectory flights with L1 fallback' if i == 0 else None)
    ax.bar(i + 0.17, sum(not p['trajectory_success'] for p in selected), width=0.34,
           color='#b01c43', label='Trajectory flight failures' if i == 0 else None)
ax.set_xticks(range(4), STRATA)
ax.set_ylim(0, 6.5)
ax.set_ylabel('Flights out of six per severity')
ax.set_title('Completion and planner continuity are separate outcomes')
ax.legend(fontsize=8)
for ax in axes.flat:
    ax.grid(alpha=0.15)
fig.suptitle('Gust Monte Carlo: 24 paired scenarios / 48 flights\n'
             '20 m/s cruise, 45° bank limit; EKF3 wind; identical seeded weather targets per pair')
fig.savefig(ROOT / 'performance.png', dpi=170)
fig.savefig(ROOT / 'performance.pdf')
plt.close(fig)

# Select the least favourable severe/stress pair per course: failures first,
# then coverage deficit, then timing. Selection is disclosed in the caption.
chosen = []
for course in COURSES:
    selected = [p for p in pairs if p['course'] == course and p['stratum'] in ('severe', 'stress')]

    def score(pair):
        deficit = ((pair['L1_coverage_percent'] - pair['trajectory_coverage_percent'])
                   if pair['L1_coverage_percent'] is not None else 0)
        return not pair['trajectory_success'], deficit, pair['paired_time_change_percent'] or 0

    worst = max(selected, key=score)
    chosen.append(worst)
fig, axes = plt.subplots(2, 3, figsize=(15, 10), layout='constrained')
for col, pair in enumerate(chosen):
    case = SCENARIOS[pair['scenario']]
    for controller in ('L1', 'trajectory'):
        result = by_case[pair['scenario']][controller]
        rows, north, east, seq = read(result)
        mask = (seq >= (3 if pair['course'].startswith('raster') else 1)) & (seq <= len(result['route']))
        axes[0, col].plot(east[mask], north[mask], lw=1.3, color=COLORS[controller], label=controller)
        elapsed = np.array([float(r['elapsed_s']) for r in rows])
        magnitude = np.array([math.hypot(float(r['estimated_wind_n_mps']), float(r['estimated_wind_e_mps']))
                              if r['estimated_wind_n_mps'] else np.nan for r in rows])
        axes[1, col].plot(elapsed, magnitude, color=COLORS[controller], lw=1,
                          label=controller + ' EKF estimate')
    route = np.array(result['route'])
    if pair['course'].startswith('raster'):
        axes[0, col].add_patch(Rectangle((0, 300), 320, 600, facecolor='#eeeeee', edgecolor='.5', zorder=0))
        spacing = int(pair['course'].removeprefix('raster'))
        for lane in range(320 // spacing + 1):
            axes[0, col].plot([lane * spacing] * 2, [300, 900], '--', color='.5', lw=0.7)
    else:
        axes[0, col].plot(route[:, 1], route[:, 0], '--', color='.5', lw=0.7)
    timing = '; '.join(controller + ' ' +
                       (f"{pair[controller + '_time_s']:.0f}s" if pair[controller + '_success'] else 'failed')
                       for controller in ('L1', 'trajectory'))
    axes[0, col].set_title(f"{pair['course']} / {pair['stratum']} / seed {pair['seed']}\n" + timing)
    weather = np.array(case['weather'])
    axes[1, col].plot(weather[:, 0], weather[:, 1], color='.5', lw=0.7, alpha=0.8, label='SITL wind target')
    last_time = max(float(row['elapsed_s']) for controller in ('L1', 'trajectory')
                    for row in read(by_case[pair['scenario']][controller])[0])
    axes[1, col].set_xlim(0, last_time + 1)
    axes[1, col].set_title(f"Mean {case['mean_speed_mps']:.1f}m/s from {case['mean_from_deg']:.0f}°; "
                           f"gust σ {case['gust_component_sigma_mps']:.1f}m/s; turbulence {case['turbulence_parameter']}")
    axes[0, col].set_aspect('equal')
    axes[0, col].set_xlabel('East of home (m)')
    axes[1, col].set_xlabel('Time since weather schedule started (s)')
    for row in range(2):
        axes[row, col].grid(alpha=0.15)
axes[0, 0].set_ylabel('North of home (m)')
axes[1, 0].set_ylabel('Horizontal wind speed (m/s)')
axes[0, 0].legend()
axes[1, 0].legend(fontsize=8)
fig.suptitle('Gust examples: least favourable severe/stress pair per course (coverage first, then timing)\n'
             'Grey wind curve is a simulator target, not realised truth; navigation receives EKF estimates')
fig.savefig(ROOT / 'gust-examples.png', dpi=170)
fig.savefig(ROOT / 'gust-examples.pdf')
plt.close(fig)
