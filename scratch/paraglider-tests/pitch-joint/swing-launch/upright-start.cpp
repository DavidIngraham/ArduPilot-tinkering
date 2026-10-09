// Local launch experiment. Production aerodynamics and free-flight joint dynamics.
#include <AP_gtest.h>
#include <SITL/SIM_Paraglider.h>
#include <array>
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <cassert>
const AP_HAL::HAL& hal = AP_HAL::get_HAL();
namespace SITL {
class ParagliderTest {
    using State = std::array<double, 8>; // theta, relative, qp, qr, CG x,z,vx,vz
    struct Hand { double x,z,vx,vz,ax,az; };
    static constexpr double radius = .6, height = 1.2, walk_time = 1.2, walk_distance = 1.8, toss_time = .2;
    static Hand hand(double t, double swing_time, double toss_speed)
    {
        if (t < swing_time) {
            const double u=t/swing_time;
            const double phi=-M_PI/2 + M_PI/2*(10*u*u*u-15*u*u*u*u+6*u*u*u*u*u);
            const double omega=M_PI/2*(30*u*u-60*u*u*u+30*u*u*u*u)/swing_time;
            const double alpha=M_PI/2*(60*u-180*u*u+120*u*u*u)/(swing_time*swing_time);
            return {radius*sin(phi), -height-radius*cos(phi), radius*cos(phi)*omega,
                    radius*sin(phi)*omega, radius*(cos(phi)*alpha-sin(phi)*omega*omega),
                    radius*(sin(phi)*alpha+cos(phi)*omega*omega)};
        }
        t-=swing_time;
        if (t < walk_time) {
            const double u=t/walk_time;
            return {walk_distance*(u-sin(M_PI*u)/M_PI),-height-radius,
                    walk_distance/walk_time*(1-cos(M_PI*u)),0,
                    walk_distance*M_PI/(walk_time*walk_time)*sin(M_PI*u),0};
        }
        t-=walk_time;
        const double v0=2*walk_distance/walk_time;
        const double u=t/toss_time;
        const double integrated=.5*t-toss_time/(2*M_PI)*sin(M_PI*u);
        const double blend=.5*(1-cos(M_PI*u));
        const double derivative=M_PI/(2*toss_time)*sin(M_PI*u);
        return {walk_distance+v0*t+(toss_speed-v0)*integrated,-height-radius-.6*integrated,
                v0+(toss_speed-v0)*blend,-.6*blend,(toss_speed-v0)*derivative,-.6*derivative};
    }
    static double supported_accel(double bx,double bz,double fx,double fz,double ax,double az,
                                  double moment,double relative_rate)
    {
        const double torque=bz*(fx-.19*ax)-bx*(fz+.19*GRAVITY_MSS-.19*az);
        return (torque+moment-.015*relative_rate)/(.025+.19*(bx*bx+bz*bz));
    }
public:
    static void check()
    {
        unsigned count=0;
        const double L=.9, eps=1e-3;
        const double inertia=.025+.19*L*L;
        // Stable hanging mass; independent small-angle pendulum prediction.
        assert(fabs(supported_accel(L*sin(eps),L*cos(eps),0,0,0,0,0,0)+
                    .19*GRAVITY_MSS*L*sin(eps)/inertia)<1e-6); count++;
        // Uniform free fall removes the effective gravity of a moving pivot.
        assert(fabs(supported_accel(-.3,-.85,0,0,0,GRAVITY_MSS,0,0))<1e-6); count++;
        // Horizontal base excitation, including its sign, not just magnitude.
        assert(fabs(supported_accel(0,-L,0,0,2,0,0,0)-.19*L*2/inertia)<1e-6); count++;
        // Damping removes mechanical energy.
        assert(supported_accel(0,L,0,0,0,0,0,1)<0); count++;
        // Hand acceleration includes both tangential and centripetal terms.
        for (double t : {.1,.3,.5,.8,1.1,1.6,2.1,2.25,2.35}) {
            const double h=1e-5;
            const auto before=hand(t-h,1,4.8), here=hand(t,1,4.8), after=hand(t+h,1,4.8);
            assert(fabs((after.x-before.x)/(2*h)-here.vx)<1e-6);
            assert(fabs((after.z-before.z)/(2*h)-here.vz)<1e-6);
            assert(fabs((after.vx-before.vx)/(2*h)-here.ax)<1e-6);
            assert(fabs((after.vz-before.vz)/(2*h)-here.az)<1e-6); count+=4;
        }
        for (double t : {1.,2.2}) {
            const auto before=hand(t-1e-8,1,4.8), after=hand(t+1e-8,1,4.8);
            assert(hypot(before.x-after.x,before.z-after.z)<1e-6);
            assert(hypot(before.vx-after.vx,before.vz-after.vz)<1e-6);
            assert(hypot(before.ax-after.ax,before.az-after.az)<1e-5); count+=3;
        }
        printf("%u analytical and trajectory checks passed\n",count);
    }
    static void run(int argc, char **argv)
    {
        const double swing_time=argc>1?atof(argv[1]):1;
        const double initial=argc>2?atof(argv[2]):0;
        const double toss_speed=argc>3?atof(argv[3]):4.8;
        const double release=swing_time+walk_time+toss_time;
        const double dt=1.0/(argc>4?atof(argv[4]):2400);
        Paraglider a("paraglider");
        a.model.pitch_joint_enabled=1;
        State y{{0,initial,0,0,0,0,0,0}};
        double tension=0, support=0;
        auto derivative = [&](const State &s, double t) {
            a.air_density=1.225;
            a.dcm.from_euler(0,s[0],0);
            a.joint_pitch_rad=s[1];
            a.joint_pitch_rate=s[3];
            a.gyro={0,float(s[2]),0};
            const bool held=t<release;
            const auto h=hand(fmin(t,release),swing_time,toss_speed);
            const double theta_c=s[0]+s[1];
            const double bx=-.3*cos(theta_c)-.85*sin(theta_c);
            const double bz=.3*sin(theta_c)-.85*cos(theta_c);
            const double fraction=.19/1.55;
            const double qc=s[2]+s[3];
            const Vector3f velocity=held ? Vector3f{float(h.vx+fraction*bz*qc),0,float(h.vz-fraction*bx*qc)} :
                                                       Vector3f{float(s[6]),0,float(s[7])};
            a.velocity_air_bf=a.dcm.transposed()*velocity;
            const float throttle=t>=release+1 ? .47f : 0;
            const auto F=a.compute_forces_bf(0,0,throttle);
            const auto Fc=a.dcm*(F.F_para_bf+F.F_brake_bf);
            if (held) {
                // Payload attitude fixed by bottom grip. Moving hinge is at a fixed
                // offset above payload CG. No free-CG elimination while supported.
                const double moment=.5*1.225*1.16*F.V_pf*F.V_pf*(
                    -.2*.54*F.alpha_eff_rad+.018*.54+(F.V_pf>.1 ? -2*.54*.54*qc/(2*F.V_pf) : 0));
                const double ac=supported_accel(bx,bz,Fc.x,Fc.z,h.ax,h.az,moment,s[3]);
                const double cax=h.ax+bz*ac-bx*qc*qc;
                const double caz=h.az-bx*ac-bz*qc*qc;
                const Vector3f reaction{float(.19*cax-Fc.x),0,float(.19*(caz-GRAVITY_MSS)-Fc.z)};
                tension=-(reaction.x*bx+reaction.z*bz)/sqrt(bx*bx+bz*bz);
                const auto Fp=a.dcm*(F.F_fuse_bf+F.F_thrust_bf);
                support=Vector3f{float(1.36*h.ax-Fp.x+reaction.x),0,
                                float(1.36*(h.az-GRAVITY_MSS)-Fp.z+reaction.z)}.length();
                return State{{0,s[3],0,ac,velocity.x,velocity.z,h.ax+fraction*(bz*ac-bx*qc*qc),
                                                                       h.az+fraction*(-bx*ac-bz*qc*qc)}};
            }
            float ap,ac;
            a.pitch_accelerations(F,ap,ac);
            const auto accel=a.dcm*(F.F_fuse_bf+F.F_para_bf+F.F_thrust_bf)/1.55+Vector3f{0,0,GRAVITY_MSS};
            tension=NAN; support=0;
            return State{{s[2],s[3],ap,ac-ap,s[6],s[7],accel.x,accel.z}};
        };
        auto set_held_pose = [&](State &s,double t) {
            const auto h=hand(t,swing_time,toss_speed);
            const double bx=-.3*cos(s[1])-.85*sin(s[1]);
            const double bz=.3*sin(s[1])-.85*cos(s[1]);
            s[4]=h.x+.19/1.55*bx;
            s[5]=h.z-.1+.19/1.55*(bz-.35);
            s[6]=h.vx+.19/1.55*bz*s[3];
            s[7]=h.vz-.19/1.55*bx*s[3];
        };
        set_held_pose(y,0);
        printf("t,phase,payload_pitch_deg,canopy_pitch_deg,q_payload,q_canopy,cg_x,cg_height,vx,vz,canopy_height,payload_height,tension_N,hand_force_N,throttle\n");
        for (unsigned k=0;k<unsigned((release+3)/dt);k++) {
            const double t=k*dt;
            const auto k1=derivative(y,t);
            State z;
            for (unsigned i=0;i<8;i++) { z[i]=y[i]+dt*k1[i]/2; }
            const auto k2=derivative(z,t+dt/2);
            for (unsigned i=0;i<8;i++) { z[i]=y[i]+dt*k2[i]/2; }
            const auto k3=derivative(z,t+dt/2);
            for (unsigned i=0;i<8;i++) { z[i]=y[i]+dt*k3[i]; }
            const auto k4=derivative(z,t+dt);
            for (unsigned i=0;i<8;i++) { y[i]+=dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6; }
            if (t+dt<=release) { set_held_pose(y,t+dt); }
            if (k%unsigned(.01/dt)==0) {
                derivative(y,t+dt);
                const double bz=.3*sin(y[0]+y[1])-.85*cos(y[0]+y[1]);
                const double az=.35*cos(y[0]);
                const double canopy_z=y[5]+(1-.19/1.55)*(bz-az);
                printf("%.8f,%d,%.7f,%.7f,%.7f,%.7f,%.7f,%.7f,%.7f,%.7f,%.7f,%.7f,%.7f,%.7f,%.2f\n",
                    t+dt,t<swing_time?0:t<swing_time+walk_time?1:t<release?2:t<release+1?3:4,
                    degrees(y[0]),degrees(y[0]+y[1]),degrees(y[2]),degrees(y[2]+y[3]),
                    y[4],-y[5],y[6],y[7],-canopy_z,-y[5]-.19/1.55*(az-bz),tension,support,t>=release+1?.47:0);
            }
        }
    }
};
}
int main(int argc,char **argv) { if(argc>1 && strcmp(argv[1],"--check")==0) { SITL::ParagliderTest::check(); } else { SITL::ParagliderTest::run(argc,argv); } }
