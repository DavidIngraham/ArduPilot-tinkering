# AP_FLAKE8_CLEAN
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch, Rectangle

root = Path(__file__).parent
fig = plt.figure(figsize=(15, 8.3), facecolor='white')
grid = fig.add_gridspec(1, 3, left=.04, right=.98, bottom=.24, top=.84, wspace=.28)
axes = [fig.add_subplot(grid[0, i]) for i in range(3)]
blue, red, green, gray = '#1769aa', '#b93335', '#26854b', '#777777'

def setup(ax, title):
    ax.set_aspect('equal')
    ax.set_xlim(-.85, .9)
    ax.set_ylim(-.9, 1.15)
    ax.axis('off')
    ax.set_title(title, fontsize=14, pad=15, fontweight='bold')

def point(ax, x, y, label, offset=(8, 7)):
    ax.plot(x, y, 'o', color='black', markersize=5, zorder=5)
    ax.annotate(label, (x, y), xytext=offset, textcoords='offset points', fontsize=12, zorder=6)

def arrow(ax, origin, end, label, color, label_at, alignment='left'):
    ax.add_patch(FancyArrowPatch(origin, end, arrowstyle='-|>', mutation_scale=19,
                                linewidth=2.5, color=color, zorder=4))
    ax.text(*label_at, label, color=color, fontsize=12, ha=alignment, va='center')

for ax, title in zip(axes, ['Cruise geometry', 'Canopy free body', 'Payload free body']):
    setup(ax, title)

# Side elevation: forward to right, vertical up. Body held level to expose offsets.
H, C, P, S = (0, 0), (-.30, .85), (0, -.35), (0, -.25)
ax = axes[0]
ax.add_patch(Ellipse(C, .95, .18, angle=8, facecolor='#e6f1fc', edgecolor=blue, linewidth=2))
ax.plot([-.62, 0, .02], [.83, 0, .85], color=gray, linewidth=1.5)
ax.plot([0, 0], [0, -.35], color=gray, linewidth=2)
ax.add_patch(Rectangle((-.15, -.48), .3, .23, facecolor='#eeeeee', edgecolor=gray))
point(ax, *C, 'C: canopy CG', (-12, 23))
point(ax, *H, 'H: effective hinge', (10, 5))
point(ax, *P, 'P: payload CG', (-100, -27))
point(ax, *S, 'S: thrust line', (13, -7))
ax.plot([-.12, .65], [S[1], S[1]], linestyle='--', color=green, linewidth=1.5)
ax.annotate('', xy=(.58, 0), xytext=(.58, -.35), arrowprops=dict(arrowstyle='<->', color=gray))
ax.text(.61, -.1, '0.35 m', fontsize=10, color=gray, rotation=90, va='center')
ax.annotate('', xy=(-.26, -.25), xytext=(-.26, -.35), arrowprops=dict(arrowstyle='<->', color=gray))
ax.text(-.29, -.30, '0.10 m', fontsize=10, color=gray, ha='right')
ax.text(-.78, -.74, 'Thrust is below H, but above P.\nOffsets shown are provisional sim values.', fontsize=10)

ax = axes[1]
ax.add_patch(Ellipse(C, .75, .15, angle=8, facecolor='#e6f1fc', edgecolor=blue, linewidth=1.5))
ax.plot([C[0], H[0]], [C[1], H[1]], '--', color=gray, linewidth=1.2)
point(ax, *C, 'C', (10, -15))
point(ax, *H, 'H', (-20, -15))
arrow(ax, C, (-.30, 1.14), '$L_c$', blue, (-.20, 1.08))
arrow(ax, C, (-.80, .85), '$D_c$', blue, (-.79, .94))
arrow(ax, C, (-.30, .48), '$m_c g$', red, (-.38, .54), 'right')
arrow(ax, H, (.30, -.63), '$-\\mathbf{R}$', green, (.35, -.54))
# Signed positive pitch moment convention (nose up), not an assumed trim sign.
ax.add_patch(FancyArrowPatch((.12, .74), (.10, .98), connectionstyle='arc3,rad=.8',
                            arrowstyle='-|>', mutation_scale=15, color=blue, linewidth=2))
ax.text(.38, .85, '$M_c$\n(signed)', fontsize=11, color=blue, ha='center')
ax.text(-.79, -.74, 'Aerodynamic force at C plus pitching moment.\nH receives the payload reaction.', fontsize=10)

ax = axes[2]
ax.plot([0, 0], [0, -.35], color=gray, linewidth=2)
ax.add_patch(Rectangle((-.15, -.48), .3, .23, facecolor='#eeeeee', edgecolor=gray))
point(ax, *H, 'H', (10, 8))
point(ax, *P, 'P', (10, -18))
point(ax, *S, 'S', (-20, 7))
arrow(ax, H, (-.30, .63), '$\\mathbf{R}$', green, (-.39, .51), 'right')
arrow(ax, P, (0, -.85), '$m_p g$', red, (.08, -.76))
arrow(ax, P, (-.65, -.35), '$D_p$', blue, (-.69, -.26))
arrow(ax, S, (.70, -.25), '$T$', green, (.67, -.16))
ax.add_patch(FancyArrowPatch((.39, -.41), (.37, -.65), connectionstyle='arc3,rad=-.8',
                            arrowstyle='-|>', mutation_scale=15, color=green, linewidth=2))
ax.text(.55, -.72, 'Thrust alone:\nnose-down moment', fontsize=10, ha='center', color=green)

fig.suptitle('Powered paraglider: steady, straight, level cruise', fontsize=19, fontweight='bold', y=.97)
fig.text(.5, .90, 'Side view • forward → • forces schematic, arrows not to scale • roll/yaw omitted',
         ha='center', fontsize=12, color='#555555')
fig.text(.05, .17, '$\\mathbf{R}$ = canopy force on payload at H; canopy receives $-\\mathbf{R}$. '
         'This is a hinge reaction, not necessarily a vertical line force.', fontsize=12)
fig.text(.05, .115, '$L_c = (m_p+m_c)g$     $T = D_c+D_p$     '
         '$\\sum M_{P}=\\sum M_{C}=0$ at steady cruise.', fontsize=13)
fig.text(.05, .057, 'Payload: thrust above its CG pitches it nose-down; the suspension reaction supplies the balancing moment.\n'
         'Free pin: no steady joint couple; mechanical joint damping acts only when canopy and payload have relative pitch rate.', fontsize=11)
fig.savefig(root / 'cruise-free-body.png', dpi=190)
fig.savefig(root / 'cruise-free-body.svg')
fig.savefig(root / 'cruise-free-body.pdf')
print(root / 'cruise-free-body.png')
