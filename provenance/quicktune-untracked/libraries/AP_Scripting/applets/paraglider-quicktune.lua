-- Paraglider bank-response and optional L1 QuickTune (experimental).
-- Observes pilot bank steps in FBWA/FBWB and a repeated AUTO course.
-- Never overrides flight controls or mission progression.
-- Plane AUTOTUNE supplies controller conventions; Lua QuickTune supplies the
-- temporary-parameter, abort/tune/save and protected-update structure.

local KEY, PREFIX = 97, 'PGT_'
local function bind(name)
    local p = Parameter()
    assert(p:init(name), 'PGTune: missing ' .. name)
    return p
end
assert(param:add_table(KEY, PREFIX, 16), 'PGTune: parameter table collision')
local function add(name, index, value)
    assert(param:add_param(KEY, index, name, value), 'PGTune: add ' .. name)
    return bind(PREFIX .. name)
end
--[[
  // @Param: PGT_ENABLE
  // @DisplayName: Paraglider QuickTune enable
  // @Description: Enable experimental paraglider bank-response tuning
  // @Values: 0:Disabled,1:Enabled
  // @User: Advanced
--]]
local ENABLE = add('ENABLE', 1, 0)
--[[
  // @Param: PGT_RC_FUNC
  // @DisplayName: Paraglider QuickTune switch function
  // @Description: Auxiliary scripting switch: low abort, middle tune, high save
  // @Values: 300:Scripting1,301:Scripting2,302:Scripting3,303:Scripting4
  // @User: Advanced
--]]
local RC_FUNC = add('RC_FUNC', 2, 300)
--[[
  // @Param: PGT_MIN_ALT
  // @DisplayName: Paraglider QuickTune minimum altitude
  // @Description: Minimum altitude above home for tuning
  // @Units: m
  // @Range: 20 100
  // @User: Advanced
--]]
local MIN_ALT = add('MIN_ALT', 3, 30)
--[[
  // @Param: PGT_MAX_BANK
  // @DisplayName: Paraglider QuickTune maximum bank
  // @Description: Maximum absolute demanded or measured bank during tuning
  // @Units: deg
  // @Range: 10 30
  // @User: Advanced
--]]
local MAX_BANK = add('MAX_BANK', 4, 25)
--[[
  // @Param: PGT_HOLD
  // @DisplayName: Paraglider QuickTune minimum step duration
  // @Description: Minimum duration of each constant bank step
  // @Units: s
  // @Range: 6 20
  // @User: Advanced
--]]
local HOLD = add('HOLD', 5, 8)
--[[
  // @Param: PGT_TAIL
  // @DisplayName: Paraglider QuickTune recovery duration
  // @Description: Observation duration after return to level
  // @Units: s
  // @Range: 6 20
  // @User: Advanced
--]]
local TAIL = add('TAIL', 6, 8)
--[[
  // @Param: PGT_PAIRS
  // @DisplayName: Paraglider QuickTune pairs per candidate
  // @Description: Number of left/right step pairs per candidate
  // @Range: 2 5
  // @User: Advanced
--]]
local PAIRS = add('PAIRS', 7, 2)
--[[
  // @Param: PGT_STATUS
  // @DisplayName: Paraglider QuickTune session status
  // @Description: Script-owned session status; do not write
  // @Values: 0:Idle,1:Tuning,2:AwaitingSave,3:Saved,4:Aborted,5:AwaitingCourse,6:NavigationTuning,7:AwaitingAUTO
  // @User: Advanced
--]]
local STATUS = add('STATUS', 8, 0)
--[[
  // @Param: PGT_CAND
  // @DisplayName: Paraglider QuickTune candidate number
  // @Description: Script-owned candidate counter
  // @User: Advanced
--]]
local CAND = add('CAND', 9, 0)
--[[
  // @Param: PGT_EVENTS
  // @DisplayName: Paraglider QuickTune accepted events
  // @Description: Script-owned accepted event counter
  // @User: Advanced
--]]
local EVENTS = add('EVENTS', 10, 0)
--[[
  // @Param: PGT_SCORE
  // @DisplayName: Paraglider QuickTune response score
  // @Description: Script-owned latest worst-direction response score
  // @User: Advanced
--]]
local SCORE = add('SCORE', 11, 0)
--[[
  // @Param: PGT_FF_STEP
  // @DisplayName: Paraglider QuickTune feedforward search step
  // @Description: Fractional FF search step; second pass uses half this value
  // @Range: 0.05 0.3
  // @User: Advanced
--]]
local FF_STEP = add('FF_STEP', 12, 0.2)
--[[
  // @Param: PGT_MARGIN
  // @DisplayName: Paraglider QuickTune improvement margin
  // @Description: Minimum fractional score improvement for accepting and validating gains
  // @Range: 0.005 0.05
  // @User: Advanced
--]]
local MARGIN = add('MARGIN', 13, 0.03)
--[[
  // @Param: PGT_L1
  // @DisplayName: Paraglider navigation tuning
  // @Description: After steering validation, tune L1 on a repeated waypoint course in AUTO. Operator restarts the same course for each candidate.
  // @Values: 0:Disabled,1:Enabled
  // @User: Advanced
--]]
local L1 = add('L1', 14, 0)
--[[
  // @Param: PGT_NAV_END
  // @DisplayName: Paraglider tuning course final waypoint
  // @Description: Last waypoint index of the tuning course. The first two waypoints establish course entry and are unscored. The following item must be unlimited loiter. Use opposing turns and fixed altitude.
  // @Range: 5 20
  // @User: Advanced
--]]
local NAV_END = add('NAV_END', 15, 8)
--[[
  // @Param: PGT_REJECTS
  // @DisplayName: Paraglider QuickTune rejected candidates
  // @Description: Script-owned count of steering candidates rejected for insufficient settled observations
  // @User: Advanced
--]]
local REJECTS = add('REJECTS', 16, 0)
local DAMPING, PERIOD = bind('NAVL1_DAMPING'), bind('NAVL1_PERIOD')
local FF, DFF = bind('RLL_RATE_FF'), bind('RLL_RATE_D_FF')
local PG_ENABLE = bind('TECS_PG_ENABLE')
local RATE_P, RATE_I, RATE_D = bind('RLL_RATE_P'), bind('RLL_RATE_I'), bind('RLL_RATE_D')
local function now() return millis():tofloat() * 0.001 end
local function clamp(x, lo, hi) return math.max(lo, math.min(hi, x)) end
local function finite(x) return x ~= nil and x == x and math.abs(x) < math.huge end
local function report(text) gcs:send_text(5, 'PGTune: ' .. text) end
local session, event, stable_since, faulted
local saved = {}
local function restore()
    if session then
        assert(FF:set(saved.ff) and DFF:set(saved.dff) and
               DAMPING:set(saved.damping) and PERIOD:set(saved.period), 'restore failed')
    end
