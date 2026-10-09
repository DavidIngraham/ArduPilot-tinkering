import csv
import math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

directory = Path(__file__).parent
rows = list(csv.DictReader((directory / 'dynamics.csv').open()))
time = [float(row['time_s']) - float(rows[0]['time_s']) for row in rows]
fig, axes = plt.subplots(4, 1, sharex=True, figsize=(11, 10), layout='constrained')
series = [
    [('throttle_pwm', 'Throttle', 1), ('left_brake_pwm', 'Left brake', 1), ('right_brake_pwm', 'Right brake', 1)],
    [('relative_alt_m', 'Relative altitude', 1)],
    [('climb_mps', 'Climb rate', 1), ('groundspeed_mps', 'Groundspeed', 1)],
    [('yaw_rate_radps', 'Yaw rate', 180 / math.pi), ('pitch_rad', 'Pitch angle', 180 / math.pi)],
]
labels = ['Output PWM', 'Altitude relative to home (m)', 'Speed (m/s)', 'deg/s, deg']
for ax, fields, label in zip(axes, series, labels):
    for key, title, scale in fields:
        ax.plot(time, [float(row[key]) * scale for row in rows], label=title)
    ax.set_ylabel(label)
    ax.grid(alpha=0.25)
    ax.legend(loc='upper right')
    for index in range(1, len(rows)):
        if rows[index]['phase'] != rows[index - 1]['phase']:
            ax.axvline(time[index], color='grey', linestyle=':', alpha=0.5)
axes[-1].set_xlabel('Simulation time since first sample (s)')
fig.suptitle('Corrected paraglider model: trim, throttle step and left-brake step\n'
             'Synthetic SITL baseline; not validated against flight measurements')
fig.savefig(directory / 'dynamics.png', dpi=160)
