#include <AP_gtest.h>
#include <SITL/SIM_Paraglider.h>

const AP_HAL::HAL& hal = AP_HAL::get_HAL();

namespace SITL {

class ParagliderTest : public ::testing::Test {
protected:
    Paraglider aircraft{"paraglider"};

    Vector3f yaw_damping_moment(float speed, float yaw_rate)
    {
        aircraft.air_density = 1.225f;
        aircraft.gyro = Vector3f{0, 0, yaw_rate};
        Paraglider::ForceBreakdown forces{};
        forces.V_pf = speed;
        return aircraft.compute_torque_bf(0, 0, forces);
    }

    Vector3f thrust_moment(float throttle, float torque_per_thrust = -0.02f)
    {
        aircraft.model.prop_torque_per_thrust_m = torque_per_thrust;
        aircraft.velocity_air_bf.zero();
        aircraft.gyro.zero();
        aircraft.air_density = 1.225f;
        const auto forces = aircraft.compute_forces_bf(0, 0, throttle);
        return aircraft.compute_torque_bf(0, 0, forces);
    }

    Vector3f brake_force(float speed, float left, float right)
    {
        aircraft.velocity_air_bf = Vector3f{speed, 0, 0};
        aircraft.gyro.zero();
        aircraft.model.canopy_pitch_rad = 0;
        aircraft.air_density = 1.225f;
        return aircraft.compute_forces_bf(left, right, 0).F_brake_bf;
    }

    Vector3f brake_moment(float speed, float span, float left, float right)
    {
        aircraft.model.b_span_m = span;
        const auto forces = aircraft.compute_forces_bf(left, right, 0);
        auto differential = forces;
        differential.V_pf = speed;
        // Subtract the torque at zero brake with identical forces and state:
        // this isolates the direct asymmetric moment from force lever arms.
        return aircraft.compute_torque_bf(left, right, differential) -
               aircraft.compute_torque_bf(0, 0, differential);
    }
    void enable_joint()
    {
        aircraft.model.pitch_joint_enabled = 1;
        aircraft.air_density = 1.225f;
        aircraft.gyro.zero();
    }

    Vector2f joint_acceleration(float thrust, float lift, float rate = 0, float damping = 0.015f)
    {
        enable_joint();
        aircraft.joint_pitch_rate = rate;
        aircraft.model.pitch_joint_damping = damping;
        Paraglider::ForceBreakdown F{};
        F.F_thrust_bf.x = thrust;
        F.F_para_bf.z = -lift;
        float payload, canopy;
        aircraft.pitch_accelerations(F, payload, canopy);
        return Vector2f{payload, canopy};
    }

    float joint_energy()
    {
        const float qp = aircraft.gyro.y;
        const float qc = qp + aircraft.joint_pitch_rate;
        const float fraction = aircraft.model.canopy_mass_kg / aircraft.model.mass_kg;
        const float mu = aircraft.model.canopy_mass_kg * (1 - fraction);
        const Vector3f a{0, 0, aircraft.model.payload_hinge_z_m};
        const Vector3f b = rot_from_joint();
        const Vector3f relative_velocity = (Vector3f{0, qp, 0} % a) - (Vector3f{0, qc, 0} % b);
        return 0.5f * (aircraft.model.payload_pitch_inertia * sq(qp) +
                       aircraft.model.canopy_pitch_inertia * sq(qc) + mu * relative_velocity.length_squared());
    }

    Vector3f rot_from_joint()
    {
        const float c = cosf(aircraft.joint_pitch_rad);
        const float s = sinf(aircraft.joint_pitch_rad);
        const float x = aircraft.model.canopy_hinge_x_m;
        const float z = aircraft.model.canopy_hinge_z_m;
        return Vector3f{c * x + s * z, 0, -s * x + c * z};
    }