end
local function abort(reason)
    restore()
    session, event, stable_since = nil, nil, nil
    STATUS:set(4)
    faulted = true -- require switch low before another session
    report('aborted: ' .. reason)
end
local function apply_candidate()
    local g = session
    local f, h = g.center_ff, g.center_dff
    local direction = ({0, -1, 1})[g.trial]
    if g.stage <= 4 then
        local scale = g.stage <= 2 and 1 or 0.5
        if g.stage % 2 == 1 then
            f = clamp(f * (1 + direction * FF_STEP:get() * scale), 0.25, 2)
        else
            h = clamp(h + direction * 0.025 * scale, 0, 0.25)
        end
    end
    assert(FF:set(f) and DFF:set(h), 'candidate write failed')
    g.left, g.right = {}, {}
    g.current_ff, g.current_dff, g.candidate_start = f, h, now()
    event, stable_since = nil, nil
    CAND:set(CAND:get() + 1)
    report(string.format('candidate %d FF %.4f DFF %.4f', CAND:get(), f, h))
end
local function start()
    assert(PG_ENABLE:get() == 1, 'paraglider TECS disabled')
    assert(RATE_P:get() == 0 and RATE_I:get() == 0 and RATE_D:get() == 0,
           'first version requires zero rate PID gains')
    assert(FF:get() >= 0.25 and FF:get() <= 2 and DFF:get() >= 0 and DFF:get() <= 0.25,
           'starting gains outside search bounds')
    assert(HOLD:get() >= 6 and HOLD:get() <= 20 and TAIL:get() >= 6 and TAIL:get() <= 20,
           'invalid observation duration')
    assert(PAIRS:get() >= 2 and PAIRS:get() <= 5 and PAIRS:get() % 1 == 0, 'invalid pair count')
    assert(FF_STEP:get() >= 0.05 and FF_STEP:get() <= 0.3, 'invalid FF step')
    assert(MARGIN:get() >= 0.005 and MARGIN:get() <= 0.05, 'invalid improvement margin')
    saved = {ff=FF:get(), dff=DFF:get(), damping=DAMPING:get(), period=PERIOD:get()}
    session = {stage=1, trial=1, center_ff=saved.ff, center_dff=saved.dff}
    STATUS:set(1)
    CAND:set(0)
    EVENTS:set(0)
    REJECTS:set(0)
    apply_candidate()
