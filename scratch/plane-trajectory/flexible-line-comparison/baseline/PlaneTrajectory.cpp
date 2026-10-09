#include "PlaneTrajectory.h"
#if AP_PLANE_TRAJECTORY_ENABLED
#include <AP_Logger/AP_Logger.h>

const AP_Param::GroupInfo AP_PlaneTrajectory::var_info[] = {
    // @Param: ENABLE
    // @DisplayName: Experimental waypoint trajectory guidance
    // @Description: Connect incoming and outgoing ground-track lines using wind-aware turns. Ordinary waypoint acceptance radii do not constrain planned turns or mission handover. Overlapping turns are grouped; explicit pass-by distances remain protected. Unsupported or infeasible transitions use normal L1 guidance. This prototype is disabled by default.
    // @Values: 0:Disabled,1:Enabled
    // @User: Advanced
    AP_GROUPINFO_FLAGS("ENABLE", 0, AP_PlaneTrajectory, _enable, 0, AP_PARAM_FLAG_ENABLE),
    // @Param: RATE
    // @DisplayName: Trajectory planning heading-rate limit
    // @Description: Maximum planned heading rate, also limited by 70 percent of the current bank limit. This must not exceed sustainable aircraft turning capability.
    // @Range: 1 45
    // @Units: deg/s
    // @User: Advanced
    AP_GROUPINFO("RATE", 1, AP_PlaneTrajectory, _rate_max, 20),
    // @Param: PERIOD
    // @DisplayName: Trajectory tracking period
    // @Description: Response period for ground-track and cross-track correction around the planned heading-rate feedforward. Smaller values increase correction strength.
    // @Range: 3 20
    // @Units: s
    // @User: Advanced
    AP_GROUPINFO("PERIOD", 2, AP_PlaneTrajectory, _period, 8),
    // @Param: MARGIN
    // @DisplayName: Trajectory turn transition allowance
    // @Description: Additional time allowed on entry and exit legs for roll response. Adjacent corners whose transition distances overlap are planned together.
    // @Range: 0 5
    // @Units: s
    // @User: Advanced
    AP_GROUPINFO("MARGIN", 3, AP_PlaneTrajectory, _margin, 1.5f),
    AP_GROUPEND
};

AP_PlaneTrajectory::AP_PlaneTrajectory()
{
    AP_Param::setup_object_defaults(this, var_info);
}

AP_PlaneTrajectory::State AP_PlaneTrajectory::sample(const Path &path, float t) const
{
    State s{path.start, {}, path.heading, 0};
    for (uint8_t i = 0; i < 3; i++) {
        const float dt = constrain_float(t, 0, path.time[i]);
        const float r = path.rate[i];
        const float end_heading = s.heading + r * dt;
        if (fabsf(r) > 0.001f) {
            s.position += Vector2f(sinf(end_heading) - sinf(s.heading),
                                   cosf(s.heading) - cosf(end_heading)) * (_airspeed / r);
        } else {
            s.position += Vector2f(cosf(s.heading), sinf(s.heading)) * (_airspeed * dt);
        }
        s.position += _wind * dt;
        s.heading = end_heading;
        s.rate = r;
        t -= dt;
        if (t <= 0) {
            break;
        }
    }
    s.velocity = Vector2f(cosf(s.heading), sinf(s.heading)) * _airspeed + _wind;
    return s;
}

float AP_PlaneTrajectory::path_cost(const Path &path) const
{
    float duration = 0;
    float turn = 0;
    float heading_change = 0;
    for (uint8_t i = 0; i < 3; i++) {
        duration += path.time[i];
        const float angle = path.rate[i] * path.time[i];
        turn += fabsf(angle);
        heading_change += angle;
    }
    // Charge excess turning its equivalent time at the planning rate. This
    // discourages loops without excluding a feasible turn by its angle.
    const float extra_turn = MAX(0.0f, turn - fabsf(wrap_PI(heading_change)));
    return duration + extra_turn / _omega;
}

