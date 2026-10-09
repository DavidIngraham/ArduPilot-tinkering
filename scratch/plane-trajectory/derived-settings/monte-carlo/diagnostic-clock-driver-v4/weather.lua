-- Local SITL weather driver only. Never install on a real aircraft.
local trigger = Parameter('SCR_USER1')
local status = Parameter('SCR_USER2')
local wind_speed = Parameter('SIM_WIND_SPD')
local wind_direction = Parameter('SIM_WIND_DIR')
local source
local journal
local start_ms
local last_tick = -1

local function update()
    if trigger:get() < 0.5 then
        if source then
            source:close()
            journal:close()
            source = nil
            journal = nil
        end
        return
    end
    if vehicle:get_mode() ~= 10 or not arming:is_armed() then
        return
    end
    local now_ms = millis():tofloat()
    if not source then
        source = assert(io.open('scripts/monte-weather.csv', 'r'))
        journal = assert(io.open('scripts/monte-weather-applied.csv', 'w'))
        journal:write('boot_ms,tick,speed_mps,from_deg\n')
        start_ms = now_ms
        last_tick = -1
    end
    local tick = math.floor((now_ms - start_ms) / 1000)
    while last_tick < tick do
        local line = assert(source:read('*l'), 'Weather schedule exhausted')
        local index, speed, direction = line:match('^(%d+),([^,]+),([^,]+)$')
        index = assert(tonumber(index))
        speed = assert(tonumber(speed))
        direction = assert(tonumber(direction))
        assert(index == last_tick + 1, 'Non-sequential weather schedule')
        wind_speed:set(speed)
        wind_direction:set(direction)
        journal:write(string.format('%.0f,%d,%.8f,%.8f\n', now_ms, index, speed, direction))
        journal:flush()
        last_tick = index
        status:set(index + 1)
    end
end

local function guarded_update()
    local ok, err = pcall(update)
    if not ok then
        status:set(-1)
        gcs:send_text(3, 'Weather harness: ' .. tostring(err))
        return
    end
    return guarded_update, 100
end

return guarded_update, 100