end
local function advance_trial()
    local g = session
    g.trial = g.trial + 1
    if g.trial == 4 then
        g.center_ff, g.center_dff = g.best_ff, g.best_dff
        g.stage, g.trial = g.stage + 1, 1
    end
end
local function reject_candidate()
    local g = session
    if g.trial == 1 or g.stage == 5 then
        abort('baseline or validation did not settle')
        return
    end
    logger:write('PGTR', 'Cand,Stage,FF,DFF', 'BBff', CAND:get(), g.stage,
                 g.current_ff, g.current_dff)
    REJECTS:set(REJECTS:get() + 1)
    report(string.format('candidate %d rejected: no settled pairs', CAND:get()))
    assert(FF:set(g.best_ff) and DFF:set(g.best_dff), 'candidate recovery failed')
    event, stable_since = nil, nil
    advance_trial()
    -- Recover on the best measured gains before trying another candidate.
    g.pending_candidate, g.recovery_start = true, now()
end
local function average(values)
    local sum = 0
    for _, x in ipairs(values) do sum = sum + x end
    return sum / #values
end
local function nav_candidate()
    local g = session
    local direction = ({0, -1, 1})[g.nav_trial]
    local damping, period = g.center_damping, g.center_period
    if g.nav_stage == 1 then damping = clamp(damping + direction * 0.1, 0.6, 1.0) end
    if g.nav_stage == 2 then period = clamp(period * (1 + direction * 0.15), 6, 25) end
    assert(DAMPING:set(damping) and PERIOD:set(period), 'L1 candidate write failed')
    g.nav_legs, g.nav_seq, g.nav_started, g.saturation = {}, nil, nil, nil
    g.nav_damping, g.nav_period = damping, period
    CAND:set(CAND:get() + 1)
    STATUS:set(5)
    report(string.format('L1 candidate %d damping %.3f period %.3f; restart course', CAND:get(), damping, period))
end
local function start_navigation()
    local last = NAV_END:get()
    assert(last >= 5 and last <= 20 and last % 1 == 0, 'invalid course length')
    assert(DAMPING:get() >= 0.6 and DAMPING:get() <= 1.0 and
           PERIOD:get() >= 6 and PERIOD:get() <= 25, 'L1 outside search bounds')
    for index = 1, last do
        local item = mission:get_item(index)
        assert(item and item:command() == 16, 'course must contain only waypoints')
    end
    local final = mission:get_item(last + 1)
    assert(final and final:command() == 17, 'course must end in unlimited loiter')
    local g = session
    g.nav_stage, g.nav_trial, g.nav_end = 1, 1, last
    g.center_damping, g.center_period = saved.damping, saved.period
    nav_candidate()
