// Local-only airborne integrator; calls the production model's force and torque functions.
#include <AP_gtest.h>
#include <SITL/SIM_Paraglider.h>
#include <array>
#include <cstdio>
#include <cstdlib>
const AP_HAL::HAL& hal = AP_HAL::get_HAL();
namespace SITL {
class ParagliderTest {
public:
    static void run(int argc, char **argv)
    {
        Paraglider a("paraglider");
        a.model.pitch_joint_enabled = strcmp(argv[1], "rigid") != 0;
        a.model.pitch_joint_locked = strcmp(argv[1], "locked") == 0;
        const double gain = atof(argv[2]), dt = atof(argv[3]);
        const double duration = atof(argv[4]);
        const bool pulse = argc > 5 && strcmp(argv[5], "throttle") == 0;
        double base_throttle;
        std::array<double, 7> y{};
        if (scanf("%lf %lf %lf %lf %lf %lf %lf", &y[0], &y[1], &y[2], &y[3], &y[4], &y[5], &base_throttle) != 7) {
            return;
        }
        if (!pulse) { y[0] += radians(3); }
        auto derivative = [&](const std::array<double, 7> &z, double t) {
            a.air_density = 1.225f;
            a.dcm.from_euler(0, z[0], 0);
            a.velocity_air_bf = a.dcm.transposed() * Vector3f{float(z[4]), 0, float(z[5])};
            a.gyro = Vector3f{0, float(z[2]), 0};
            a.joint_pitch_rad = z[1];
            a.joint_pitch_rate = z[3];
            const float throttle = constrain_float(base_throttle + (pulse && t >= 1 && t < 2 ? 0.05 : 0) -
                                                   constrain_float(gain * z[6], -0.25f, 0.25f), 0, 1);
            const auto F = a.compute_forces_bf(0, 0, throttle);
            const Vector3f force = F.F_fuse_bf + F.F_para_bf + F.F_thrust_bf;
            const Vector3f earth = a.dcm * force / a.model.mass_kg + Vector3f{0, 0, GRAVITY_MSS};
            float ap = a.compute_torque_bf(0, 0, F).y / a.model.Iyy, ac = ap;
            if (a.pitch_joint_enabled()) { a.pitch_accelerations(F, ap, ac); }
            return std::array<double, 7>{{z[2], z[3], ap, ac-ap, earth.x, earth.z, 2*M_PI*10*(z[2]-z[6])}};
        };
        printf("t,theta,relative,qp,qr,vx,vz,filtered_q,throttle\n");
        for (unsigned k = 0; k < unsigned(duration / dt); k++) {
            const double t = k * dt;
            auto k1 = derivative(y,t);
            std::array<double,7> z;
            for (unsigned i=0; i<7; i++) { z[i]=y[i]+dt*k1[i]/2; }
            auto k2 = derivative(z,t+dt/2);
            for (unsigned i=0; i<7; i++) { z[i]=y[i]+dt*k2[i]/2; }
            auto k3 = derivative(z,t+dt/2);
            for (unsigned i=0; i<7; i++) { z[i]=y[i]+dt*k3[i]; }
            auto k4 = derivative(z,t+dt);
            for (unsigned i=0; i<7; i++) { y[i]+=dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6; }
            if (k % unsigned(0.02/dt) == 0) {
                printf("%.7g",t);
                for (auto val:y) { printf(",%.9g",val); }
                printf(",%.9g\n",constrain_float(base_throttle + (pulse && t >= 1 && t < 2 ? 0.05 : 0) - constrain_float(gain*y[6],-.25f,.25f),0,1));
            }
        }
    }
};
}
int main(int argc,char **argv) { if(argc>4) { SITL::ParagliderTest::run(argc,argv); } return 0; }
