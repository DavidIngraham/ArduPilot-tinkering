from pathlib import Path
p=Path(__file__).parent/'swing.cpp'
s=p.read_text()
pos=s.index('    static double supported_accel')
s=s[:pos]+'''    struct Rotation { double angle,rate,accel; };
    static Rotation rotation(double t,double duration,double direction)
    {
        const double u=fmin(fmax(t/duration,0.),1.);
        return {direction*M_PI*(1-(10*u*u*u-15*u*u*u*u+6*u*u*u*u*u)),
                -direction*M_PI*(30*u*u-60*u*u*u+30*u*u*u*u)/duration,
                -direction*M_PI*(60*u-180*u*u+120*u*u*u)/(duration*duration)};
    }
    // Point offset along payload +Z, including tangential/centripetal acceleration.
    static Hand offset(const Hand &h,const Rotation &r,double z)
    {
        return {h.x+z*sin(r.angle),h.z+z*cos(r.angle),
                h.vx+z*cos(r.angle)*r.rate,h.vz-z*sin(r.angle)*r.rate,
                h.ax+z*(cos(r.angle)*r.accel-sin(r.angle)*r.rate*r.rate),
                h.az-z*(sin(r.angle)*r.accel+cos(r.angle)*r.rate*r.rate)};
    }
'''+s[pos:]
s=s.replace('        printf("%u analytical', '''        for (double direction : {-1.,1.}) {
            const auto start=rotation(0,1,direction), end=rotation(1,1,direction);
            assert(fabs(fabs(start.angle)-M_PI)<1e-6);
            assert(fabs(start.rate)+fabs(start.accel)<1e-6);
            assert(fabs(end.angle)+fabs(end.rate)+fabs(end.accel)<1e-6); count+=3;
            for (double t : {.1,.4,.7,.9}) {
                const double step=1e-5;
                const auto before=offset(hand(t-step,1,4.8),rotation(t-step,1,direction),-.45);
                const auto here=offset(hand(t,1,4.8),rotation(t,1,direction),-.45);
                const auto after=offset(hand(t+step,1,4.8),rotation(t+step,1,direction),-.45);
                assert(hypot((after.x-before.x)/(2*step)-here.vx,
                             (after.z-before.z)/(2*step)-here.vz)<1e-6);
                assert(hypot((after.vx-before.vx)/(2*step)-here.ax,
                             (after.vz-before.vz)/(2*step)-here.az)<1e-5); count+=2;
            }
        }
        printf("%u analytical''')
s=s.replace('const double initial=argc>2?atof(argv[2]):0;','const double direction=argc>2?atof(argv[2]):1;\n        const double initial=argc>5?atof(argv[5]):0;')
s=s.replace('State y{{0,initial,0,0,0,0,0,0}};','State y{{direction*M_PI,initial,0,0,0,0,0,0}};')
s=s.replace('            a.air_density=1.225;','''            const bool held=t<release;
            const auto r=held?rotation(t,swing_time,direction):Rotation{s[0],s[2],0};
            a.air_density=1.225;''')
s=s.replace('a.dcm.from_euler(0,s[0],0);','a.dcm.from_euler(0,r.angle,0);').replace('a.gyro={0,float(s[2]),0};','a.gyro={0,float(r.rate),0};')
s=s.replace('            const bool held=t<release;\n            const auto h=', '            const auto h=')
s=s.replace('const double theta_c=s[0]+s[1];','const double theta_c=r.angle+s[1];')
s=s.replace('const double qc=s[2]+s[3];','const double qc=r.rate+s[3];')
s=s.replace('''            const Vector3f velocity=held ? Vector3f{float(h.vx+fraction*bz*qc),0,float(h.vz-fraction*bx*qc)} :
                                                       Vector3f{float(s[6]),0,float(s[7])};''','''            const auto payload=offset(h,r,-.1);
            const auto hinge=offset(h,r,-.45);
            const auto payload_from_hinge=offset(Hand{},r,.35);
            const Vector3f velocity=held ? Vector3f{
                float(hinge.vx+(1-fraction)*payload_from_hinge.vx+fraction*bz*qc),0,
                float(hinge.vz+(1-fraction)*payload_from_hinge.vz-fraction*bx*qc)} :
                Vector3f{float(s[6]),0,float(s[7])};''')
s=s.replace('''                // Payload attitude fixed by bottom grip. Moving hinge is at a fixed
                // offset above payload CG. No free-CG elimination while supported.''','''                // Bottom grip prescribes payload rotation from inverted to upright.
                // Use actual moving-hinge acceleration, not hand acceleration.''')
s=s.replace('Fc.x,Fc.z,h.ax,h.az,moment','Fc.x,Fc.z,hinge.ax,hinge.az,moment')
s=s.replace('const double cax=h.ax+', 'const double cax=hinge.ax+').replace('const double caz=h.az+','const double caz=hinge.az+')
s=s.replace('1.36*h.ax','1.36*payload.ax').replace('1.36*(h.az-GRAVITY_MSS)','1.36*(payload.az-GRAVITY_MSS)')
s=s.replace('''return State{{0,s[3],0,ac,velocity.x,velocity.z,h.ax+fraction*(bz*ac-bx*qc*qc),
                                                                       h.az+fraction*(-bx*ac-bz*qc*qc)}};''','''return State{{r.rate,s[3],r.accel,ac-r.accel,velocity.x,velocity.z,
                              hinge.ax+(1-fraction)*payload_from_hinge.ax+fraction*(bz*ac-bx*qc*qc),
                              hinge.az+(1-fraction)*payload_from_hinge.az+fraction*(-bx*ac-bz*qc*qc)}};''')
start=s.index('            const double bx=',s.index('auto set_held_pose'))
end=s.index('\n        };',start)
s=s[:start]+'''            const auto r=rotation(t,swing_time,direction);
            s[0]=r.angle;
            s[2]=r.rate;
            const double angle=r.angle+s[1], qc=r.rate+s[3];
            const double bx=-.3*cos(angle)-.85*sin(angle);
            const double bz=.3*sin(angle)-.85*cos(angle);
            const auto payload=offset(h,r,-.1);
            const auto a=offset(Hand{},r,.35);
            s[4]=payload.x+.19/1.55*(bx-a.x);
            s[5]=payload.z+.19/1.55*(bz-a.z);
            s[6]=payload.vx+.19/1.55*(bz*qc-a.vx);
            s[7]=payload.vz+.19/1.55*(-bx*qc-a.vz);'''+s[end:]
p.write_text(s)