bool AP_PlaneTrajectory::matches(uint16_t index, const Location &target) const
{
    if (!_active || index < _first_index || index > _first_index + _corners) {
        return false;
    }
    const Location &saved = _targets[index - _first_index];
    return saved.same_latlon_as(target) && saved.alt == target.alt &&
           saved.relative_alt == target.relative_alt && saved.terrain_alt == target.terrain_alt;
}

bool AP_PlaneTrajectory::heading_for_course(const Vector2f &direction, float &heading) const
{
    const float crosswind = direction.x * _wind.y - direction.y * _wind.x;
    if (fabsf(crosswind) >= _airspeed * 0.95f) {
        return false;
    }
    heading = atan2f(direction.y, direction.x) - asinf(crosswind / _airspeed);
    const Vector2f velocity = Vector2f(cosf(heading), sinf(heading)) * _airspeed + _wind;
    return velocity * direction > 2;
}

// Solve d_in*u_in + d_out*u_out = integral(V_air + wind) dt.
// These tangent distances depend on aircraft capability and wind, not waypoint radius.
bool AP_PlaneTrajectory::turn_distances(const Location &previous, const Location &corner,
                                        const Location &next, const Vector2f &wind,
                                        float airspeed, float bank_limit, float &entry, float &exit) const
{
    const Vector2f incoming = previous.get_distance_NE(corner);
    const Vector2f outgoing = corner.get_distance_NE(next);
    if (incoming.length() < 1 || outgoing.length() < 1 || airspeed < 5 ||
        !isfinite(airspeed) || !isfinite(bank_limit) || !isfinite(wind.x) || !isfinite(wind.y)) {
        return false;
    }
    const Vector2f a = incoming.normalized();
    const Vector2f b = outgoing.normalized();
    const float determinant = a.x * b.y - a.y * b.x;
    if (fabsf(determinant) < 0.01f) {
        return false;
    }
    const float cross1 = a.x * wind.y - a.y * wind.x;
    const float cross2 = b.x * wind.y - b.y * wind.x;
    if (fabsf(cross1) >= airspeed * 0.95f || fabsf(cross2) >= airspeed * 0.95f) {
        return false;
    }
    const float h1 = atan2f(a.y, a.x) - asinf(cross1 / airspeed);
    const float h2 = atan2f(b.y, b.x) - asinf(cross2 / airspeed);
    const float angle = wrap_PI(h2 - h1);
    const float omega = MIN(radians(MAX(_rate_max.get(), 1)),
                            GRAVITY_MSS * tanf(radians(constrain_float(bank_limit * 0.7f, 5, 40))) / airspeed);
    const float rate = angle > 0 ? omega : -omega;
    const Vector2f displacement = Vector2f(sinf(h2) - sinf(h1), cosf(h1) - cosf(h2)) *
                                  (airspeed / rate) + wind * (fabsf(angle) / omega);
    entry = (displacement.x * b.y - displacement.y * b.x) / determinant;
    exit = (a.x * displacement.y - a.y * displacement.x) / determinant;
    return isfinite(entry) && isfinite(exit) && entry >= 0 && exit >= 0;
}

bool AP_PlaneTrajectory::corner_times(const Path &path, const Vector2f *gates,
                                    uint8_t corners, float *times) const
{
    const float duration = path.time[0] + path.time[1] + path.time[2];
    float previous = 0;
    for (uint8_t g = 0; g < corners; g++) {
        float distance = FLT_MAX;
        float best = previous;
        // Ordered reference-corner progress determines mission handover; no radius gate.
        const float step = MAX(0.1f, duration / 400);
        for (float t = previous; t <= duration; t += step) {
            const float d = (sample(path, t).position - gates[g]).length();
            if (d < distance) {
                distance = d;
                best = t;
            }
        }
        if (best <= previous + 0.1f) {
            return false;
        }
        times[g] = best;
        previous = best;
    }
    return true;
}

