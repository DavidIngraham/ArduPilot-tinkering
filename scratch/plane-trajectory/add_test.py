from pathlib import Path
p=Path('Tools/autotest/arduplane.py');s=p.read_text().replace('import math\n','import csv\nimport json\nimport math\n',1)
i=s.index('    def fly_left_circuit(self):')
method='''    def WaypointTrajectory(self):
        """Compare L1 and grouped trajectory guidance on overlapping waypoint turns."""
        wp = mavutil.mavlink.MAV_CMD_NAV_WAYPOINT
        route = [
            (300, 0), (700, 0), (700, 90), (1100, 90),  # short S transition
            (1100, 500), (1010, 500), (1010, 900),      # mirrored short S
            (600, 900), (600, 980), (250, 980),         # overlapping same-side turns
            (250, 600), (400, 600), (450, 250),         # acute corner
            (-50, 250), (-50, -100), (-400, -100),
            (-400, -450), (0, -450), (0, -100),
        ]
        for wind_speed in (0, 5):
            for enabled in (0, 1):
                name = "WaypointTrajectory-%s-wind%u" % ("planned" if enabled else "L1", wind_speed)
                self.start_subtest(name)
                self.context_push()
                rows = []
                planned_groups = []
                fallbacks = []
                try:
                    self.set_parameters({
                        "NAVTP_ENABLE": enabled,
                        "NAVTP_PERIOD": 8,
                        "NAVL1_PERIOD": 8,
                        "NAVL1_DAMPING": 0.9,
                        "WP_RADIUS": 50,
                        "WP_MAX_RADIUS": 0,
                        "ROLL_LIMIT_DEG": 45,
                        "AIRSPEED_CRUISE": 20,
                        "SIM_WIND_SPD": 0,
                        "SIM_WIND_TURB": 0,
                    })
                    self.takeoff(alt=100)
                    home = self.home_position_as_location()
                    items = self.create_simple_relloc_mission(
                        home, [(wp, n, e, 100) for n, e in route] + [
                            (mavutil.mavlink.MAV_CMD_NAV_LOITER_UNLIM, 1, 1, 100, {"p1": 100})])
                    for item in items[1:-1]:
                        item.param2 = 50
                    self.upload_mission(items)
                    self.set_current_waypoint(1)
                    self.set_parameters({"SIM_WIND_SPD": wind_speed, "SIM_WIND_DIR": 45})
                    self.context_set_message_rate_hz('GLOBAL_POSITION_INT', 10)
                    self.context_set_message_rate_hz('ATTITUDE', 10)
                    self.context_set_message_rate_hz('MISSION_CURRENT', 10)
                    last_seq = [1]

                    def observe(mav, message):
                        kind = message.get_type()
                        if kind == 'STATUSTEXT':
                            if "Trajectory WP" in message.text:
                                planned_groups.append(message.text)
                            elif "Trajectory L1 fallback" in message.text:
                                fallbacks.append(message.text)
                        if kind != 'GLOBAL_POSITION_INT':
                            return
                        attitude = mav.messages.get('ATTITUDE')
                        mission = mav.messages.get('MISSION_CURRENT')
                        if attitude is None or mission is None:
                            return
                        seq = mission.seq
                        if seq < last_seq[0] or seq > last_seq[0] + 1:
                            raise NotAchievedException("Unexpected mission progression %u to %u" % (last_seq[0], seq))
                        last_seq[0] = seq
                        altitude = message.relative_alt * 0.001
                        values = (attitude.roll, attitude.pitch, attitude.yaw, altitude)
                        if not all(math.isfinite(v) for v in values):
                            raise NotAchievedException("Non-finite flight state")
                        if altitude < 60 or altitude > 150 or abs(math.degrees(attitude.roll)) > 65:
                            raise NotAchievedException("Trajectory flight envelope exceeded")
                        rows.append((message.time_boot_ms * 0.001, seq, message.lat * 1e-7,
                                     message.lon * 1e-7, altitude, math.degrees(attitude.roll),
                                     message.vx * 0.01, message.vy * 0.01))

                    self.install_message_hook_context(observe)
                    self.change_mode('AUTO')
                    end_seq = len(route) + 1
                    start = self.get_sim_time()
                    while self.get_sim_time_cached() - start < 1000:
                        message = self.assert_receive_message('MISSION_CURRENT', timeout=10)
                        self.assert_mode('AUTO')
                        self.assert_armed()
                        if message.seq == end_seq:
                            break
                    else:
                        raise AutoTestTimeoutException("Waypoint torture mission stalled")
                    self.delay_sim_time(15)
                    if enabled and not any("corners 2" in x or "corners 3" in x for x in planned_groups):
                        raise NotAchievedException("No grouped transition exercised")
                    self.progress("Trajectory groups: %s; fallbacks: %s" % (planned_groups, fallbacks))
                finally:
                    with open(self.buildlogs_path(name + '.csv'), 'w') as output:
                        writer = csv.writer(output)
                        writer.writerow(('time_s', 'seq', 'latitude_deg', 'longitude_deg', 'altitude_m',
                                         'roll_deg', 'vn_mps', 've_mps'))
                        writer.writerows(rows)
                    with open(self.buildlogs_path(name + '.json'), 'w') as output:
                        json.dump(dict(route=route, home_lat=home.lat, home_lng=home.lng,
                                       wind_speed=wind_speed, wind_direction=45, enabled=enabled,
                                       acceptance_radius=50, planned_groups=planned_groups, fallbacks=fallbacks), output, indent=2)
                    self.remove_message_hook(observe)
                    self.context_pop()
                    self.reboot_sitl()

'''
s=s[:i]+method+s[i:];s=s.replace('            self.MainFlight,','            self.MainFlight,\n            self.WaypointTrajectory,',1);p.write_text(s)