    Vector2f angle_of_attack_and_lift(float payload_pitch, float canopy_relative_pitch, bool articulated)
    {
        aircraft.model.pitch_joint_enabled = articulated ? 1 : 0;
        aircraft.model.canopy_pitch_rad = radians(5);
        aircraft.joint_pitch_rad = canopy_relative_pitch;
        aircraft.joint_pitch_rate = 0;
        aircraft.gyro.zero();
        // Fixed horizontal flight path, expressed in a nose-up payload frame.
        aircraft.velocity_air_bf = Vector3f{5 * cosf(payload_pitch), 0, 5 * sinf(payload_pitch)};
        aircraft.air_density = 1.225f;
        const auto forces = aircraft.compute_forces_bf(0, 0, 0);
        const Vector3f upward_bf{sinf(payload_pitch), 0, -cosf(payload_pitch)};
        return Vector2f{forces.alpha_pf_rad, forces.F_para_bf * upward_bf};
    }

    void set_joint_state(float angle, float rate = 0, float payload_rate = 0)
    {
        aircraft.joint_pitch_rad = angle;
        aircraft.joint_pitch_rate = rate;
        aircraft.gyro.y = payload_rate;
    }

    void set_joint_damping(float damping) { aircraft.model.pitch_joint_damping = damping; }
    void lock_joint() { aircraft.model.pitch_joint_locked = 1; }
    void set_motor_height(float height) { aircraft.model.thrust_payload_z_m = height; }
    void check_joint_geometry(float angle)
    {
        set_joint_state(angle);
        Vector3f payload, canopy;
        aircraft.pitch_geometry(payload, canopy);
        const float mc = aircraft.model.canopy_mass_kg;
        EXPECT_NEAR((payload * (aircraft.model.mass_kg - mc) + canopy * mc).length(), 0, 1.0e-6f);
        EXPECT_NEAR((payload - canopy).length(), (Vector3f{0, 0, 0.35f} - rot_from_joint()).length(), 1.0e-6f);
    }

    float canopy_motion_force(float rate)
    {
        aircraft.velocity_air_bf = Vector3f{5, 0, 0};
        const auto stationary = aircraft.compute_forces_bf(0, 0, 0);
        aircraft.joint_pitch_rate = rate;
        const auto moving = aircraft.compute_forces_bf(0, 0, 0);
        return (moving.F_para_bf - stationary.F_para_bf).length();
    }