bool AP_PlaneTrajectory::solve(const Vector2f &start, const Vector2f &end,
                               float start_heading, float end_heading,
                               const Vector2f *gates, uint8_t corners)
{
    float best_cost = FLT_MAX;
    const float revolution = 2 * M_PI / _omega;
    const float difference = wrap_PI(end_heading - start_heading);
    for (int8_t first = -1; first <= 1; first += 2) {
        for (int8_t last = -1; last <= 1; last += 2) {
            for (int8_t winding = -2; winding <= 2; winding++) {
                const float angle = difference + winding * 2 * M_PI;
                // Eliminate final-turn duration using the terminal heading.
                auto residual = [&](float t1, Path &p, float &value) -> bool {
                    const float t3 = (angle - first * _omega * t1) / (last * _omega);
                    if (t3 < 0 || t3 > revolution) {
                        return false;
                    }
                    p = {start, start_heading, {t1, 0, t3}, {first * _omega, 0, last * _omega}};
                    const Vector2f displacement = end - sample(p, t1 + t3).position;
                    const float h = start_heading + first * _omega * t1;
                    const Vector2f v = Vector2f(cosf(h), sinf(h)) * _airspeed + _wind;
                    value = v.x * displacement.y - v.y * displacement.x;
                    p.time[1] = (displacement * v) / v.length_squared();
                    return isfinite(value);
                };
                float low = 0;
                float old_value = 0;
                bool old_valid = false;
                for (uint8_t j = 0; j <= 64; j++) {
                    const float high = revolution * j / 64;
                    Path candidate;
                    float value = 0;
                    const bool valid = residual(high, candidate, value);
                    if (valid && old_valid && value * old_value <= 0) {
                        float a = low;
                        float b = high;
                        float fa = old_value;
                        for (uint8_t k = 0; k < 18; k++) {
                            const float mid = (a + b) * 0.5f;
                            float fm = 0;
                            if (!residual(mid, candidate, fm)) {
                                break;
                            }
                            if (fm * fa <= 0) {
                                b = mid;
                            } else {
                                a = mid;
                                fa = fm;
                            }
                        }
                        float final_residual = 0;
                        if (residual((a + b) * 0.5f, candidate, final_residual)) {
                            const float duration = candidate.time[0] + candidate.time[1] + candidate.time[2];
                            const float cost = path_cost(candidate);
                            float times[3]{};
                            if (candidate.time[1] >= 0 && cost < best_cost && duration < 120 &&
                                (sample(candidate, duration).position - end).length() < 0.5f &&
                                corner_times(candidate, gates, corners, times)) {
                                _path = candidate;
                                best_cost = cost;
                                memcpy(_corner_time, times, sizeof(times));
                            }
                        }
                    }
                    low = high;
                    old_value = value;
                    old_valid = valid;
                }
            }
        }
    }
    return best_cost < FLT_MAX;
}

