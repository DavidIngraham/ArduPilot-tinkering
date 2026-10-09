#pragma once

#include <AP_HAL/AP_HAL_Boards.h>
#ifndef AP_PLANE_TRAJECTORY_ENABLED
#define AP_PLANE_TRAJECTORY_ENABLED (CONFIG_HAL_BOARD == HAL_BOARD_SITL)
#endif

#if AP_PLANE_TRAJECTORY_ENABLED
#include <AP_Param/AP_Param.h>
#include <AP_Common/Location.h>
#include <AP_Math/AP_Math.h>

// Experimental, bounded-work wind-aware waypoint transition planner.
class AP_PlaneTrajectory {
public:
    AP_PlaneTrajectory();
    static const AP_Param::GroupInfo var_info[];
    bool enabled() const { return _enable.get() != 0; }
    bool active() const { return _active && _tracking; }
    bool matches(uint16_t index, const Location &target) const;
    bool planned() const { return _active; }
    // The outgoing target is a boundary, never a rounded corner.
    bool exit_target(uint16_t index) const { return _active && index == _first_index + _corners; }
    void reset() { _active = false; _tracking = false; _last_index = 0; }
    // points: previous waypoint, up to three corners, subsequent waypoint.
    bool plan(const Location *points, uint8_t corners,
              uint16_t first_index, const Vector2f &wind, float airspeed, float bank_limit);
    bool turn_distances(const Location &previous, const Location &corner, const Location &next,
                        const Vector2f &wind, float airspeed, float bank_limit, float &entry, float &exit) const;
    bool update(const Location &position, const Vector2f &velocity, uint16_t index,
                float &bank_cd, bool &complete);
    bool attempted(uint16_t index) const { return _last_index == index; }
    float bank_cd() const { return _bank_cd; }
    float crosstrack_error_m() const { return _xtrack; }
    int32_t nav_bearing_cd() const { return _nav_bearing_cd; }
private:
    friend class PlaneTrajectoryTest;
    struct Path {
        Vector2f start;
        float heading;
        float time[3];
        float rate[3];
    };
    struct State {
        Vector2f position;
        Vector2f velocity;
        float heading;
        float rate;
    };
    State sample(const Path &path, float t) const;
    float path_cost(const Path &path) const;
    bool heading_for_course(const Vector2f &direction, float &heading) const;
    bool solve(const Vector2f &start, const Vector2f &end, float start_heading,
               float end_heading, const Vector2f *gates, uint8_t corners);
    bool corner_times(const Path &path, const Vector2f *gates,
                     uint8_t corners, float *times) const;
    AP_Int8 _enable;
    AP_Float _rate_max;
    AP_Float _period;
    AP_Float _margin;
    Location _origin;
    Location _targets[4]{};
    Vector2f _wind;
    float _airspeed = 0;
    float _omega = 0;
    Path _path{};
    float _corner_time[3]{};
    Vector2f _corner_position[3]{};
    float _tracking_limit = 100;
    uint16_t _first_index = 0;
    uint16_t _last_index = 0;
    uint8_t _corners = 0;
    float _progress = 0;
    float _bank_cd = 0;
    float _xtrack = 0;
    int32_t _nav_bearing_cd = 0;
    bool _active = false;
    bool _tracking = false;
};
#endif // AP_PLANE_TRAJECTORY_ENABLED
