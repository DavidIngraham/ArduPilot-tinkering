// AI-assisted reduced launch/contact extension. GPL-3.0-or-later.
// No cloth solver: inflation is a scalar ram-air state; the launcher supplies
// prescribed hand/run motion before release. All airborne dynamics use dynamics.cpp.
#include <Eigen/Dense>
#include <Eigen/Geometry>
#include <algorithm>
#include <cmath>
using V = Eigen::Vector3d;
using M = Eigen::Matrix3d;
using M6 = Eigen::Matrix<double,6,6>;
using V6 = Eigen::Matrix<double,6,1>;
using G = Eigen::Matrix<double,3,6>;
using Y = Eigen::Matrix<double,26,1>;
extern "C" int causal_replay(const double*,const double*,int,double,int,const double*,double,const double*,double,double,double*,double*);
static M rotation(const Y& y,int k) {
    return Eigen::Quaterniond(y[k+6],y[k+3],y[k+4],y[k+5]).normalized().toRotationMatrix();
}
static M cross_matrix(V v) {
    M s; s << 0,-v.z(),v.y(),v.z(),0,-v.x(),-v.y(),v.x(),0; return s;
}
// Plastic contact impulse, with the point-joint constraint retained. Coulomb
// friction is bounded by the normal impulse. Contact radii are explicit assumptions.
static bool contact(Y& y,const double* p,double mass,double friction,double radius) {
    const M Rp=rotation(y,0), Rc=rotation(y,13);
    M Ib; Ib << p[42],p[45],p[46],p[45],p[43],p[47],p[46],p[47],p[44];
    M6 Hp=M6::Zero(), Hc=M6::Zero();
    Hp.block<3,3>(0,0)=M::Identity()/(mass-p[51]);
    Hp.block<3,3>(3,3)=(Rp*Ib*Rp.transpose()).inverse();
    G B1,B2; B1 << M::Identity(),-cross_matrix(V(0,0,p[36])); B2 << M::Identity(),-cross_matrix(V(0,0,p[37]));
    M6 inertia=B1.transpose()*V(p[30],0,0).asDiagonal()*B1+B2.transpose()*V(0,p[31],p[32]).asDiagonal()*B2;
    inertia.block<3,3>(0,0)+=p[51]*M::Identity();
    inertia.block<3,3>(3,3)+=V(.075+p[33],.008+p[34],.077+p[35]).asDiagonal();
    M6 R=M6::Zero(); R.block<3,3>(0,0)=Rc; R.block<3,3>(3,3)=Rc;
    Hc=R*inertia.inverse()*R.transpose();
    G Gp,Gc; Gp << M::Identity(),-cross_matrix(Rp*V(p[39],p[40],p[41]));
    Gc << M::Identity(),-cross_matrix(Rc*V(0,0,.85));
    const M A=Gp*Hp*Gp.transpose()+Gc*Hc*Gc.transpose();
    bool touched=false;
    for(int body=0;body<2;body++) {
        const int k=13*body;
        const double r=body ? .03 : radius;
        const double penetration=y[k+2]+r;
        if(penetration < 0) continue;
        touched=true;
        // Translate the complete constrained assembly: never stretch the joint.
        y[2]-=penetration; y[15]-=penetration;
        G C; C << M::Identity(),-cross_matrix(V(0,0,r));
        Eigen::Matrix<double,6,3> Dp=Eigen::Matrix<double,6,3>::Zero(), Dc=Dp;
        if(body) Dc=Hc*C.transpose(); else Dp=Hp*C.transpose();
        const M reaction=A.ldlt().solve(-(Gp*Dp-Gc*Dc));
        Dp+=Hp*Gp.transpose()*reaction; Dc-=Hc*Gc.transpose()*reaction;
        const M K=C*(body?Dc:Dp);
        V6 u; u << y.segment<3>(k+7),y.segment<3>(k+10);
        const V velocity=C*u;
        if(velocity.z()<=0) continue;
        // Solve sticking in all three axes together. Sequential friction after
        // a normal impulse can reintroduce normal velocity through joint coupling.
        V j=K.ldlt().solve(-velocity);
        if(j.z()>0 || j.head<2>().norm()>friction*(-j.z())) {
            V tangent=velocity; tangent.z()=0;
            V direction(0,0,-1);
            if(tangent.norm()>1e-9) direction-=friction*tangent.normalized();
            const double denominator=(K*direction).z();
            if(denominator < -1e-12) j=direction*(-velocity.z()/denominator);
            else j.setZero();
            // Guard against adding kinetic energy in a strongly coupled slip case.
            const double work=j.dot(velocity), quadratic=j.dot(K*j);
            if(quadratic>0 && work+.5*quadratic>0) j*=std::clamp(-2*work/quadratic,0.,1.);
        }
        const V6 dp=Dp*j, dc=Dc*j;
        y.segment<3>(7)+=dp.head<3>(); y.segment<3>(10)+=dp.tail<3>();
        y.segment<3>(20)+=dc.head<3>(); y.segment<3>(23)+=dc.tail<3>();
    }
    return touched;
}

