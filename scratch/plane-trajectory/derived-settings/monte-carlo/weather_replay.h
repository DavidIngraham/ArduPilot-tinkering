// Local SITL instrumentation; not part of the proposed firmware changes.
#include <AP_Vehicle/AP_Vehicle.h>
#include <stdio.h>

static void replay_monte_carlo_weather(SITL::SIM &sim, uint32_t now_ms)
{
    static FILE *source;
    static FILE *journal;
    static bool attempted;
    static uint32_t start_ms;
    static int32_t last_tick = -1;
    const AP_Vehicle *vehicle = AP::vehicle();
    if (vehicle == nullptr || vehicle->get_mode() != 10) {
        if (source != nullptr) {
            fclose(source);
            fclose(journal);
            source = nullptr;
            journal = nullptr;
        }
        attempted = false;
        return;
    }
    if (!attempted) {
        attempted = true;
        source = fopen("scripts/monte-weather.csv", "r");
        if (source == nullptr) {
            return; // Normal regressions have no weather replay installed.
        }
        journal = fopen("scripts/monte-weather-applied.csv", "w");
        if (journal == nullptr) {
            AP_HAL::panic("Cannot open Monte Carlo weather journal");
        }
        fprintf(journal, "boot_ms,tick,speed_mps,from_deg\n");
        start_ms = now_ms;
        last_tick = -1;
    }
    if (source == nullptr) {
        return;
    }
    const int32_t tick = (now_ms - start_ms) / 1000;
    while (last_tick < tick) {
        char line[128];
        unsigned int index;
        float speed;
        float direction;
        if (fgets(line, sizeof(line), source) == nullptr ||
            sscanf(line, "%u,%f,%f", &index, &speed, &direction) != 3 ||
            index != unsigned(last_tick + 1)) {
            AP_HAL::panic("Invalid Monte Carlo weather schedule");
        }
        sim.wind_speed.set(speed);
        sim.wind_direction.set(direction);
        fprintf(journal, "%u,%u,%.8f,%.8f\n", unsigned(now_ms), index, double(speed), double(direction));
        fflush(journal);
        last_tick = index;
    }
}
