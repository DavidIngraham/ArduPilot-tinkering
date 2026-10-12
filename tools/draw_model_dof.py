from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, Rectangle, FancyArrowPatch, Arc
fig,axs=plt.subplots(1,3,figsize=(15,6),facecolor='white')
colors=['#2678a6','#d07728','#7754a3']
for ax in axs:
 ax.set(xlim=(-2,2),ylim=(-2,2));ax.set_aspect('equal');ax.axis('off')
def arrow(ax,a,b,c):ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=16,color=c,lw=2))
def craft(ax):
 ax.add_patch(Ellipse((0,1),2.4,.45,facecolor='#d9e9ed',edgecolor='#375e6c',lw=2))
 for x in [-.9,.9]:ax.plot([x,0],[.9,0],color='#8a989e',lw=1.8)
 ax.plot([0,0],[0,-.55],color='#8a989e',lw=1.8)
 ax.add_patch(Rectangle((-.3,-1.1),.6,.55,facecolor='#e9ddd2',edgecolor='#775534',lw=2))
 ax.plot(0,0,'ko',ms=7)
for ax in axs:craft(ax)
ax=axs[0];c=colors[0]
for end,txt,xy in [((1.4,0),'1  North',(1.05,.18)),((-.9,-.45),'2  East',(-1.75,-.65)),((0,-1.65),'3  Down',(.12,-1.65))]:
 arrow(ax,(0,0),end,c);ax.text(*xy,txt,color=c,fontsize=12)
ax.set_title('3 translations',fontsize=18,color=c,pad=18)
ax.text(0,1.65,'Position of the shared attachment',ha='center',fontsize=11)
for ax,c,y,labels in [(axs[1],colors[1],-.8,['4  Payload roll','5  Payload pitch','6  Payload yaw']),(axs[2],colors[2],1,['7  Relative roll','8  Relative pitch','9  Relative yaw'])]:
 for rad,angle in [(.7,0),(.95,55),(1.2,110)]:
  ax.add_patch(Arc((0,y),rad,rad*.65,angle=angle,theta1=15,theta2=290,color=c,lw=2))
 for i,label in enumerate(labels):ax.text(-1.85,-1.45-i*.23,label,color=c,fontsize=12)
axs[1].set_title('3 payload rotations',fontsize=18,color=colors[1],pad=18)
axs[1].text(0,1.65,'Attitude relative to the world',ha='center',fontsize=11)
axs[2].set_title('3 relative rotations',fontsize=18,color=colors[2],pad=18)
axs[2].text(0,1.65,'Canopy attitude relative to payload',ha='center',fontsize=11)
fig.suptitle('Nine mechanical degrees of freedom: 3 + 3 + 3',fontsize=22,y=.98)
fig.text(.5,.08,'Point joint: attachment positions coincide; relative rotation is resisted by spring and damper torques.',ha='center',fontsize=12)
fig.text(.5,.035,'Schematic coordinate count, not three separate aircraft. Rotor speed and servo travel are additional dynamic states.',ha='center',fontsize=11,color='#555555')
fig.subplots_adjust(top=.80,bottom=.16,wspace=.15)
out=Path(__file__).resolve().parents[1]/'docs/assets/model-mechanics';out.mkdir(parents=True,exist_ok=True)
fig.savefig(out/'nine-dof.png',dpi=160)
fig.savefig(out/'nine-dof.svg')
