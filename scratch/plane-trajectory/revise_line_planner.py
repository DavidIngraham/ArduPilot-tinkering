from pathlib import Path
p=Path('ArduPlane/PlaneTrajectory.cpp');s=p.read_text()
# Wind-aware tangent distances for one constant-rate turn between two ground lines.
idx=s.index('bool AP_PlaneTrajectory::check_gates')
helper='''// Solve d_in*u_in + d_out*u_out = integral(V_air + wind) dt.
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

'''
s=s[:idx]+helper+s[idx:]
s=s.replace('const float *radii, uint8_t corners, float *times','uint8_t corners, float *times')
s=s.replace('// Bound work and keep spatial sampling finer than half the gate radius.','// Ordered reference-corner progress determines mission handover; no radius gate.')
s=s.replace('distance > radii[g] * 0.85f || best <= previous + 0.1f','best <= previous + 0.1f')
s=s.replace('const Vector2f *gates, const float *radii, uint8_t corners','const Vector2f *gates, uint8_t corners')
s=s.replace('check_gates(candidate, gates, radii, corners, times)','check_gates(candidate, gates, corners, times)')
s=s.replace('const Location *points, const float *radii, uint8_t corners','const Location *points, uint8_t corners')
a=s.index('    for (uint8_t i = 0; i < corners; i++) {\n        if (!isfinite(radii');b=s.index('    _origin',a);s=s[:a]+s[b:]
s=s.replace('        _radii[g] = radii[g];\n','')
a=s.index('    float best_cost = FLT_MAX;');b=s.index('    for (uint8_t i = 0; i <= corners; i++)',a)
new='''    float first_entry = radius;
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
        if (!check_gates(_path, _gates, corners, _gate_time)) {
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
                const Vector2f end = _gates[corners - 1] + out_dir * out_offset;
                if (!solve(start, end, h1, h2, _gates, corners)) {
                    continue;
                }
                const float cost = _path.time[0] + _path.time[1] + _path.time[2] -
                                   in_offset / in_speed - out_offset / out_speed;
                if (cost < best_cost) {
                    best_cost = cost;
                    best_path = _path;
                    memcpy(best_times, _gate_time, sizeof(best_times));
                }
            }
        }
        if (!(best_cost < FLT_MAX)) {
            return false;
        }
        _path = best_path;
        memcpy(_gate_time, best_times, sizeof(best_times));
    }
    _tracking_limit = MAX(100.0f, radius * 2);
'''
s=s[:a]+new+s[b:]
s=s.replace('complete = gate < _corners && _progress >= _gate_time[gate] - 0.3f &&\n               (pos - _gates[gate]).length() <= _radii[gate];','complete = gate < _corners && _progress >= _gate_time[gate];')
s=s.replace('sq(MAX(100.0f, _radii[MIN(gate, uint8_t(_corners - 1))] * 2))','sq(_tracking_limit)')
p.write_text(s)
p=Path('ArduPlane/PlaneTrajectory.h');s=p.read_text().replace('const Location *points, const float *radii, uint8_t corners','const Location *points, uint8_t corners').replace('const Vector2f *gates, const float *radii, uint8_t corners','const Vector2f *gates, uint8_t corners').replace('const float *radii, uint8_t corners, float *times','uint8_t corners, float *times').replace('    float _radii[3]{};','    float _tracking_limit = 100;');s=s.replace('    bool update(const Location &position,','    bool turn_distances(const Location &previous, const Location &corner, const Location &next,\n                        const Vector2f &wind, float airspeed, float bank_limit, float &entry, float &exit) const;\n    bool update(const Location &position,');p.write_text(s)
p=Path('ArduPlane/navigation.cpp');s=p.read_text();s=s.replace('    float radii[3]{};\n    radii[0] = LOWBYTE(cmd.p1) > 0 ? LOWBYTE(cmd.p1) : get_wp_radius();\n','');s=s.replace('        if (i < 3) {\n            radii[i] = LOWBYTE(next.p1) > 0 ? LOWBYTE(next.p1) : get_wp_radius();\n        }\n','');a=s.index('        const float before =',s.index('bool Plane::update_waypoint_trajectory'));b=s.index('        if (points[corners]',a);s=s[:a]+'''        float entry = 0;
        float exit = 0;
        float next_entry = 0;
        float next_exit = 0;
        const Vector2f horizontal_wind(wind.x, wind.y);
        if (!trajectory.turn_distances(points[corners - 1], points[corners], points[corners + 1],
                                       horizontal_wind, true_airspeed, roll_limit_cd * 0.01f, entry, exit) ||
            !trajectory.turn_distances(points[corners], points[corners + 1], points[corners + 2],
                                       horizontal_wind, true_airspeed, roll_limit_cd * 0.01f, next_entry, next_exit)) {
            break;
        }
        const float needed = exit + next_entry + true_airspeed * 3;
'''+s[b:];a=s.index('    for (uint8_t i = 0; i < corners; i++)',s.index('bool Plane::update_waypoint_trajectory'));b=s.index('    if (!trajectory.plan',a);s=s[:a]+s[b:];s=s.replace('trajectory.plan(points, radii, corners','trajectory.plan(points, corners');p.write_text(s)
p=Path('ArduPlane/tests/test_plane_trajectory.cpp');s=p.read_text();import re
s=re.sub(r'    const float radii\[\]\{[^;]+;\n','',s);s=s.replace('planner.plan(points, radii,','planner.plan(points,');a=s.index('            EXPECT_LE(');b=s.index('            if (i > 0)',a);s=s[:a]+s[b:];p.write_text(s)
