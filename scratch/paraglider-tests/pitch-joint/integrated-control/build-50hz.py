import shutil,subprocess
from pathlib import Path
root=Path(__file__).parent;repo=Path('/workspace/ardupilot');oldroot=root.parent/'oracle-control'
paths=[repo/'libraries/SITL/SIM_Paraglider.cpp',repo/'libraries/SITL/SIM_Paraglider.h',repo/'libraries/AP_TECS/AP_TECS_Paraglider.cpp',repo/'libraries/AP_TECS/AP_TECS.cpp']
originals=[p.read_text() for p in paths]
for p,s in zip(paths,originals):(root/('production-'+p.name)).write_text(s)
shutil.copy2(repo/'build/sitl/bin/arduplane',root/'production-arduplane')
s=originals[0]
old=(oldroot.parent/'physics-review/airborne-experiment.cpp').read_text()
a=old.index('    if (launch_accel < 0 && launch_start_ms == 0)');b=old.index('    update_wind(input);',a)
s=s.replace('    if (strstr(frame_str, "-tow")) {','''    if (strstr(frame_str, "-airborne")) { have_launcher = true; launch_accel = -60; launch_time = 0; }
    PGOracleControl::aircraft = this;
    if (strstr(frame_str, "-tow")) {''')
s=s.replace('    // Keep a guided aircraft supported until the launch command, rather',old[a:b]+'    // Keep a guided aircraft supported until the launch command, rather')
s=s.replace('#include <AP_Math/AP_Math.h>','#include <AP_Math/AP_Math.h>\n#include <cstdlib>\n#include <cstdio>')
helper='''
// LOCAL BENCHMARK ONLY: truth-state LQI, no production API or bindings.
namespace SITL {
class PGOracleControl {
public:
    static Paraglider *aircraft;
    static float motor;
    static float target;
    static float output;
    static float update(float target, float dt, float lo, float hi, float slew) {
        static float k[8], ref[8], trim[7], integral, previous;
        static bool loaded;
        if (!aircraft) { return .47f; }
        if (!loaded) {
            FILE *f = fopen(getenv("PG_LQI_GAINS"), "r");
            if (!f) { return .47f; }
            for (float &v : k) { if (fscanf(f, "%f", &v) != 1) { abort(); } }
            for (float &v : ref) { if (fscanf(f, "%f", &v) != 1) { abort(); } }
            for (float &v : trim) { if (fscanf(f, "%f", &v) != 1) { abort(); } }
            fclose(f); previous = trim[6]; loaded = true;
        }
        const auto &a = *aircraft;
        float roll, pitch, yaw; a.dcm.to_euler(&roll, &pitch, &yaw);
        const float speed = a.velocity_air_ef.x*cosf(yaw)+a.velocity_air_ef.y*sinf(yaw);
        const float x[] = {pitch, a.joint_pitch_rad, a.gyro.y, a.joint_pitch_rate,
                           speed, a.velocity_ef.z, motor};
        // Nominal speed scales with density, as in the airborne fixture.
        const float speed_trim = trim[4]*sqrtf(1.225f/a.air_density);
        float raw = trim[6]+ref[7]*target-k[7]*integral;
        for (unsigned i=0; i<7; i++) {
            const float equilibrium = i == 4 ? speed_trim : trim[i];
            raw -= k[i]*(x[i]-equilibrium-ref[i]*target);
        }
        float lower = lo, upper = hi;
        if (slew > 0) { lower = MAX(lower,previous-slew*dt); upper = MIN(upper,previous+slew*dt); }
        const float demand = constrain_float(raw,lower,upper);
        const float error = -a.velocity_ef.z-target;
        if (fabsf(raw-demand)<1.0e-6f || (raw>demand && k[7]*error>0) || (raw<demand && k[7]*error<0)) {
            integral = constrain_float(integral+dt*error,-2.0f,2.0f);
        }
        previous = demand;
        AP::logger().WriteStreaming("PGLQ", "TimeUS,Target,Raw,Demand,Integ,DT", "Qfffff",
                                   AP_HAL::micros64(),target,raw,demand,integral,dt);
        return demand;
    }
};
Paraglider *PGOracleControl::aircraft;
float PGOracleControl::motor;
float PGOracleControl::target;
float PGOracleControl::output = .47f;
}
extern "C" float pg_lqi_throttle(float target, float dt, float lo, float hi, float slew);
extern "C" float pg_lqi_throttle(float target, float dt, float lo, float hi, float slew) {
    if (dt <= 0) { SITL::PGOracleControl::target = target; return SITL::PGOracleControl::output; }
    SITL::PGOracleControl::output = SITL::PGOracleControl::update(SITL::PGOracleControl::target,dt,lo,hi,slew);
    return SITL::PGOracleControl::output;
}
'''
idx=s.index('Paraglider::Paraglider(');s=s[:idx]+helper+'\n'+s[idx:]
s=s.replace('    const float throttle = constrain_float(filtered_servo_range(input, 2), 0.0f, 1.0f);','''    const float throttle = constrain_float(filtered_servo_range(input, 2), 0.0f, 1.0f);
    PGOracleControl::motor = throttle;''')