end
local function navigation_update()
    local g, t = session, now()
    if vehicle:get_mode() ~= 10 then abort('navigation requires AUTO'); return end
    local loc, home = ahrs:get_location(), ahrs:get_home()
    if not loc or not home or not arming:is_armed() or not rc:has_valid_input() or
       vehicle:has_ekf_failsafed() or battery:has_failsafed() or PG_ENABLE:get() ~= 1 then
        abort('navigation flight conditions'); return
    end
    local altitude = (loc:alt() - home:alt()) * 0.01
    local roll = math.deg(ahrs:get_roll_rad())
    if not finite(altitude) or not finite(roll) or altitude < MIN_ALT:get() or altitude > 120 or
       math.abs(roll) > MAX_BANK:get() then abort('navigation envelope'); return end
    local seq = mission:get_current_nav_index()
    if STATUS:get() == 5 then
        if seq ~= 1 then return end
        g.nav_started, g.nav_seq, g.nav_entry = t, seq, t
        STATUS:set(6)
    end
    if t - g.nav_started > 900 then abort('course timeout'); return end
    if seq ~= g.nav_seq then
        if seq ~= g.nav_seq + 1 then abort('course progression'); return end
        g.nav_seq, g.nav_entry = seq, t
    end
    if seq > g.nav_end then
        local worst = 0
        for index = 3, g.nav_end do
            local leg = g.nav_legs[index]
            if not leg or leg.n < 20 then abort('insufficient course samples'); return end
            local leg_score = leg.x2 / leg.n / 40^2 + 0.1 * leg.u2 / leg.n
            logger:write('PGTL', 'Cand,Leg,RMS,Effort,Score', 'BBfff', CAND:get(), index,
                         math.sqrt(leg.x2 / leg.n), leg.u2 / leg.n, leg_score)
            worst = math.max(worst, leg_score)
        end
        SCORE:set(worst)
        logger:write('PGTN', 'Cand,Stage,Damp,Period,Score', 'BBfff', CAND:get(), g.nav_stage,
                     g.nav_damping, g.nav_period, worst)
        if g.nav_stage == 3 then
            if worst > g.nav_original * (1 - MARGIN:get()) then
                DAMPING:set(saved.damping); PERIOD:set(saved.period)
                report('L1 validation failed; original L1 retained')
            else report('L1 independently validated') end
            STATUS:set(2)
            return
        end
        if g.nav_trial == 1 then
            g.nav_best, g.best_damping, g.best_period = worst, g.nav_damping, g.nav_period
            if g.nav_stage == 1 then g.nav_original = worst end
        elseif worst < g.nav_best * (1 - MARGIN:get()) then
            g.nav_best, g.best_damping, g.best_period = worst, g.nav_damping, g.nav_period
        end
        g.nav_trial = g.nav_trial + 1
        if g.nav_trial == 4 then
            g.center_damping, g.center_period = g.best_damping, g.best_period
            g.nav_stage, g.nav_trial = g.nav_stage + 1, 1
        end
        nav_candidate()
        return
    end
    local x = vehicle:get_wp_crosstrack_error_m()
    local left, right = SRV_Channels:get_output_scaled(190), SRV_Channels:get_output_scaled(191)
    if not finite(x) or not finite(left) or not finite(right) then abort('invalid navigation sample'); return end
    if math.max(left, right) > 95 then
        g.saturation = g.saturation or t
        if t - g.saturation > 3 then abort('sustained brake saturation'); return end
    else g.saturation = nil end
    -- Include corner recovery after a short command transition exclusion.
    if seq >= 3 and t - g.nav_entry >= 2 then
        local leg = g.nav_legs[seq] or {n=0, x2=0, u2=0}
        leg.n, leg.x2, leg.u2 = leg.n + 1, leg.x2 + x*x, leg.u2 + ((left-right)/100)^2
        g.nav_legs[seq] = leg
    end
