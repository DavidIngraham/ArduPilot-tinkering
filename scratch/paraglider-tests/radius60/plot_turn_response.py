import csv,math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent
rows=list(csv.DictReader((root/'ParagliderAutoMission.csv').open()))
index=next(i for i,r in enumerate(rows) if i and int(r['seq'])==5 and int(rows[i-1]['seq'])==4)
t0=float(rows[index]['time_s']);data=[r for r in rows if -8<=float(r['time_s'])-t0<=15]
t=[float(r['time_s'])-t0 for r in data]
fig,axes=plt.subplots(2,2,figsize=(12,6),sharex=True,constrained_layout=True)
axes[0,0].plot(t,[float(r['nav_roll_deg']) for r in data],label='Demanded bank')
axes[0,0].plot(t,[math.degrees(float(r['roll_rad'])) for r in data],label='Actual bank')
axes[0,0].set(ylabel='Bank (degrees)',title='Bank demand and response (right positive)')
axes[0,1].plot(t,[math.degrees(float(r['yaw_rate_radps'])) for r in data],color='#159447',label='Body yaw rate')
axes[0,1].set(ylabel='Yaw rate (degrees/s)',title='Yaw response (right positive)')
axes[1,0].plot(t,[float(r['left_brake_pwm']) for r in data],label='Left brake')
axes[1,0].plot(t,[float(r['right_brake_pwm']) for r in data],label='Right brake')
axes[1,0].set(ylabel='Servo PWM (µs)',title='Brake commands',ylim=(1050,1450))
course=[]
for r in data:
 i=rows.index(r);a,b=rows[i-2],rows[i+2]
 dn=float(b['latitude_deg'])-float(a['latitude_deg']);de=(float(b['longitude_deg'])-float(a['longitude_deg']))*math.cos(math.radians(float(a['latitude_deg'])))
 course.append(math.degrees(math.atan2(de,dn))%360)
axes[1,1].plot(t,[x-180 for x in course],color='#9a4e00',label='GPS ground course − 180°')
axes[1,1].set(ylabel='Course from south (degrees)',title='Ground-track response (right positive)')
for ax in axes.flat:
 ax.axvline(0,color='0.5',ls=':',lw=1);ax.axhline(0,color='0.6',lw=.8);ax.grid(alpha=.2);ax.legend(fontsize=9)
for ax in axes[1]:ax.set_xlabel('Seconds from waypoint transition')
fig.suptitle('WP4 → WP5 right turn: bank, yaw, brakes and ground course\n60 m acceptance radius; validated default gains')
fig.savefig(root/'turn-response.png',dpi=170)