s=s.replace('    const ForceBreakdown F = compute_forces_bf(brake_left_rad, brake_right_rad, throttle);','''    const ForceBreakdown F = compute_forces_bf(brake_left_rad, brake_right_rad, throttle);
    static uint64_t last_control_log;
    if (time_now_us-last_control_log>=20000) {
        last_control_log=time_now_us;
        AP::logger().WriteStreaming("PGAF", "TimeUS,Alpha,VCanopy,Rho,Act", "Qffff",
                                   AP_HAL::micros64(),degrees(F.alpha_pf_rad),F.V_pf,air_density,throttle);
    }''')
h=originals[1].replace('    friend class ParagliderTest;','    friend class ParagliderTest;\n    friend class PGOracleControl;')
t=originals[2].replace('#include "AP_TECS.h"','#include "AP_TECS.h"\n#include <cstdlib>\nextern "C" float pg_lqi_throttle(float target, float dt, float lo, float hi, float slew);')
needle='    // Scale our nominal throttle based on the desired climb rate'
t=t.replace(needle,'''    if (getenv("PG_LQI_GAINS")) {
        _throttle_dem = pg_lqi_throttle(v_up_des,0,_THRminf,_THRmaxf,
                                       aparm.throttle_slewrate*.01f*(_THRmaxf-_THRminf));
        constrain_throttle();
        _log_TECS_state(now);
        return;
    }

'''+needle)
u=originals[3].replace('#include "AP_TECS.h"','#include "AP_TECS.h"\n#include <cstdlib>\nextern "C" float pg_lqi_throttle(float target, float dt, float lo, float hi, float slew);')
u=u.replace('    // Update the states', '    // Update the states')
needle='    // Update the speed estimate'
# Insert at end of update_50hz, after vertical state processing.
end=u.index('\nvoid AP_TECS::_update_speed(')
closing=u.rfind('}',0,end)
u=u[:closing]+'''    if (_pg_params.enable && getenv("PG_LQI_GAINS")) {
        _throttle_dem = pg_lqi_throttle(0,DT,_THRminf,_THRmaxf,aparm.throttle_slewrate*.01f*(_THRmaxf-_THRminf));
        constrain_throttle();
    }
'''+u[closing:]
for p,exp in zip(paths,[s,h,t,u]):(root/('experimental-'+p.name)).write_text(exp)
try:
 for p,exp in zip(paths,[s,h,t,u]):p.write_text(exp)
 with (root/'build.txt').open('w') as log:subprocess.run(['./waf','plane','-j','4'],cwd=repo,stdout=log,stderr=subprocess.STDOUT,check=True)
 shutil.copy2(repo/'build/sitl/bin/arduplane',root/'experimental-arduplane')
finally:
 for p,orig in zip(paths,originals):p.write_text(orig)
 shutil.copy2(root/'production-arduplane',repo/'build/sitl/bin/arduplane')