bool AP_PlaneTrajectory::plan(const Location *points, uint8_t corners,
                              uint16_t first_index, const Vector2f &wind, float airspeed, float bank_limit)
{
    reset();
    _last_index = first_index;
    if (corners < 1 || corners > 3 || !isfinite(airspeed) || airspeed < 5 ||
        !isfinite(bank_limit) || !isfinite(wind.x) || !isfinite(wind.y) || wind.length() > airspeed * 0.85f) {
        return false;
    }
    _origin = points[1];
    _wind = wind;
    _airspeed = airspeed;
    _omega = MIN(radians(MAX(_rate_max.get(), 1)),
                 GRAVITY_MSS * tanf(radians(constrain_float(bank_limit * 0.7f, 5, 40))) / airspeed);
    const float radius = airspeed / _omega;
    const Vector2f incoming = points[0].get_distance_NE(points[1]);
    const Vector2f outgoing = points[corners].get_distance_NE(points[corners + 1]);
    if (incoming.length() < 20 || outgoing.length() < 20) {
        return false;
    }
    const Vector2f in_dir = incoming.normalized();
    const Vector2f out_dir = outgoing.normalized();
    float h1 = 0;
    float h2 = 0;
    if (!heading_for_course(in_dir, h1) || !heading_for_course(out_dir, h2)) {
        return false;
    }
    for (uint8_t g = 0; g < corners; g++) {
        _corner_position[g] = _origin.get_distance_NE(points[g + 1]);
    }
    const float margin = airspeed * constrain_float(_margin.get(), 0, 5);
    // Wind makes entry and exit transition distances asymmetric. Compare
    // candidates over equivalent surrounding legs, rather than favouring
    // shorter boundaries or the first feasible pair.
    const float in_speed = (Vector2f(cosf(h1), sinf(h1)) * airspeed + wind) * in_dir;
    const float out_speed = (Vector2f(cosf(h2), sinf(h2)) * airspeed + wind) * out_dir;
    float first_entry = radius;
    float first_exit = radius;
    float last_entry = radius;
    float last_exit = radius;
    const bool single_tangent = turn_distances(points[0], points[1], points[2], wind, airspeed,
                                              bank_limit, first_entry, first_exit);
    turn_distances(points[corners - 1], points[corners], points[corners + 1], wind, airspeed,
                   bank_limit, last_entry, last_exit);
    if (corners == 1 && single_tangent && first_entry + margin < incoming.length() &&
        first_exit + margin < outgoing.length()) {
        // Exact line-to-line trochoid, with straight allowances for bank response.
        const float angle = wrap_PI(h2 - h1);
        _path = {-in_dir * (first_entry + margin), h1,
                 {margin / in_speed, fabsf(angle) / _omega, margin / out_speed},
                 {0, angle > 0 ? _omega : -_omega, 0}};
        if (!corner_times(_path, _corner_position, corners, _corner_time)) {
            return false;
        }
    } else {
        float best_cost = FLT_MAX;
        Path best_path{};
        float best_times[3]{};
        // Overlapping turns connect the outer lines of a corner group.
        // Boundaries scale with tangent geometry, never acceptance radius.
        for (uint8_t entry = 0; entry < 4; entry++) {
            const float in_offset = MIN(first_entry * (0.75f + entry * 0.5f) + margin,
                                        incoming.length() - 10);
            for (uint8_t exit = 0; exit < 4; exit++) {
                const float out_offset = MIN(last_exit * (0.75f + exit * 0.5f) + margin,
                                             outgoing.length() - 10);
                const Vector2f start = -in_dir * in_offset;
                const Vector2f end = _corner_position[corners - 1] + out_dir * out_offset;
                if (!solve(start, end, h1, h2, _corner_position, corners)) {
                    continue;
                }
                const float cost = path_cost(_path) -
                                   in_offset / in_speed - out_offset / out_speed;
                if (cost < best_cost) {
                    best_cost = cost;
                    best_path = _path;
                    memcpy(best_times, _corner_time, sizeof(best_times));
                }
            }
        }
        if (!(best_cost < FLT_MAX)) {
            return false;
        }
        _path = best_path;
        memcpy(_corner_time, best_times, sizeof(best_times));
    }
    _tracking_limit = MAX(100.0f, radius * 2);
    for (uint8_t i = 0; i <= corners; i++) {
        _targets[i] = points[i + 1];
    }
    _first_index = first_index;
    _corners = corners;
    _progress = 0;
    _active = true;
    return true;
}

