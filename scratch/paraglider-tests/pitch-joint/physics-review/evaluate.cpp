// Local-only experiment: evaluates the production SITL functions, without an autopilot.
#include <AP_gtest.h>
#include <SITL/SIM_Paraglider.h>
#include <cstdio>
const AP_HAL::HAL& hal = AP_HAL::get_HAL();
namespace SITL {
class ParagliderTest {
public:
    static void run(const char *frame)
    {
        Paraglider aircraft("paraglider");
        aircraft.model.pitch_joint_enabled = strstr(frame, "joint") || strstr(frame, "locked") ? 1 : 0;
        aircraft.model.pitch_joint_locked = strstr(frame, "locked") ? 1 : 0;
        if (strstr(frame, "_z")) { aircraft.model.thrust_payload_z_m = atof(strstr(frame, "_z") + 2); }
        if (strstr(frame, "_d")) { aircraft.model.pitch_joint_damping = atof(strstr(frame, "_d") + 2); }
        float theta, relative, qp, qr, vx, vz, throttle;
        while (scanf("%f %f %f %f %f %f %f", &theta, &relative, &qp, &qr, &vx, &vz, &throttle) == 7) {
            aircraft.air_density = 1.225f;
            aircraft.dcm.from_euler(0, theta, 0);
            aircraft.velocity_air_bf = aircraft.dcm.transposed() * Vector3f{vx, 0, vz};
            aircraft.gyro = Vector3f{0, qp, 0};
            aircraft.joint_pitch_rad = relative;
            aircraft.joint_pitch_rate = qr;
            const auto F = aircraft.compute_forces_bf(0, 0, throttle);
            const Vector3f force = F.F_fuse_bf + F.F_para_bf + F.F_thrust_bf;
            const Vector3f earth = aircraft.dcm * force / aircraft.model.mass_kg + Vector3f{0, 0, GRAVITY_MSS};
            const auto torque = aircraft.compute_torque_bf(0, 0, F);
            float ap = torque.y / aircraft.model.Iyy, ac = ap;
            if (aircraft.pitch_joint_enabled()) {
                aircraft.pitch_accelerations(F, ap, ac);
            }
            printf("E %.9g %.9g %.9g %.9g %.9g %.9g %.9g %.9g %.9g %.9g\n",
                   earth.x, earth.z, ap, ac - ap, F.alpha_pf_rad, F.V_pf,
                   force.x, force.z, torque.y, F.F_para_bf.length());
            fflush(stdout);
        }
    }
};
}
int main(int argc, char **argv) { SITL::ParagliderTest::run(argc > 1 ? argv[1] : "paraglider"); return 0; }
