"""Export the recorded raster matrix; never substitute synthetic flight results."""
import ast
import csv
import json
import hashlib
import math
from types import SimpleNamespace
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from matplotlib.colors import LinearSegmentedColormap

ROOT = Path(__file__).resolve().parent
CONDITIONS = [(0,0),(5,0),(5,45),(5,90),(10,0),(10,45),(10,90)]
SPACINGS = [40,80,160]
HEADERS = ['Calm','5 m/s from N','5 m/s from NE','5 m/s from E',
           '10 m/s from N','10 m/s from NE','10 m/s from E']
# Recompute every metric from recorded position samples with one common definition.
node = next(x for x in ast.parse((ROOT/'run_matrix.py').read_text()).body
            if isinstance(x,ast.FunctionDef) and x.name=='metrics')
namespace={'math':math}
exec(compile(ast.Module(body=[node],type_ignores=[]),'recorded-survey-metrics','exec'),namespace)
records = {}
for p in ROOT.glob('raster-*.json'):
    r = json.loads(p.read_text())
    with (ROOT/(r['name']+'.csv')).open() as source:
        samples=[tuple(map(float,x)) for x in list(csv.reader(source))[1:]]
    r['metrics']=namespace['metrics'](samples,SimpleNamespace(lat=r['home_lat'],lng=r['home_lng']),
                                      r['route'],r['configuration']['spacing_m'])
    r['analysis_version']=2
    p.write_text(json.dumps(r,indent=2))
    c = r['configuration']
    records[(c['spacing_m'],c['wind_mps'],c['wind_from_deg'],c['enabled'])] = r
expected = [(s,w,d,e) for s in SPACINGS for w,d in CONDITIONS for e in (0,1)]
missing = [k for k in expected if k not in records]
if missing:
    raise RuntimeError('Matrix is not complete: %d flights missing' % len(missing))
flat = []
for key in expected:
    r=records[key];c=r['configuration'];m=r['metrics']
    flat.append(dict(spacing_m=key[0],survey_lines=320//key[0]+1,wind_mps=key[1],wind_from_deg=key[2],
                     controller='line planner' if key[3] else 'L1',completed=r['completed'],failure=r['failure'],
                     course_duration_s=m['course_duration_s'],survey_duration_s=m['survey_duration_s'],
                     line_coverage_percent=m['coverage_percent'],survey_line_rms_m=m['survey_line_rms_m'],
                     minimum_row_coverage_percent=min(m['row_coverage_percent']),
                     planned_raster_corners=r['planned_raster_corners'],raster_turn_corners=r['raster_turn_corners']))
with (ROOT/'matrix.csv').open('w') as target:
    writer=csv.DictWriter(target,fieldnames=flat[0].keys());writer.writeheader();writer.writerows(flat)

def good(r):return r['completed'] and not r['failure']
def number(v,unit='',digits=1):return ('N/A' if v is None else f'{v:.{digits}f}{unit}')
deltas=np.zeros((3,7))
for i,s in enumerate(SPACINGS):
    for j,(w,d) in enumerate(CONDITIONS):
        a,b=records[(s,w,d,0)],records[(s,w,d,1)]
        deltas[i,j]=b['metrics']['coverage_percent']-a['metrics']['coverage_percent'] if good(a) and good(b) else np.nan
limit=max(5,float(np.nanmax(np.abs(deltas))))
fig,ax=plt.subplots(figsize=(23,7),layout='constrained')
coverage_cmap=LinearSegmentedColormap.from_list('coverage_difference',['#cc6666','#ffffff','#65ad76'])
im=ax.imshow(deltas,cmap=coverage_cmap,vmin=-limit,vmax=limit,aspect='auto')
ax.set_xticks(range(7),HEADERS,fontsize=11)
ax.set_yticks(range(3),[f'{s} m spacing\n{320//s+1} lines' for s in SPACINGS],fontsize=11)
for i,s in enumerate(SPACINGS):
    for j,(w,d) in enumerate(CONDITIONS):
        a,b=records[(s,w,d,0)],records[(s,w,d,1)];am,bm=a['metrics'],b['metrics']
        text=(f"L1: {number(am['course_duration_s'],' s')} / {number(am['coverage_percent'],'%')} / {number(am['survey_line_rms_m'],' m')}\n"
              f"Line: {number(bm['course_duration_s'],' s')} / {number(bm['coverage_percent'],'%')} / {number(bm['survey_line_rms_m'],' m')}\n"
              f"Planned corners: {b['planned_raster_corners']}/{b['raster_turn_corners']}")
        if not good(a) or not good(b):text+='\nFAILED flight: '+('L1 ' if not good(a) else '')+('Line' if not good(b) else '')
        ax.text(j,i,text,ha='center',va='center',fontsize=10,color='black')
ax.set_xticks(np.arange(-.5,7,1),minor=True);ax.set_yticks(np.arange(-.5,3,1),minor=True);ax.grid(which='minor',color='#d0d0d0',linewidth=1);ax.tick_params(which='minor',bottom=False,left=False)
fig.colorbar(im,ax=ax,shrink=.75,label='Line planner minus L1 line coverage (percentage points)')
fig.suptitle('Raster survey matrix: standard L1 versus line-to-line planner\nEach cell: AUTO course time / requested-line coverage / survey-leg RMS error',fontsize=16)
fig.supxlabel('Fixed survey area 600 × 320 m; 200 m turnaround extension; 20 m/s cruise; 45° bank limit; zero turbulence.\nCoverage: 10 m along-line bins flown within 10 m cross-track and 15° ground course; one flight per controller/condition. Calm evaluated once per spacing.',fontsize=10)
fig.savefig(ROOT/'raster-summary-matrix.png',dpi=165)
fig.savefig(ROOT/'raster-summary-matrix.pdf')
plt.close(fig)