end
local function finish_candidate()
    local g = session
    local score = math.max(average(g.left), average(g.right))
    SCORE:set(score)
    logger:write('PGTC', 'Cand,Stage,FF,DFF,Score', 'BBfff', CAND:get(), g.stage,
                 g.current_ff, g.current_dff, score)
    if g.stage == 5 then
        -- Fresh paired events must confirm the original-baseline improvement.
        if score > g.original_score * (1 - MARGIN:get()) then
            FF:set(saved.ff)
            DFF:set(saved.dff)
            report('validation did not confirm improvement; original gains retained')
        else
            report(string.format('validated FF %.4f DFF %.4f score %.3f -> %.3f',
                                  FF:get(), DFF:get(), g.original_score, score))
        end
        STATUS:set(L1:get() == 1 and 7 or 2)
        event = nil
        return
    end
    if g.trial == 1 then
        g.best_score, g.best_ff, g.best_dff = score, g.current_ff, g.current_dff
        if g.stage == 1 then g.original_score = score end
    elseif score < g.best_score * (1 - MARGIN:get()) then
        g.best_score, g.best_ff, g.best_dff = score, g.current_ff, g.current_dff
    end
    advance_trial()
    apply_candidate()
end
local function finish_event()
    local e, g = event, session
    local tail_variance = math.max(0, e.r2 / e.tail_n - (e.r / e.tail_n)^2)
    -- Fixed dimensionless weights, common to every candidate and direction.
    local score = e.err2 / e.n + (e.overshoot / e.amplitude)^2 +
                  0.2 * (e.settle or e.hold_duration) / e.hold_duration +
                  0.5 * tail_variance / 100 + 0.1 * e.brake2 / e.n
    local values = e.sign > 0 and g.right or g.left
    table.insert(values, score)
    EVENTS:set(EVENTS:get() + 1)
    logger:write('PGTE', 'Cand,Dir,Score,Over,Settle,YawVar', 'Bbffff',
                 CAND:get(), e.sign, score, e.overshoot, e.settle or e.hold_duration, tail_variance)
    event, stable_since = nil, nil
    if #g.left >= PAIRS:get() and #g.right >= PAIRS:get() then finish_candidate() end
