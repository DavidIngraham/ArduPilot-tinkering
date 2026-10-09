p='Tools/autotest/arduplane.py';s=open(p).read()
s=s.replace('        return dict(duration_s=rows[-1][0] - rows[0][0],','        terminal = next((r[0] for r in rows if r[1] == len(route) + 1), None)\n        if terminal is None:\n            raise NotAchievedException("Missing course completion timing")\n        return dict(course_duration_s=terminal - rows[0][0],\n                    duration_s=rows[-1][0] - rows[0][0],')
s=s.replace('        wp = mavutil.mavlink.MAV_CMD_NAV_WAYPOINT\n        route = [','        self.fly_waypoint_trajectory_course()\n\n    def WaypointTrajectoryOverfly(self):\n        """Mixed fly-by and pass-by boundaries on short legs, calm and windy."""\n        self.fly_waypoint_trajectory_course(passby={3: 35, 6: 35, 9: 35})\n\n    def fly_waypoint_trajectory_course(self, passby=None):\n        passby = passby or {}\n        wp = mavutil.mavlink.MAV_CMD_NAV_WAYPOINT\n        route = [',1)
s=s.replace('name = "WaypointTrajectory-%s-wind%u" % ("planned" if enabled else "L1", wind_speed)','name = "%s-%s-wind%u" % ("WaypointTrajectoryOverfly" if passby else "WaypointTrajectory",\n                                          "planned" if enabled else "L1", wind_speed)')
s=s.replace('                    items[-1].param3 = 100','                    for seq, distance in passby.items():\n                        items[seq].param2 = 0  # Require passage of the extended finish line.\n                        items[seq].param3 = distance\n                    items[-1].param3 = 100',1)
s=s.replace('                        last_seq[0] = seq\n                        altitude','''                        if seq > last_seq[0] and last_seq[0] in passby and rows:
                            previous = last_seq[0]
                            an, ae = route[previous - 2]
                            bn, be = route[previous - 1]
                            dn, de = bn - an, be - ae
                            n = math.radians(rows[-1][2] - home.lat) * 6371000
                            e = math.radians(rows[-1][3] - home.lng) * 6371000 * math.cos(math.radians(home.lat))
                            beyond = ((n - bn) * dn + (e - be) * de) / math.hypot(dn, de)
                            # Independent 10 Hz mission/position messages can lag each other.
                            if beyond < passby[previous] - 10:
                                raise NotAchievedException("Protected WP %u shortcut: %.1fm beyond, required %um" %
                                                           (previous, beyond, passby[previous]))
                        last_seq[0] = seq
                        altitude''',1)
s=s.replace('                    if enabled and not any("corners 2" in x or "corners 3" in x for x in planned_groups):','                    if enabled and not passby and not any("corners 2" in x or "corners 3" in x for x in planned_groups):')
s=s.replace('                    metrics = self.waypoint_trajectory_metrics(rows, home, route)','''                    if enabled and passby:
                        if not planned_groups:
                            raise NotAchievedException("No planned fly-by transitions exercised")
                        for group in planned_groups:
                            words = group.split()
                            first, count = int(words[2]), int(words[4])
                            if any(seq in range(first, first + count) for seq in passby):
                                raise NotAchievedException("Planner rounded a protected waypoint")
                    metrics = self.waypoint_trajectory_metrics(rows, home, route)''',1)
s=s.replace("if metrics['duration_s'] > baseline['duration_s'] * 1.25:","if metrics['course_duration_s'] > baseline['course_duration_s'] * 1.25:")
s=s.replace("if metrics['mean_overrun_m'] > baseline['mean_overrun_m'] * 0.95:","if not passby and metrics['mean_overrun_m'] > baseline['mean_overrun_m'] * 0.95:")
s=s.replace('acceptance_radius=50, planned_groups=planned_groups,','acceptance_radius=50, passby_distances=passby, planned_groups=planned_groups,')
s=s.replace('            self.WaypointTrajectory,','            self.WaypointTrajectory,\n            self.WaypointTrajectoryOverfly,')
open(p,'w').write(s)