fig,axes=plt.subplots(3,7,figsize=(23,15),layout='constrained')
limits=[-350,650,0,1350]
prepared={}
for key,r in records.items():
    with (ROOT/(r['name']+'.csv')).open() as source:data=list(csv.DictReader(source))
    north=np.array([math.radians(float(x['latitude_deg'])-r['home_lat'])*6371000 for x in data])
    east=np.array([math.radians(float(x['longitude_deg'])-r['home_lng'])*6371000*math.cos(math.radians(r['home_lat'])) for x in data])
    seq=np.array([int(x['seq']) for x in data]);mask=(seq>=3)&(seq<len(r['route'])+1)
    prepared[key]=(north[mask],east[mask])
    if np.any(mask):
        limits=[min(limits[0],float(east[mask].min())-30),max(limits[1],float(east[mask].max())+30),
                min(limits[2],float(north[mask].min())-30),max(limits[3],float(north[mask].max())+30)]
for i,s in enumerate(SPACINGS):
    for j,(w,d) in enumerate(CONDITIONS):
        ax=axes[i,j];ax.add_patch(Rectangle((0,300),320,600,facecolor='#eeeeee',edgecolor='.45',lw=.8,zorder=0))
        for lane in range(320//s+1):ax.plot([lane*s,lane*s],[300,900],ls='--',color='.55',lw=.6,zorder=1)
        for enabled,color,label in [(0,'#a7672c','L1'),(1,'#228747','Line planner')]:
            r=records[(s,w,d,enabled)];n,e=prepared[(s,w,d,enabled)];ax.plot(e,n,color=color,lw=1.15,label=label)
            for k in range(0,max(0,len(n)-6),max(1,len(n)//5)):
                ax.annotate('',xy=(e[k+6],n[k+6]),xytext=(e[k],n[k]),arrowprops=dict(arrowstyle='->',color=color,lw=.8))
        if w:
            angle=math.radians(d);base=(520,1250)
            ax.annotate('',xy=(base[0]-math.sin(angle)*w*8,base[1]-math.cos(angle)*w*8),xytext=base,arrowprops=dict(arrowstyle='->',color='#40557b',lw=1.5))
        a,b=records[(s,w,d,0)],records[(s,w,d,1)]
        footer=f"L1 {number(a['metrics']['course_duration_s'],'s',0)}, {number(a['metrics']['coverage_percent'],'%',0)}\nLine {number(b['metrics']['course_duration_s'],'s',0)}, {number(b['metrics']['coverage_percent'],'%',0)}; P {b['planned_raster_corners']}/{b['raster_turn_corners']}"
        if not good(a) or not good(b):footer+='\nFAILED flight — see CSV'
        ax.text(.03,.03,footer,transform=ax.transAxes,fontsize=8,bbox=dict(facecolor='white',alpha=.85,edgecolor='none'))
        ax.set_xlim(limits[:2]);ax.set_ylim(limits[2:]);ax.set_aspect('equal');ax.grid(alpha=.12);ax.tick_params(labelsize=7)
        if i==0:ax.set_title(HEADERS[j],fontsize=10)
        if j==0:ax.set_ylabel(f'{s} m spacing ({320//s+1} lines)\nNorth of home (m)',fontsize=10)
        if i==2:ax.set_xlabel('East of home (m)',fontsize=8)
        if i==0 and j==0:ax.legend(loc='upper left',fontsize=8)
fig.suptitle('Raster-phase tracks: L1 (brown) versus line-to-line planner (green)\nGray area is the survey region; dashed lines are requested survey legs; blue arrows show wind TO direction; P = planned raster corners',fontsize=14)
fig.supxlabel('Track panels exclude ingress; footer times include the entire AUTO course. Each condition has one recorded flight per controller.',fontsize=10)
fig.savefig(ROOT/'raster-track-matrix.png',dpi=165)
fig.savefig(ROOT/'raster-track-matrix.pdf')
plt.close(fig)
report=dict(flights=flat,case_count=21,flight_count=42,failed_flights=[r['name'] for r in records.values() if not good(r)],
            definitions=dict(coverage='Percentage of requested 10m along-line bins observed within 10m cross-track and 15deg of the required alternating ground course.',
                             rms='Cross-track RMS relative to the commanded survey line, for samples within the survey northing range and within 15deg of its ground course.',
                             time='First recorded AUTO handover position to first terminal-loiter mission sequence, excludes takeoff and terminal observation.'),
            replicates=1,configuration=next(iter(records.values()))['configuration'])
report['analysis_version']=2
report['source_sha256']={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ['run_matrix.py','plot_matrix.py']}
(ROOT/'flights.json').write_text(json.dumps([records[k] for k in expected],indent=2))
(ROOT/'matrix-report.json').write_text(json.dumps(report,indent=2))
print('Recorded flights:',len(flat),'failed:',len(report['failed_flights']))