end
local function update()
    local sw = rc:get_aux_cached(RC_FUNC:get())
    if sw == 0 then
        if session then restore(); report('original gains restored') end
        session, event, stable_since, faulted = nil, nil, nil, false
        STATUS:set(0)
        return
    end
    if ENABLE:get() ~= 1 then
        if session then abort('disabled') end
        return
    end
    if sw == nil then
        if session then abort('switch unavailable') end
        return
    end
    if faulted then return end
    if sw == 2 then
        if session and STATUS:get() == 2 then
            assert(FF:set_and_save(FF:get()) and DFF:set_and_save(DFF:get()) and
                   DAMPING:set_and_save(DAMPING:get()) and PERIOD:set_and_save(PERIOD:get()), 'save failed')
            saved.ff, saved.dff = FF:get(), DFF:get()
            session = nil
            STATUS:set(3)
            report('gains saved')
        end
        return
    end
    if sw ~= 1 then return end
    if session and STATUS:get() == 7 then
        local mode = vehicle:get_mode()
        if mode ~= 5 and mode ~= 6 and mode ~= 10 then abort('awaiting AUTO flight mode'); return end
        if not arming:is_armed() then abort('disarmed while awaiting AUTO'); return end
        if mode == 10 then start_navigation() end
        return
    end
    if session and session.nav_stage and STATUS:get() ~= 2 then navigation_update(); return end
    if session and STATUS:get() == 2 then return end
    local bank, err, target, actual, ff, p, i, d, dff, scaler, eas2tas = vehicle:get_paraglider_roll_info()
    local loc = ahrs:get_location()
    local valid = arming:is_armed() and rc:has_valid_input() and not vehicle:has_ekf_failsafed() and
                  not battery:has_failsafed() and loc and bank and PG_ENABLE:get() == 1
    if not valid then
        if session then abort('flight conditions') end
        return
    end
    local altitude = (loc:alt() - ahrs:get_home():alt()) * 0.01
    local roll = math.deg(ahrs:get_roll_rad())
    local yaw_rate = math.deg(ahrs:get_gyro():z())
    local u = ff + p + i + d + dff
    for _, x in ipairs({bank, err, target, actual, u, scaler, eas2tas, roll, yaw_rate, altitude}) do
        if not finite(x) then if session then abort('invalid sample') end; return end
    end
    if altitude < math.max(20, MIN_ALT:get()) or math.abs(roll) > math.min(30, MAX_BANK:get()) or
       math.abs(bank) > math.min(30, MAX_BANK:get()) or RATE_P:get() ~= 0 or RATE_I:get() ~= 0 or RATE_D:get() ~= 0 then
        if session then abort('flight envelope or controller changed') end
        return
    end
    if not session then
        if math.abs(bank) > 2 or math.abs(roll) > 3 or math.abs(actual) > 3 then return end
        start()
    end
    if STATUS:get() ~= 1 then return end
    logger:write('PGTS', 'Cand,Bank,Roll,P,R,U,Target,FOut,HOut,Scale,Eas2Tas', 'Bffffffffff',
                 CAND:get(), bank, roll, actual, yaw_rate, u, target, ff, dff, scaler, eas2tas)
    local t = now()
    if session.pending_candidate then
        if t - session.recovery_start > 60 then abort('candidate recovery timeout'); return end
        if math.abs(bank) < 2 and math.abs(roll) < 3 and math.abs(actual) < 3 then
            stable_since = stable_since or t
            if t - stable_since >= 2 then
                session.pending_candidate = nil
                apply_candidate()
            end
        else stable_since = nil end
        return
    end
    local budget = 2 * PAIRS:get() * (2 * HOLD:get() + TAIL:get() + 20)
    if t - session.candidate_start > budget then reject_candidate(); return end
    if not event then
        if math.abs(bank) < 2 and math.abs(roll) < 3 and math.abs(actual) < 3 then
            stable_since = stable_since or t
        elseif math.abs(bank) >= 5 and stable_since and t - stable_since >= 2 then
            local sign = bank > 0 and 1 or -1
            local values = sign > 0 and session.right or session.left
            if #values >= PAIRS:get() then stable_since = nil; return end
            event = {sign=sign, amplitude=math.abs(bank), start=t,
                     err2=0, n=0, brake2=0, overshoot=0, r=0, r2=0, tail_n=0}
        else
            stable_since = nil
        end
        return
    end
    local e = event
    if math.abs(u) >= 44 then abort('controller saturation'); return end
    if t - e.start > 2 * HOLD:get() + TAIL:get() + 10 then abort('event timeout'); return end
    if not e.tail_start then
        if math.abs(bank) < 2 then
            if t - e.start < HOLD:get() then
                event, stable_since = nil, nil -- reject a short step without changing gains
                report('short event rejected')
                return
            end
            e.hold_duration, e.tail_start = t - e.start, t
        elseif math.abs(bank - e.sign * e.amplitude) > 1 then
            event, stable_since = nil, nil
            report('changing bank command rejected')
            return
        end
        if not e.tail_start then
            e.err2 = e.err2 + ((bank - roll) / e.amplitude)^2
            e.brake2 = e.brake2 + (u / 45)^2
            e.n = e.n + 1
            e.overshoot = math.max(e.overshoot, e.sign * roll - e.amplitude)
            if math.abs(bank - roll) < e.amplitude * 0.1 then
                e.in_band = e.in_band or t
                if t - e.in_band >= 1 and not e.settle then e.settle = e.in_band - e.start end
            else
                e.in_band, e.settle = nil, nil
            end
        end
    end
    if e.tail_start then
        if math.abs(bank) >= 2 then abort('level recovery interrupted'); return end
        e.r, e.r2, e.tail_n = e.r + yaw_rate, e.r2 + yaw_rate^2, e.tail_n + 1
        if t - e.tail_start >= TAIL:get() then finish_event() end
    end
end
local function protected_update()
    local ok, err = pcall(update)
    if not ok then
        local restored = pcall(abort, 'internal error: ' .. tostring(err))
        if not restored then
            faulted = true
            gcs:send_text(2, 'PGTune: restoration failed; restore gains manually')
        end
    end
    return protected_update, 50 -- 20 Hz; gain changes only between complete events
end
STATUS:set(0)
report('loaded; enable and use abort/tune/save switch')
return protected_update()
