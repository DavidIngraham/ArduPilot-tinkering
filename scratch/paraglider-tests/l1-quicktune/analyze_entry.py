from pymavlink import mavutil
import json,math
rows=json.load(open('/workspace/scratch/paraglider-tests/l1-quicktune/candidates.json'))
ends=[r for r in rows if r['mavpackettype']=='PGTN']
m=mavutil.mavlink_connection('/workspace/ardupilot/logs/00000003.BIN')
coords={};groups={};i=0
while True:
 r=m.recv_match(type=['CMD','NTUN'])
 if r is None or i==len(ends): break
 t=r.TimeUS
 while i<len(ends) and t>ends[i]['TimeUS']:i+=1
 if i==len(ends):break
 if r.get_type()=='CMD' and r.CTot==10:coords[(round(r.Lat,6),round(r.Lng,6))]=r.CNum
 if r.get_type()=='NTUN' and t>ends[0]['TimeUS']-720e6:
  seq=coords.get((round(r.TLat,6),round(r.TLng,6)))
  if seq and 2<=seq<=8: groups.setdefault((i,seq),[]).append(r.XT)
for i,e in enumerate(ends):
 print(e['Cand'],e['Score'],{seq:round(math.sqrt(sum(x*x for x in values)/len(values)),2) for (j,seq),values in groups.items() if i==j})
