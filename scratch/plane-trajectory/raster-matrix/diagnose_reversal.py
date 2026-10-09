import math, collections
V=20.; w=(0.,-10.); omega=9.80665*math.tan(math.radians(31.5))/V
h1=math.asin(10/V); h2=math.pi-h1
angle=h2-h1
# North -> east tangent geometry; reflected east -> south geometry.
a=V/omega*(math.sin(math.pi/2)-math.sin(h1))
b=V/omega*math.cos(h1)-10*(math.pi/2-h1)/omega
print('omega, radius, tangent incoming/outgoing',omega,V/omega,a,b)
print('grouping required connector',2*b+V*3)
c=collections.Counter(); minima=[]
def sample(start,t1,tm,t3,f,l):
 n,e=start; h=h1
 for dt,r in [(t1,f*omega),(tm,0),(t3,l*omega)]:
  he=h+r*dt
  if r: n+=V/r*(math.sin(he)-math.sin(h));e+=V/r*(math.cos(h)-math.cos(he))
  else:n+=V*math.cos(h)*dt;e+=V*math.sin(h)*dt
  e-=10*dt;h=he
 return n,e
for i in range(4):
 for j in range(4):
  start=(-a*(.75+i*.5)-30,0);end=(-a*(.75+j*.5)-30,40)
  for f in (-1,1):
   for l in (-1,1):
    for winding in range(-2,3):
     def residual(t1):
      t3=(angle+winding*2*math.pi-f*omega*t1)/(l*omega)
      if not 0<=t3<=2*math.pi/omega:return None
      n,e=sample(start,t1,0,t3,f,l);dn,de=end[0]-n,end[1]-e;h=h1+f*omega*t1;vn,ve=V*math.cos(h),V*math.sin(h)-10
      return vn*de-ve*dn,(dn*vn+de*ve)/(vn*vn+ve*ve),t3
     old=None
     for k in range(65):
      t=2*math.pi/omega*k/64;r=residual(t)
      if r is not None and old is not None and r[0]*old[1][0]<=0:
       lo,hi=old[0],t;fl=old[1][0]
       for _ in range(18):
        mid=(lo+hi)/2;rr=residual(mid)
        if rr is None:break
        if rr[0]*fl<=0:hi=mid
        else:lo=mid;fl=rr[0]
       t1=(lo+hi)/2;rr=residual(t1)
       if rr:
        _,tm,t3=rr;c['roots']+=1
        if tm<0:c['negative straight']+=1
        elif t1+tm+t3>=120:c['over 120s']+=1
        elif omega*(t1+t3)>math.radians(225):c['over 225deg turn budget']+=1;minima.append(math.degrees(omega*(t1+t3)))
        else:
         nn,ee=sample(start,t1,tm,t3,f,l);err=math.hypot(nn-end[0],ee-end[1]);print('preliminary candidate',i,j,f,l,'turn',math.degrees(omega*(t1+t3)),'endpoint error',err)
         if err>=.5:c['endpoint error']+=1
         else:
          duration=t1+tm+t3;previous=0;valid=True
          for gate in [(0,0),(0,40)]:
           best=(float('inf'),previous);step=max(.1,duration/400);tt=previous
           while tt<=duration:
            d1=min(tt,t1);d2=min(max(0,tt-t1),tm);d3=min(max(0,tt-t1-tm),t3);nn,ee=sample(start,d1,d2,d3,f,l);dist=math.hypot(nn-gate[0],ee-gate[1])
            if dist<best[0]:best=(dist,tt)
            tt+=step
           print('gate',gate,'nearest',best,'previous',previous)
           if best[1]<=previous+.1:valid=False;break
           previous=best[1]
          c['accepted' if valid else 'corner ordering rejected']+=1
      old=(t,r) if r is not None else None
print(dict(c));print('minimum rejected positive-straight turn angle',min(minima) if minima else None)