bool AP_PlaneTrajectory::update(const Location &position, const Vector2f &velocity,
                                uint16_t index, float &bank_cd, bool &complete)
{
    complete = false;
    if (!_active || index < _first_index || index > _first_index + _corners || !isfinite(velocity.x) ||
        !isfinite(velocity.y) || velocity.length() < 3) {
        _active = false;
        return false;
    }
    const Vector2f pos = _origin.get_distance_NE(position);
    const Vector2f entry_direction = sample(_path, 0).velocity.normalized();
    const float entry_along = (pos - _path.start) * entry_direction;
    const float entry_lead = _airspeed * constrain_float(_margin.get(), 0, 5);
    if (is_zero(_progress) && entry_along < -entry_lead) {
        _tracking = false;
        return false;
    }
    _tracking = true;
    const float duration = _path.time[0] + _path.time[1] + _path.time[2];
    float best_distance = FLT_MAX;
    float nearest = _progress;
    // Monotone bounded projection prevents jumping across crossing paths.
    for (float t = MAX(0, _progress - 0.3f); t <= MIN(duration, _progress + 5); t += 0.05f) {
        const float d = (sample(_path, t).position - pos).length_squared();
        if (d < best_distance) {
            best_distance = d;
            nearest = t;
        }
    }
    _progress = MAX(_progress, nearest);
    const State s = sample(_path, _progress);
    const Vector2f direction = s.velocity.normalized();
    const Vector2f error = pos - s.position;
    const float cross = direction.x * error.y - direction.y * error.x;
    const float course_error = wrap_PI(atan2f(s.velocity.y, s.velocity.x) - atan2f(velocity.y, velocity.x));
    _xtrack = cross;
    _nav_bearing_cd = wrap_180_cd(degrees(atan2f(s.velocity.y, s.velocity.x)) * 100);
    const float frequency = 2 * M_PI / constrain_float(_period.get(), 3, 20);
    const float correction = -sq(frequency) * cross + 1.8f * frequency * velocity.length() * sinf(course_error);
    const Vector2f air_dir(cosf(s.heading), sinf(s.heading));
    const float projection = MAX(0.3f, air_dir * direction);
    // Preview the rate transition to compensate normal Plane bank-response lag.
    const float preview_rate = ((_progress + 0.3f >= duration ? 0 : sample(_path, _progress + 0.3f).rate) +
                                (_progress + 0.8f >= duration ? 0 : sample(_path, _progress + 0.8f).rate)) * 0.5f;
    const float entry_scale = entry_lead > 0 && is_zero(_progress) ?
        constrain_float((entry_along + entry_lead) / entry_lead, 0, 1) : 1;
    const float heading_rate = preview_rate * entry_scale + correction / (_airspeed * projection);
    _bank_cd = degrees(atanf(_airspeed * heading_rate / GRAVITY_MSS)) * 100;
    bank_cd = _bank_cd;
    const uint8_t gate = index - _first_index;
    complete = gate < _corners && _progress >= _corner_time[gate];
    // An untracked path must not trap the mission indefinitely; reacquire using L1.
    if (best_distance > sq(_tracking_limit) || _progress >= duration - 0.1f) {
        _active = false;
        return false;
    }
#if HAL_LOGGING_ENABLED
    // @LoggerMessage: NTP
    // @Description: Experimental waypoint trajectory tracking
    // @Field: TimeUS: Time since system startup
    // @Field: Index: Active mission waypoint index
    // @Field: Count: Number of corners in this transition
    // @Field: Prog: Projected trajectory time in seconds
    // @Field: End: Total trajectory time in seconds
    // @Field: XTrack: Signed cross-track error in metres
    // @Field: Rate: Planned heading rate in degrees per second
    // @Field: Roll: Requested bank in degrees
    AP::logger().WriteStreaming("NTP", "TimeUS,Index,Count,Prog,End,XTrack,Rate,Roll", "QHBfffff",
                               AP_HAL::micros64(), index, _corners, _progress, duration, cross, degrees(preview_rate), _bank_cd * 0.01f);
#endif
    return true;
}
#endif // AP_PLANE_TRAJECTORY_ENABLED
