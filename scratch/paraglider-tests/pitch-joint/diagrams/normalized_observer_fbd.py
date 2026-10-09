from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch
r=Path(__file__).parent
fig=plt.figure(figsize=(17,10),facecolor='white')
gs=fig.add_gridspec(1,2,width_ratios=[.95,1.65],left=.035,right=.98,top=.88,bottom=.10,wspace=.12)
a=fig.add_subplot(gs[0]);e=fig.add_subplot(gs[1]);e.axis('off');a.set_aspect('equal');a.axis('off');a.set_xlim(-2.3,1.9);a.set_ylim(-.7,3.55)
blue='#2266a8';orange='#bd571a';green='#237c53';gray='#626a74'
H=np.array([0,1.35]);P=np.array([0,.05]);C=np.array([-.85,2.7]);S=np.array([0,.45])
def arrow(p,q,text='',color=blue,at=None):
 a.add_patch(FancyArrowPatch(p,q,arrowstyle='-|>',mutation_scale=16,lw=2,color=color,zorder=5))
 if text:a.text(*(at if at is not None else (np.array(p)+np.array(q))/2),text,color=color,fontsize=14,ha='center',va='center',bbox=dict(facecolor='white',edgecolor='none',alpha=.9,pad=1))
def moment(center,radius,start,end,label,color,at):
 t=np.linspace(np.deg2rad(start),np.deg2rad(end),40);points=np.column_stack([center[0]+radius*np.cos(t),center[1]+radius*np.sin(t)])
 a.plot(points[:,0],points[:,1],color=color,lw=2);arrow(points[-3],points[-1],color=color);a.text(*at,label,color=color,fontsize=13)
a.plot([C[0],H[0],P[0]],[C[1],H[1],P[1]],color=gray,lw=2)
a.add_patch(Ellipse(C,width=1.55,height=.24,angle=0,color='#cde3f3',ec=blue,lw=2))
a.add_patch(Ellipse(P,width=.45,height=.48,color='#e9edf0',ec=gray,lw=2))
for point,label,offset in [(H,'Hinge H',(.16,.0)),(P,'Payload CG P',(.35,-.46)),(C,'Canopy CG C',(-.18,.24))]:
 a.plot(*point,'o',color='#222',ms=5,zorder=6);a.text(*(point+offset),label,fontsize=12)
# Geometry vectors, offset slightly so the structural lines remain visible.
arrow(H+[-.15,0],P+[-.15,0],r'$a$',gray,[-.34,.7])
arrow(H+[-.13,.03],C+[-.13,.03],r'$b(\delta)$',gray,[-.8,1.92])
# Forces act at their application points; R and -R share the physical hinge.
arrow(H,H+[-.52,.72],r'$R$',blue,[.03,1.96])
arrow(H,H+[.52,-.72],r'$-R$',orange,[.68,.96])
arrow(C+[-.38,0],C+[-.58,.58],r'$F_{a,c}$',blue,[-1.69,3.13])
a.text(-2.13,2.77,'Lift + drag',fontsize=10,color=blue)
arrow(C,C+[0,-.68],r'$m_c g$',gray,[-1.17,2.32])
arrow(P,P+[0,-.6],r'$m_p g$',gray,[.33,-.45])
arrow(S,S+[1.08,0],r'$T$',blue,[.94,.63])
arrow(P+[-.22,0],P+[-1.02,0],r'$D_p$',blue,[-.78,.23])
a.plot(*S,'s',color=blue,ms=4)
a.plot([1.28,1.28],[P[1],S[1]],color=gray,lw=1.3);a.plot([1.2,1.36],[P[1],P[1]],color=gray);a.plot([1.2,1.36],[S[1],S[1]],color=gray)
a.text(1.42,.20,r'$z_T<0$',fontsize=12,color=gray)
moment(P,.52,-85,5,r'$+J$',green,(.65,-.12))
moment(C,.56,10,-55,r'$-J$',green,(-.25,2.40))
moment(C,.85,90,165,r'$M_a$',orange,(-1.97,3.30))
arrow([.78,3.14],[1.53,3.14],r'$+x$',gray,[1.63,3.14]);arrow([.78,3.14],[.78,2.6],r'$+z$',gray,[.97,2.65])

def txt(y,s,size=18,color='#222',box=None):
 e.text(.01,y,s,transform=e.transAxes,fontsize=size,color=color,va='top',bbox=box)
txt(1.0,'1   Measure suspension loading',20,blue)
txt(.94,r'$m_p a_p=m_p g+R+T+D_p$',22)
txt(.87,r'$f_p=a_p-g,\qquad \tau=T/m_p,\qquad d_p=D_p/m_p$',19)
txt(.79,r'$R/m_p=f_p-\tau e_x-d_p$',23,blue,dict(boxstyle='round,pad=.45',fc='#eaf3fb',ec=blue))
txt(.705,'Gravity cancels. No canopy lift/drag model is needed here.',12,gray)
txt(.655,'2   Add pitch moments: internal hinge torque cancels',20,orange)
txt(.59,r'$I_p\dot q_p=(-a\times R)_y+z_TT+J$',20)
txt(.52,r'$I_c\dot q_c=(b\times R)_y+M_a-J$',20)
txt(.45,r'$\kappa_p=I_p/m_p,\qquad \kappa_c=I_c/m_p,\qquad m_a=M_a/m_p$',17)
txt(.37,r'$\kappa_c\dot q_c+\kappa_p\dot q_p$'+'\n'+r'$\quad=[(b-a)\times(f_p-\tau e_x-d_p)]_y+z_T\tau+m_a$',20,orange,dict(boxstyle='round,pad=.45',fc='#fff1e7',ec=orange))
txt(.215,'3   Integrate a momentum state instead of differentiating gyro',17,green)
txt(.15,r'$s=\kappa_cq_c+\kappa_pq_p,\qquad \dot s=\mathrm{RHS\ above}$',20,green)
txt(.07,r'$q_{\mathrm{rel}}=(s-\kappa_pq_p)/\kappa_c-q_p$',21,green)
fig.suptitle('Load-driven relative-pitch-rate model',fontsize=26,fontweight='bold',y=.97)
fig.text(.50,.914,'FBD → measured suspension force → normalized moment balance → rate predictor',ha='center',fontsize=15,color=gray)
fig.text(.035,.025,'J = hinge torque on payload; −J acts on canopy.  Mₐ = external canopy aerodynamic pitch moment and does not cancel.\nqp and qc are payload and canopy pitch rates; qrel = qc − qp. All vectors use a common payload frame. Force arrows are schematic.\nThis is a planar propagation model; an observer still needs measurement corrections to reject drift and model error.',fontsize=12,color=gray)
for ext in ['png','svg','pdf']:fig.savefig(r/('normalized-observer-fbd.'+ext),dpi=180)