// env = [phase (0 ground hold, 1 assisted inflation, 2 free, 3 contact), elapsed, inflation]
// settings = [payload contact radius, hand release height, run speed, run duration,
//             inflation time constant, friction]. These are not fitted cloth parameters.
extern "C" int surface_step(const double* initial,const double* u,const double* p,double mass,
    const double* wind,double voltage,double rpm_initial,double dt,const double* settings,
    double* env,double* output,double* rpm_output) {
    if(!(dt>0 && dt<=1) || !std::isfinite(dt)) return 0;
    for(int i=0;i<6;i++) if(!std::isfinite(settings[i])) return 0;
    if(settings[0]<=0 || settings[1]<settings[0] || settings[2]<0 ||
       settings[3]<=0 || settings[4]<=0 || settings[5]<0) return 0;
    Y y=Eigen::Map<const Y>(initial);
    double rpm=rpm_initial;
    const int substeps=std::max(1,int(std::ceil(dt/.00125)));
    const double h=dt/substeps;
    for(int step=0;step<substeps;step++) {
        if(env[0]<2) {
            if(env[0]==1) env[1]+=h;
            const double t=env[1], duration=settings[3];
            const double v=settings[2]*std::clamp(t/duration,0.,1.);
            const double vz=t<duration && env[0]==1 ? -(settings[1]-settings[0])/duration : 0.;
            y[0]+=v*h; y[2]=-settings[0]-(settings[1]-settings[0])*std::clamp(t/duration,0.,1.);
            y.segment<3>(7)=V(v,0,vz); y.segment<3>(20)=V(v,0,vz);
            y.segment<3>(10).setZero(); y.segment<3>(23).setZero();
            y.segment<3>(13)=y.head<3>()+rotation(y,0)*V(p[39],p[40],p[41])-rotation(y,13)*V(0,0,.85);
            const double air=std::max(0.,v-wind[0]);
            if(env[0]==1) env[2]=1-(1-env[2])*std::exp(-h*std::min(4.,air*air/9.)/settings[4]);
            const double target=env[0]==1 ? 743.5778222336925*voltage*std::pow(std::max(u[0]-.0005141016498671315,0.),.9086807307118114) : 0.;
            rpm=target+(rpm-target)*std::exp(-h/.01756125311487475);
            if(t>=duration && env[2]>=.95) { env[0]=2; y[9]=y[22]=0; }
        } else {
            double parameters[70]; std::copy(p,p+70,parameters);
            env[2]=1-(1-env[2])*std::exp(-h/settings[4]);
            for(int i : {4,5,9,14,15,16}) parameters[i]*=env[2];
            double controls[6]={u[0],u[1],u[2],u[0],u[1],u[2]}, states[52], rpms[2];
            if(causal_replay(y.data(),controls,2,h,1,parameters,mass,wind,voltage,rpm,states,rpms)!=2) return 0;
            y=Eigen::Map<Y>(states+26);rpm=rpms[1];
            env[0]=contact(y,parameters,mass,settings[5],settings[0]) ? 3 : 2;
        }
        if(!y.allFinite() || !std::isfinite(rpm)) return 0;
    }
    Eigen::Map<Y> result(output);result=y;*rpm_output=rpm;return 1;
}