    void free_joint_step(float dt)
    {
        Paraglider::ForceBreakdown F{};
        float qp_acc, qc_acc;
        aircraft.pitch_accelerations(F, qp_acc, qc_acc);
        aircraft.gyro.y += qp_acc * dt;
        aircraft.joint_pitch_rate += (qc_acc - qp_acc) * dt;
        aircraft.joint_pitch_rad += aircraft.joint_pitch_rate * dt;
    }

};

TEST_F(ParagliderTest, BrakeForceUsesDynamicPressure)
{
    const auto slow = brake_force(5, 0.3f, 0);
    const auto fast = brake_force(10, 0.3f, 0);
    EXPECT_LT(slow.x, 0); // drag opposes forward flight
    EXPECT_LT(slow.z, 0); // lift is upward in body z-down coordinates
    EXPECT_NEAR(fast.x, 4 * slow.x, 1.0e-6f);
    EXPECT_NEAR(fast.z, 4 * slow.z, 1.0e-6f);
    // Independent force magnitude from Eq. 20-21 at zero alpha.
    const float qS = 0.5f * 1.225f * 25 * 1.16f;
    EXPECT_NEAR(slow.x, -qS * 0.0001f * 0.3f, 1.0e-6f);
    EXPECT_NEAR(slow.z, -qS * 0.0021f * 0.3f, 1.0e-6f);
}

TEST_F(ParagliderTest, BrakeForceIsMirrorSymmetric)
{
    const auto left = brake_force(5, 0.3f, 0);
    const auto right = brake_force(5, 0, 0.3f);
    EXPECT_NEAR(left.x, right.x, 1.0e-6f);
    EXPECT_NEAR(left.z, right.z, 1.0e-6f);
    EXPECT_NEAR(left.y, 0, 1.0e-6f);
    EXPECT_NEAR(brake_force(5, 0, 0).length(), 0, 1.0e-6f);
    EXPECT_NEAR(brake_force(0, 0.3f, 0).length(), 0, 1.0e-6f);
}

TEST_F(ParagliderTest, BrakeMomentsUseSpanSquared)
{
    brake_force(5, 0, 0);
    const auto moment = brake_moment(5, 2.15f, 0, 0.3f);
    const float scale = 0.5f * 1.225f * 25 * 1.16f * sq(2.15f) / 0.4f * 0.15f;
    EXPECT_NEAR(moment.x, scale * 0.0001f, 1.0e-6f);
    EXPECT_NEAR(moment.z, scale * 0.004f, 1.0e-6f);
    const auto wider = brake_moment(5, 4.3f, 0, 0.3f);
    EXPECT_NEAR(wider.x, 4 * moment.x, 1.0e-6f);
    EXPECT_NEAR(wider.z, 4 * moment.z, 1.0e-6f);
    const auto faster = brake_moment(10, 2.15f, 0, 0.3f);
    EXPECT_NEAR(faster.z, 4 * moment.z, 1.0e-6f);
}

TEST_F(ParagliderTest, BrakeMomentsReverseAndCancel)
{
    brake_force(5, 0, 0);
    const auto left = brake_moment(5, 2.15f, 0.3f, 0);
    const auto right = brake_moment(5, 2.15f, 0, 0.3f);
    EXPECT_LT(left.z, 0);
    EXPECT_GT(right.z, 0);
    EXPECT_NEAR(left.x, -right.x, 1.0e-6f);
    EXPECT_NEAR(left.z, -right.z, 1.0e-6f);
    EXPECT_NEAR(brake_moment(5, 2.15f, 0.3f, 0.3f).length(), 0, 1.0e-6f);
}

TEST_F(ParagliderTest, YawDampingOpposesRotationAndScalesWithSpeed)
{
    const auto positive = yaw_damping_moment(5, 0.2f);
    const auto negative = yaw_damping_moment(5, -0.2f);
    const float expected = -0.05f * 0.5f * 1.225f * 5 * 1.16f * sq(2.15f) * 0.2f / 2;
    EXPECT_NEAR(positive.z, expected, 1.0e-6f);
    EXPECT_LT(positive.z * 0.2f, 0); // damping removes rotational energy
    EXPECT_LT(negative.z * -0.2f, 0);
    EXPECT_NEAR(negative.z, -positive.z, 1.0e-6f);
    EXPECT_NEAR(yaw_damping_moment(10, 0.2f).z, 2 * positive.z, 1.0e-6f);
    EXPECT_NEAR(yaw_damping_moment(5, 0.4f).z, 2 * positive.z, 1.0e-6f);
    EXPECT_NEAR(yaw_damping_moment(5, 0).z, 0, 1.0e-6f);
    EXPECT_NEAR(yaw_damping_moment(0, 0.2f).z, 0, 1.0e-6f);
}

TEST_F(ParagliderTest, PropellerReactionTorqueTracksThrustAndRotationDirection)
{
    const auto full = thrust_moment(1);
    EXPECT_NEAR(full.x, -0.2f, 1.0e-6f); // 10 N * -0.02 m
    EXPECT_NEAR(full.y, 1.37f, 1.0e-6f); // existing thrust-offset moment
    EXPECT_NEAR(full.z, 0, 1.0e-6f);
    EXPECT_NEAR(thrust_moment(0.4f).x, 0.4f * full.x, 1.0e-6f);
    EXPECT_NEAR(thrust_moment(0).length(), 0, 1.0e-6f);
    EXPECT_NEAR(thrust_moment(-1).length(), 0, 1.0e-6f);
    EXPECT_NEAR(thrust_moment(2).x, full.x, 1.0e-6f);
    EXPECT_NEAR(thrust_moment(1, 0).x, 0, 1.0e-6f);
    EXPECT_NEAR(thrust_moment(1, 0.02f).x, -full.x, 1.0e-6f);
}

TEST_F(ParagliderTest, NoseUpIncreasesAngleOfAttackAndLift)
{
    for (bool articulated : {false, true}) {
        const auto level = angle_of_attack_and_lift(0, 0, articulated);
        const auto nose_up = angle_of_attack_and_lift(radians(3), 0, articulated);
        EXPECT_NEAR(level.x, radians(5), 1.0e-6f);
        EXPECT_NEAR(nose_up.x, radians(8), 1.0e-6f);
        EXPECT_GT(nose_up.y, level.y);
    }
}

TEST_F(ParagliderTest, CanopyJointPitchUsesPhysicalAngleConvention)
{
    const auto nose_up = angle_of_attack_and_lift(radians(2), radians(3), true);
    EXPECT_NEAR(nose_up.x, radians(10), 1.0e-6f);
    const auto nose_down = angle_of_attack_and_lift(radians(2), radians(-3), true);
    EXPECT_NEAR(nose_down.x, radians(4), 1.0e-6f);
    EXPECT_GT(nose_up.y, nose_down.y);
    // At the same chord/flight-path angle, moving rotation between the
    // payload and the pitch joint must preserve canopy lift.
    const auto rigid = angle_of_attack_and_lift(radians(5), 0, false);
    EXPECT_NEAR(nose_up.y, rigid.y, 1.0e-5f);
}

TEST_F(ParagliderTest, JointGeometryKeepsSystemCGFixed)
{
    enable_joint();
    for (float angle : {-0.5f, 0.0f, 0.5f}) {
        check_joint_geometry(angle);
    }
}

TEST_F(ParagliderTest, ThrustAbovePayloadCGCanPitchPayloadDown)
{
    const auto acceleration = joint_acceleration(5, 0);
    EXPECT_LT(acceleration.x, 0);
    EXPECT_GT(acceleration.y, 0);
    set_motor_height(0.1f);
    const auto lower = joint_acceleration(5, 0);
    EXPECT_GT(lower.x, 0);
    EXPECT_NEAR(joint_acceleration(0, 0).length(), 0, 1.0e-6f);
}

TEST_F(ParagliderTest, LockedJointUsesTotalMomentAndInertia)
{
    lock_joint();
    const auto acceleration = joint_acceleration(5, 0);
    EXPECT_NEAR(acceleration.x, acceleration.y, 1.0e-6f);
    // Independent composite-body inertia and CG-to-thrust lever arm.
    const float mu = 0.19f * (1 - 0.19f / 1.55f);
    const float inertia = 0.03f + 0.025f + mu * (sq(1.2f) + sq(0.3f));
    const float arm = (0.19f / 1.55f) * 1.2f - 0.1f;
    EXPECT_NEAR(acceleration.x, 5 * arm / inertia, 1.0e-5f);
}

TEST_F(ParagliderTest, JointDampingRemovesEnergy)
{
    enable_joint();
    set_joint_state(0.2f, 0.7f, -0.3f);
    const float before = joint_energy();
    free_joint_step(1.0e-4f);
    EXPECT_LT(joint_energy(), before);
    EXPECT_NEAR((joint_energy() - before) / 1.0e-4f, -0.015f * sq(0.7f), 1.0e-4f);
}

TEST_F(ParagliderTest, FreeJointConservesEnergyWithoutDamping)
{
    enable_joint();
    set_joint_damping(0);
    set_joint_state(0.2f, 0.7f, -0.3f);
    const float before = joint_energy();
    for (unsigned i = 0; i < 10000; i++) {
        free_joint_step(1.0e-4f);
    }
    EXPECT_NEAR(joint_energy(), before, before * 0.001f);
}

TEST_F(ParagliderTest, CanopyRateChangesAerodynamicDamping)
{
    enable_joint();
    EXPECT_GT(canopy_motion_force(0.3f), 0.01f);
}

} // namespace SITL

AP_GTEST_MAIN()
