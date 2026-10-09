<!-- Dynamically generated list of Logger Messages
This page was generated using Tools/autotest/logger_metdata/parse.py

DO NOT EDIT
-->


<h3 style="text-align: center">Onboard Message Log Messages</h3>
<hr />

<p>This is a list of log messages which may be present in logs produced and stored onboard ArduPilot vehicles.</p>

<!-- add auto-generated table of contents with "Table of Contents Plus" plugin -->
[toc exclude="Onboard Message Log Messages"]


## ACC
IMU accelerometer data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|accelerometer sensor instance number|
|SampleUS|μs|time since system startup this sample was taken|
|AccX|m/s/s|acceleration along X axis|
|AccY|m/s/s|acceleration along Y axis|
|AccZ|m/s/s|acceleration along Z axis|

## ADSB
Automatic Dependent Serveillance - Broadcast detected vehicle information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|ICAO_address||Transponder address|
|Lat|1e-7 deglatitude|Vehicle latitude|
|Lng|1e-7 deglongitude|Vehicle longitude|
|Alt|mm|Vehicle altitude|
|Heading|cdegheading|Vehicle heading|
|Hor_vel|mm/s|Vehicle horizontal velocity|
|Ver_vel|mm/s|Vehicle vertical velocity|
|Squark||Transponder squawk code|

## AERG
Aeron PLX GNSS status and accuracy (GPS_PARA + EXTD_GNSS)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||Time of week|
|GWk||GPS week|
|NSat||Satellites in view|
|FixT||GPS fix type as reported to AP_GPS|
|Jam||Jamming detection level (1=none,2=warn,3=critical)|
|Spf||Spoofing detection level (1=none,2=warn,3=critical)|
|HPA||Horizontal position accuracy|
|VPA||Vertical position accuracy|
|HVA||Horizontal velocity accuracy|
|HDOP||Horizontal dilution of precision|
|VDOP||Vertical dilution of precision|

## AERN
Aeron PLX fused navigation solution (NAV_PARA1)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Epoch|s|Unix epoch seconds at sample time|
|Lat|deglatitude|Latitude|
|Lng|deglongitude|Longitude|
|Alt|m|Height above WGS84 ellipsoid|
|VN|m/s|Velocity north|
|VE|m/s|Velocity east|
|VD|m/s|Velocity down|
|Crs|degheading|Course over ground|
|Roll|rad|Roll angle|
|Pitch|rad|Pitch angle|
|Yaw|rad|Yaw angle|
|InsSt||PLX INS filter-source status word|
|HwSt||PLX hardware status word|

## AERS
Aeron PLX raw sensor data (SENS_PARA)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Temp|degC|Sensor temperature|
|GX|deg/s|Gyro X|
|GY|deg/s|Gyro Y|
|GZ|deg/s|Gyro Z|
|AX|m/s/s|Accel X|
|AY|m/s/s|Accel Y|
|AZ|m/s/s|Accel Z|
|MX|mGauss|Mag X|
|MY|mGauss|Mag Y|
|MZ|mGauss|Mag Z|
|Pres|Pa|Barometric pressure|
|BTmp|degC|Barometer temperature|
|BAlt|m|Barometric altitude|

## AETR
Normalised pre-mixer control surface outputs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Ail||Pre-mixer value for aileron output (between -4500 and 4500)|
|Elev||Pre-mixer value for elevator output (between -4500 and 4500)|
|Thr||Pre-mixer value for throttle output (between -100 and 100)|
|Rudd||Pre-mixer value for rudder output (between -4500 and 4500)|
|Flap||Pre-mixer value for flaps output (between 0 and 100)|
|Steer||Pre-mixer value for steering output (between -4500 and 4500)|
|SS||Surface movement / airspeed scaling value|

## AHR2
Backup AHRS data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Roll|deg|Estimated roll|
|Pitch|deg|Estimated pitch|
|Yaw|degheading|Estimated yaw|
|Alt|m|Estimated altitude|
|Lat|deglatitude|Estimated latitude|
|Lng|deglongitude|Estimated longitude|
|Q1||Estimated attitude quaternion component 1|
|Q2||Estimated attitude quaternion component 2|
|Q3||Estimated attitude quaternion component 3|
|Q4||Estimated attitude quaternion component 4|

## AIS1
Contents of 'position report' AIS message, see: https://gpsd.gitlab.io/gpsd/AIVDM.html#_types_1_2_and_3_position_report_class_a

|FieldName|Units/Type|Description|
|---|---|---|
|US|μs|Time since system startup|
|typ||Message Type|
|rep||Repeat Indicator|
|mmsi||MMSI|
|nav||Navigation Status|
|rot||Rate of Turn (ROT)|
|sog||Speed Over Ground (SOG)|
|pos||Position Accuracy|
|lon||Longitude|
|lat||Latitude|
|cog||Course Over Ground (COG)|
|hed||True Heading (HDG)|
|sec||Time Stamp|
|man||Maneuver Indicator|
|raim||RAIM flag|
|rad||Radio status|

## AIS4
Contents of 'Base Station Report' AIS message, see: https://gpsd.gitlab.io/gpsd/AIVDM.html#_type_4_base_station_report

|FieldName|Units/Type|Description|
|---|---|---|
|US|μs|Time since system startup|
|rep||Repeat Indicator|
|mmsi||MMSI|
|year||Year (UTC)|
|mth||Month (UTC)|
|day||Day (UTC)|
|h||Hour (UTC)|
|m||Minute (UTC)|
|s||Second (UTC)|
|fix||Fix quality|
|lon||Longitude|
|lat||Latitude|
|epfd||Type of EPFD|
|raim||RAIM flag|
|rad||Radio status|

## AIS5
Contents of 'static and voyage related data' AIS message, see: https://gpsd.gitlab.io/gpsd/AIVDM.html#_type_5_static_and_voyage_related_data

|FieldName|Units/Type|Description|
|---|---|---|
|US|μs|Time since system startup|
|rep||Repeat Indicator|
|mmsi||MMSI|
|ver||AIS Version|
|imo||IMO Number|
|cal|char[16]|Call Sign|
|nam|char[64]|Vessel Name|
|typ||Ship Type|
|bow|m|Dimension to Bow|
|stn|m|Dimension to Stern|
|prt|m|Dimension to Port|
|str|m|Dimension to Starboard|
|fix||Position Fix Type|
|dght|dm|Draught|
|dst|char[64]|Destination|
|dte||DTE|

## AISR
Raw AIS AVDIM messages contents, see: https://gpsd.gitlab.io/gpsd/AIVDM.html#_aivdmaivdo_sentence_layer

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|num||count of fragments in the currently accumulating message|
|total||fragment number of this sentence|
|ID||sequential message ID for multi-sentence messages|
|payload|char[64]|data payload|

## ANG
Attitude control attitude

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Timestamp of the current Attitude loop|
|DesRoll|deg|vehicle desired roll|
|Roll|deg|achieved vehicle roll|
|DesPitch|deg|vehicle desired pitch|
|Pitch|deg|achieved vehicle pitch|
|DesYaw|degheading|vehicle desired yaw|
|Yaw|degheading|achieved vehicle yaw|
|Dt|s|attitude delta time|

## AOA
Angle of attack and Side Slip Angle values

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|AOA|deg|Angle of Attack calculated from airspeed, wind vector,velocity vector |
|SSA|deg|Side Slip Angle calculated from airspeed, wind vector,velocity vector|

## ARM
Arming status changes

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|ArmState||true if vehicle is now armed|
|ArmChecks|bitmask|arming bitmask at time of arming|
|Forced||true if arm/disarm was forced|
|Method|enum|method used for arming|

## ARSP
Airspeed sensor data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|Airspeed sensor instance number|
|Airspeed|m/s|Current airspeed|
|DiffPress|Pa|Pressure difference between static and dynamic port|
|Temp|degC|Temperature used for calculation|
|RawPress|Pa|Raw pressure less offset|
|Offset|Pa|Offset from parameter|
|U||True if sensor is being used|
|H||True if sensor is healthy|
|Hp||Probability sensor is healthy|
|TR||innovation test ratio|
|Pri||Primary instance number. If equal to I then this sensor is primary sensor|

## ASM1
AirSim simulation data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|TUS||Simulation's timestamp|
|R||Simulation's roll|
|P||Simulation's pitch|
|Y||Simulation's yaw|
|GX||Simulated gyroscope, X-axis|
|GY||Simulated gyroscope, Y-axis|
|GZ||Simulated gyroscope, Z-axis|

## ASM2
More AirSim simulation data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|AX||simulation's acceleration, X-axis|
|AY||simulation's acceleration, Y-axis|
|AZ||simulation's acceleration, Z-axis|
|VX||simulation's velocity, X-axis|
|VY||simulation's velocity, Y-axis|
|VZ||simulation's velocity, Z-axis|
|PX||simulation's position, X-axis|
|PY||simulation's position, Y-axis|
|PZ||simulation's position, Z-axis|
|Alt||simulation's gps altitude|
|SD||simulation's earth-frame speed-down|

## ATDE
AutoTune data packet

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Angle|deg|current angle|
|Rate|deg/s|current angular rate|

## ATIS
Fixedwing attitude control input shaping

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|rAng|deg|Shaped roll angle target|
|rErr|deg|Roll angle error between shaped and measured|
|rVel|deg/s|Shaped roll velocity target|
|rAcc|deg/s/s|Shaped roll acceleration target|
|pAng|deg|Shaped pitch angle target|
|pErr|deg|Pitch angle error between shaped and measured|
|pVel|deg/s|Shaped pitch velocity target|
|pAcc|deg/s/s|Shaped pitch acceleration target|

## ATRP
Plane AutoTune

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Axis|instance|tuning axis|
|State||tuning state|
|Sur|deg|control surface deflection|
|PSlew|deg/s|P slew rate|
|DSlew|deg/s|D slew rate|
|FF0||FF value single sample|
|FF||FF value|
|P||P value|
|I||I value|
|D||D value|
|Action||action taken|
|RMAX|deg/s|Rate maximum|
|TAU|s|time constant|

## ATSC
Scale factors for attitude controller

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|AngPScX||Angle P scale X|
|AngPScY||Angle P scale Y|
|AngPScZ||Angle P scale Z|
|PDScX||PD scale X|
|PDScY||PD scale Y|
|PDScZ||PD scale Z|
|IScX||I scale X|
|IScY||I scale Y|
|IScZ||I scale Z|

## ATT
Canonical vehicle attitude

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|DesRoll|deg|vehicle desired roll|
|Roll|deg|achieved vehicle roll|
|DesPitch|deg|vehicle desired pitch|
|Pitch|deg|achieved vehicle pitch|
|DesYaw|degheading|vehicle desired yaw|
|Yaw|degheading|achieved vehicle yaw|
|AEKF||active EKF type|

## ATUN
Copter/QuadPlane AutoTune

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Axis||which axis is currently being tuned|
|TuneStep||step in autotune process|
|Targ|deg|target angle or rate, depending on tuning step|
|Min|deg|measured minimum target angle or rate|
|Max|deg|measured maximum target angle or rate|
|RP||new rate gain P term|
|RD||new rate gain D term|
|SP||new angle P term|
|ddt|m/s/s|maximum measured twitching acceleration|

## AUXF
Auxiliary function invocation information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|function|instance|ID of triggered function|
|pos|enum|switch position when function triggered|
|source|enum|source of auxiliary function invocation|
|index||index within source. 0 indexed. Invalid for scripting.|
|result||true if function was successful|

## BARD
Barometer dynamic data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|barometer sensor instance number|
|DynPrX|Pa|calculated dynamic pressure in the bodyframe X-axis|
|DynPrY|Pa|calculated dynamic pressure in the bodyframe Y-axis|
|DynPrZ|Pa|calculated dynamic pressure in the bodyframe Z-axis|

## BARO
Gathered Barometer data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|barometer sensor instance number|
|Alt|m|calculated altitude|
|AltAMSL|m|altitude AMSL|
|Press|Pa|measured atmospheric pressure|
|Temp|degC|measured atmospheric temperature|
|CRt|m/s|derived climb rate from primary barometer|
|SMS|ms|time last sample was taken|
|Offset|m|raw adjustment of barometer altitude, zeroed on calibration, possibly set by GCS|
|GndTemp|degC|temperature on ground, specified by parameter or measured while on ground|
|H||true if barometer is considered healthy|
|CPress|Pa|compensated atmospheric pressure|

## BAT
Gathered battery data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Inst|instance|battery instance number|
|Volt|V|measured voltage|
|VoltR|V|estimated resting voltage|
|Curr|A|measured current|
|CurrTot|mAh|consumed Ah, current * time|
|EnrgTot|W.h|consumed Wh, energy this battery has expended|
|Temp|degC|measured temperature|
|Res|Ohm|estimated battery resistance|
|RemPct|%|remaining percentage|
|H||health|
|SH|%|state of health percentage.  0 if unknown|

## BBX1
BlackBox data1

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Lat|deglatitude|Latitude|
|Lon|deglongitude|Longitude|
|Alt|m|altitude above sea level|
|Roll|deg|euler roll|
|Pitch|deg|euler pitch|
|Yaw|deg|euler yaw|
|VN|m/s|velocity north|
|VE|m/s|velocity east|
|VD|m/s|velocity down|

## BBX2
BlackBox data2

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GyrX|deg/s|X axis gyro|
|GyrY|deg/s|Y axis gyro|
|GyrZ|deg/s|Z axis gyro|
|AccX|m/s/s|accel X axis (front)|
|AccY|m/s/s|accel Y axis (right)|
|AccZ|m/s/s|accel Z axis (down)|

## BCL
Battery cell voltage information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|battery instance number|
|Volt|V|battery voltage|
|V1|mV|first cell voltage|
|V2|mV|second cell voltage|
|V3|mV|third cell voltage|
|V4|mV|fourth cell voltage|
|V5|mV|fifth cell voltage|
|V6|mV|sixth cell voltage|
|V7|mV|seventh cell voltage|
|V8|mV|eighth cell voltage|
|V9|mV|ninth cell voltage|
|V10|mV|tenth cell voltage|
|V11|mV|eleventh cell voltage|
|V12|mV|twelfth cell voltage|

## BCL2
Battery cell voltage information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|battery instance number|
|V13|mV|thirteenth cell voltage|
|V14|mV|fourteenth cell voltage|

## BCN
Beacon information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Health||True if beacon sensor is healthy|
|Cnt||Number of beacons being used|
|D0|m|Distance to first beacon|
|D1|m|Distance to second beacon|
|D2|m|Distance to third beacon|
|D3|m|Distance to fourth beacon|
|PosX|m|Calculated beacon position, x-axis|
|PosY|m|Calculated beacon position, y-axis|
|PosZ|m|Calculated beacon position, z-axis|

## CAFD
CANFD Frame

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Bus|instance|bus number|
|Id||frame identifier|
|DLC||data length code|
|D0||data 0|
|D1||data 1|
|D2||data 2|
|D3||data 3|
|D4||data 4|
|D5||data 5|
|D6||data 6|
|D7||data 7|

## CAM
Camera shutter information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|Instance number|
|Img||Image number|
|GPSTime||milliseconds since start of GPS week|
|GPSWeek||weeks since 5 Jan 1980|
|Lat|deglatitude|current latitude|
|Lng|deglongitude|current longitude|
|Alt|m|current altitude|
|RelAlt|m|current altitude relative to home|
|GPSAlt|m|altitude as reported by GPS|
|R|deg|current vehicle roll|
|P|deg|current vehicle pitch|
|Y|deg|current vehicle yaw|

## CAND
Info from GetNodeInfo request

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Driver||Driver index|
|NodeId|instance|Node ID|
|UID1||Hardware ID, part 1|
|UID2||Hardware ID, part 2|
|Name|char[64]|Name string|
|Major||major revision id|
|Minor||minor revision id|
|Version||AP_Periph git hash|

## CANF
CAN Frame

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Bus|instance|bus number|
|Id||frame identifier|
|DLC||data length code|
|B0||byte 0|
|B1||byte 1|
|B2||byte 2|
|B3||byte 3|
|B4||byte 4|
|B5||byte 5|
|B6||byte 6|
|B7||byte 7|

## CANH
DroneCAN heartbeat status

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Driver||Driver index|
|NodeId|instance|Node ID|
|UpTime|s|Time since node startup|
|Health||0:Ok, 1:Warning, 2:Error, 3:Critical|
|Mode||0:Operational, 1:Initialization, 2:Maintenance, 3:Software update, 7:Offline|
|SubMode||Expected to be 0|
|VendorCode||vendor specific code. In AP_Periph this is available memory in bytes.|

## CANS
CAN Bus Statistics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|driver index|
|T||transmit success count|
|Trq||transmit request count|
|Trej||transmit reject count|
|Tov||transmit overflow count|
|Tto||transmit timeout count|
|Tab||transmit abort count|
|R||receive count|
|Rov||receive overflow count|
|Rer||receive error count|
|Bo||bus offset error count|
|Etx||ESC successful send count|
|Stx||Servo successful send count|
|Ftx||ESC/Servo failed-to-send count|

## CC
Custom Controller data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Type|enum|controller type|
|Act||true if controller is active|

## CMD
Uploaded mission command information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|CTot||Total number of mission commands|
|CNum||This command's offset in mission|
|CId||Command type|
|Prm1||Parameter 1|
|Prm2||Parameter 2|
|Prm3||Parameter 3|
|Prm4||Parameter 4|
|Lat|deglatitude|Command latitude|
|Lng|deglongitude|Command longitude|
|Alt|m|Command altitude|
|Frame||Frame used for position|

## CP
Custom Controller data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Type|enum|controller type|
|Act||true if the controller is switched on by the pilot|
|Run||true if the controller is actually running. Act can be true while Run is false, for example during an RC failsafe or in a flight mode the backend refuses to run in.|

## CSCU
Generic DroneCAN circuit status

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|driver index|
|Id||circuit id|
|V|V|Voltage|
|A|A|Current|
|Err||error flags|

## CSRV
Servo feedback data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id|instance|Servo number this data relates to|
|Pos|deg|Current servo position|
|Force|N.m|Force being applied|
|Speed|deg/s|Current servo movement speed|
|Pow|%|Amount of rated power being applied|
|PosCmd|deg|commanded servo position|
|V|V|Voltage|
|A|A|Current|
|MotT|degC|motor temperature|
|PCBT|degC|PCB temperature|
|Err||error flags|

## CTUN
Control Tuning information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|NavRoll|deg|desired roll|
|Roll|deg|achieved roll|
|NavPitch|deg|desired pitch assuming pitch trims are already applied|
|Pitch|deg|achieved pitch assuming pitch trims are already applied,ie "0deg" is level flight trimmed pitch attitude as shown on artificial horizon level line.|
|ThO||scaled output throttle|
|RdO||scaled output rudder|
|ThD||demanded speed-height-controller throttle|
|As|m/s|airspeed estimate (or measurement if airspeed sensor healthy and ARSPD_USE>0)|
|AsT|enum|airspeed type ( old estimate or source of new estimate)|
|E2T||equivalent to true airspeed ratio|
|GU|cm/s|groundspeed undershoot when flying with minimum groundspeed|

## DCM
DCM Estimator Data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Roll|deg|estimated roll|
|Pitch|deg|estimated pitch|
|Yaw|deg|estimated yaw|
|ErrRP|deg|lowest estimated gyro drift error|
|ErrYaw|degheading|difference between measured yaw and DCM yaw estimate|
|VWN|m/s|wind velocity, to-the-North component|
|VWE|m/s|wind velocity, to-the-East component|
|VWD|m/s|wind velocity, Up-to-Down component|
|SAs|m/s|synthetic (equivalent) airspeed|

## DMS
DataFlash-Over-MAVLink statistics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|N||Current block number|
|Dp||Number of times we rejected a write to the backend|
|RT||Number of blocks sent from the retry queue|
|RS||Number of resends of unacknowledged data made|
|Fa||Average number of blocks on the free list|
|Fmn||Minimum number of blocks on the free list|
|Fmx||Maximum number of blocks on the free list|
|Pa||Average number of blocks on the pending list|
|Pmn||Minimum number of blocks on the pending list|
|Pmx||Maximum number of blocks on the pending list|
|Sa||Average number of blocks on the sent list|
|Smn||Minimum number of blocks on the sent list|
|Smx||Maximum number of blocks on the sent list|

## DSF
Onboard logging statistics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Dp||Number of times we rejected a write to the backend|
|Blk||Current block number|
|Bytes|B|Current write offset|
|FMn||Minimum free space in write buffer in last time period|
|FMx||Maximum free space in write buffer in last time period|
|FAv||Average free space in write buffer in last time period|

## DSTL
Deepstall Landing data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Stg||Deepstall landing stage|
|THdg|degheading|Target heading|
|Lat|deglatitude|Landing point latitude|
|Lng|deglongitude|Landing point longitude|
|Alt|m|Landing point altitude|
|XT||Crosstrack error|
|Travel||Expected travel distance vehicle will travel from this point|
|L1I||L1 controller crosstrack integrator value|
|Loiter||wind estimate loiter angle flown|
|Des||Deepstall steering PID desired value|
|P||Deepstall steering PID Proportional response component|
|I||Deepstall steering PID Integral response component|
|D||Deepstall steering PID Derivative response component|

## EAHR
External AHRS data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Roll|deg|euler roll|
|Pitch|deg|euler pitch|
|Yaw|deg|euler yaw|
|VN|m/s|velocity north|
|VE|m/s|velocity east|
|VD|m/s|velocity down|
|Lat|deglatitude|latitude|
|Lon|deglongitude|longitude|
|Alt|m|altitude AMSL|
|Flg||nav status flags|

## EAHV
External AHRS variances

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Vel||velocity variance|
|Pos||position variance|
|Hgt||height variance|
|MagX||magnetic variance, X|
|MagY||magnetic variance, Y|
|MagZ||magnetic variance, Z|
|TAS||true airspeed variance|

## ECYL
EFI per-cylinder information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Inst|instance|Cylinder this data belongs to|
|IgnT|deg|Ignition timing|
|InjT|ms|Injection time|
|CHT|degC|Cylinder head temperature|
|EGT|degC|Exhaust gas temperature|
|Lambda||Estimated lambda coefficient (dimensionless ratio)|
|CHT2|degC|Cylinder2 head temperature|
|EGT2|degC|Cylinder2 Exhaust gas temperature|
|IDX||Index of the publishing ECU|

## EDT2
Status received from ESCs via Extended DShot telemetry v2

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|Instance|instance|ESC instance number|
|Stress||current stress level (commutation effort), scaled to [0..255]|
|MaxStress||maximum stress level (commutation effort) since arming, scaled to [0..15]|
|Status|bitmask|status bits|

## EFI
Electronic Fuel Injection system data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|LP|%|Reported engine load|
|Rpm|rpm|Reported engine RPM|
|SDT|ms|Spark Dwell Time|
|ATM|Pa|Atmospheric pressure|
|IMP|Pa|Intake manifold pressure|
|IMT|degC|Intake manifold temperature|
|ECT|degC|Engine Coolant Temperature|
|OilP|Pa|Oil Pressure|
|OilT|degC|Oil temperature|
|FP|Pa|Fuel Pressure|
|FCR||Fuel Consumption Rate|
|CFV||Consumed fuel volume|
|TPS|%|Throttle Position|
|IDX||Index of the publishing ECU|

## EFI2
Electronic Fuel Injection system data - redux

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Healthy||True if EFI is healthy|
|ES||Engine state|
|GE||General error|
|CSE||Crankshaft sensor status|
|TS||Temperature status|
|FPS||Fuel pressure status|
|OPS||Oil pressure status|
|DS||Detonation status|
|MS||Misfire status|
|DebS||Debris status|
|SPU||Spark plug usage|
|IDX||Index of the publishing ECU|

## EFIS
Electronic Fuel Injection data - Hirth specific Status information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|EET|bitmask|Error Excess Temperature Bitfield|
|FLAG|bitmask|Sensor Status Bitfield|
|CRF||CRC failure count|
|AKF||ACK failure count|
|Up||Uptime between 2 messages|
|ThO||Throttle output as received by the engine|
|ThM||Modified throttle_to_hirth output sent to the engine|

## ERR
Specifically coded error messages

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Subsys|enum|Subsystem in which the error occurred|
|ECode||Subsystem-specific error code|

## ESC
Feedback received from ESCs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|Instance|instance|ESC instance number|
|RPM|rpm|reported motor rotation rate|
|RawRPM|rpm|reported motor rotation rate without slew adjustment|
|Volt|V|Perceived input voltage for the ESC|
|Curr|A|Perceived current through the ESC|
|Temp|degC|ESC temperature in centi-degrees C|
|CTot|mAh|current consumed total mAh|
|MotTemp|degC|measured motor temperature in centi-degrees C|
|Err|%|error rate|

## ESCX
ESC extended telemetry data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|starts from 0|
|inpct|%|input duty cycle in percent|
|outpct|%|output duty cycle in percent|
|flags||manufacturer-specific status flags|
|Pwr|%|Power percentage|

## EV
Specifically coded event messages

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id|enum|Event identifier|

## FCN
Filter Center Message - per motor

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|I|instance|instance|
|NF||total number of active harmonic notches|
|CF1|Hz|First harmonic centre frequency for motor 1|
|CF2|Hz|First harmonic centre frequency for motor 2|
|CF3|Hz|First harmonic centre frequency for motor 3|
|CF4|Hz|First harmonic centre frequency for motor 4|
|CF5|Hz|First harmonic centre frequency for motor 5|
|CF6|Hz|First harmonic centre frequency for motor 6|
|HF1|Hz|Second harmonic centre frequency for motor 1|
|HF2|Hz|Second harmonic centre frequency for motor 2|
|HF3|Hz|Second harmonic centre frequency for motor 3|
|HF4|Hz|Second harmonic centre frequency for motor 4|
|HF5|Hz|Second harmonic centre frequency for motor 5|
|HF6|Hz|Second harmonic centre frequency for motor 6|

## FCNS
Filter Center Message

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|I|instance|instance|
|CF|Hz|notch centre frequency|
|HF|Hz|2nd harmonic frequency|

## FENC
Fence status - development diagnostic message

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|EN||bitmask of enabled fences|
|AE||bitmask of automatically enabled fences|
|CF||bitmask of configured-in-parameters fences|
|EF||bitmask of enabled fences|
|DF||bitmask of currently disabled fences|
|Alt||current vehicle altitude|

## FILE
File data

|FieldName|Units/Type|Description|
|---|---|---|
|FileName|char[16]|File name|
|Offset||Offset into the file of this block|
|Length||Length of this data block|
|Data|char[64]|File data of this block|

## FMT
Message defining the format of messages in this file ([Read more...](https://ardupilot.org/dev/docs/code-overview-adding-a-new-log-message.html))

|FieldName|Units/Type|Description|
|---|---|---|
|Type||unique-to-this-log identifier for message being defined|
|Length|B|the number of bytes taken up by this message (including all headers)|
|Name|char[4]|name of the message being defined|
|Format|char[16]|character string defining the C-storage-type of the fields in this message|
|Columns|char[64]|the labels of the message being defined|

## FMTU
Message defining units and multipliers used for fields of other messages

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|FmtType||numeric reference to associated FMT message|
|UnitIds|char[16]|each character refers to a UNIT message.  The unit at an offset corresponds to the field at the same offset in FMT.Format|
|MultIds|char[16]|each character refers to a MULT message.  The multiplier at an offset corresponds to the field at the same offset in FMT.Format|

## FNCE
currently loaded Geo Fence points

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tot||total number of stored items|
|Seq||index in current sequence|
|Type||point type|
|Lat|deglatitude|point latitude|
|Lng|deglongitude|point longitude|
|Count||vertex cound in polygon if applicable|
|Radius|m|radius of circle if applicable|

## FOLL
Follow library diagnostic data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup (microseconds)|
|Lat|deglatitude|Target latitude (degrees * 1E7)|
|Lon|deglongitude|Target longitude (degrees * 1E7)|
|Alt|cm|Target absolute altitude (centimeters)|
|VelN|m/s|Target velocity, North (m/s)|
|VelE|m/s|Target velocity, East (m/s)|
|VelD|m/s|Target velocity, Down (m/s)|
|LatE|deglatitude|Vehicle estimated latitude (degrees * 1E7)|
|LonE|deglongitude|Vehicle estimated longitude (degrees * 1E7)|
|AltE|cm|Vehicle estimated altitude (centimeters)|
|FrmE||Vehicle estimated altitude Frame|

## FTN
Filter Tuning Message - per motor

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|I|instance|instance|
|NDn||number of active harmonic notches|
|NF1|Hz|desired harmonic notch centre frequency for motor 1|
|NF2|Hz|desired harmonic notch centre frequency for motor 2|
|NF3|Hz|desired harmonic notch centre frequency for motor 3|
|NF4|Hz|desired harmonic notch centre frequency for motor 4|
|NF5|Hz|desired harmonic notch centre frequency for motor 5|
|NF6|Hz|desired harmonic notch centre frequency for motor 6|
|NF7|Hz|desired harmonic notch centre frequency for motor 7|
|NF8|Hz|desired harmonic notch centre frequency for motor 8|
|NF9|Hz|desired harmonic notch centre frequency for motor 9|
|NF10|Hz|desired harmonic notch centre frequency for motor 10|
|NF11|Hz|desired harmonic notch centre frequency for motor 11|
|NF12|Hz|desired harmonic notch centre frequency for motor 12|

## FTN1
FFT Filter Tuning

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|PkAvg|Hz|peak noise frequency as an energy-weighted average of roll and pitch peak frequencies|
|BwAvg|Hz|bandwidth of weighted peak frequency where edges are determined by FFT_ATT_REF|
|SnX||signal-to-noise ratio on the roll axis|
|SnY||signal-to-noise ratio on the pitch axis|
|SnZ||signal-to-noise ratio on the yaw axis|
|FtX|%|harmonic fit on roll of the highest noise peak to the second highest noise peak|
|FtY|%|harmonic fit on pitch of the highest noise peak to the second highest noise peak|
|FtZ|%|harmonic fit on yaw of the highest noise peak to the second highest noise peak|
|FHX||FFT health, X-axis|
|FHY||FFT health, Y-axis|
|FHZ||FFT health, Z-axis|
|Tc|μs|FFT cycle time|

## FTN2
FFT Noise Frequency Peak

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|Id|instance|peak id where 0 is the centre peak, 1 is the lower shoulder and 2 is the upper shoulder|
|PkX|Hz|noise frequency of the peak on roll|
|PkY|Hz|noise frequency of the peak on pitch|
|PkZ|Hz|noise frequency of the peak on yaw|
|BwX|Hz|bandwidth of the peak frequency on roll where edges are determined by FFT_ATT_REF|
|BwY|Hz|bandwidth of the peak frequency on pitch where edges are determined by FFT_ATT_REF|
|BwZ|Hz|bandwidth of the peak frequency on yaw where edges are determined by FFT_ATT_REF|
|SnX||signal-to-noise ratio on the roll axis|
|SnY||signal-to-noise ratio on the pitch axis|
|SnZ||signal-to-noise ratio on the yaw axis|
|EnX||power spectral density bin energy of the peak on roll|
|EnY||power spectral density bin energy of the peak on roll|
|EnZ||power spectral density bin energy of the peak on roll|

## FTN3
Additional FFT Noise Frequency Peak

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|Id|instance|update axis|
|Pk1|Hz|Peak 1 frequency|
|Pk2|Hz|Peak 2 frequency|
|Pk3|Hz|Peak 3 Frequency|
|Bw1|Hz|Peak 1 noise bandwidth|
|Bw2|Hz|Peak 2 noise bandwidth|
|Bw3|Hz|Peak 3 noise bandwidth|
|En1||Peak 1 Maximum energy|
|En2||Peak 2 Maximum energy|
|En3||Peak 3 Maximum energy|

## FTNS
Filter Tuning Message

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|microseconds since system startup|
|I|instance|instance|
|NF|Hz|desired harmonic notch centre frequency|

## FWDT
Forward Throttle calculations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|fts||forward throttle scaler|
|qfplcd||quadplane forward pitch limit|
|npllcd||navigation pitch lower limit|
|npcd||demanded navigation pitch|
|qft||quadplane forward throttle|
|npulcd||upper limit for navigation pitch|

## GLT
Simulated Glider Angles and coefficients

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Alpha||alpha angle|
|Beta||beta angle|
|Cl||lift coefficent|
|Cm||roll coffecient|
|Cn||yaw coefficient|

## GPA
GPS accuracy information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|GPS instance number|
|VDop||vertical dilution of precision|
|HAcc|m|horizontal position accuracy|
|VAcc|m|vertical position accuracy|
|SAcc|m/s|speed accuracy|
|YAcc|deg|yaw accuracy|
|VV||true if vertical velocity is available|
|SMS|ms|time since system startup this sample was taken|
|Delta|ms|system time delta between the last two reported positions|
|AEl|m|altitude above WGS-84 ellipsoid; INT32_MIN (-2147483648) if unknown|
|RTCMFU||RTCM fragments used|
|RTCMFD||RTCM fragments discarded|

## GPS
Information received from GNSS systems attached to the autopilot

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|GPS instance number|
|Status|enum|GPS Fix type; 2D fix, 3D fix etc.|
|GMS|ms|milliseconds since start of GPS Week|
|GWk||weeks since 5 Jan 1980|
|NSats|satellites|number of satellites visible|
|HDop||horizontal dilution of precision|
|Lat|deglatitude|latitude|
|Lng|deglongitude|longitude|
|Alt|m|altitude|
|Spd|m/s|ground speed|
|GCrs|degheading|ground course|
|VZ|m/s|vertical speed|
|Yaw|degheading|vehicle yaw|
|U||boolean value indicating whether this GPS is in use|

## GPYW
GPS Yaw

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id|instance|instance|
|RHD|deg|reported heading,deg|
|RDist|m|antenna separation,m|
|RDown|m|vertical antenna separation,m|
|MinCDown|m|minimum tolerable vertical antenna separation,m|
|MaxCDown|m|maximum tolerable vertical antenna separation,m |
|OK||1 if have yaw|

## GRAW
Raw uBlox data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|WkMS|ms|receiver TimeOfWeek measurement|
|Week||GPS week|
|numSV|satellites|number of space vehicles seen|
|sv||space vehicle number of first vehicle|
|cpMes||carrier phase measurement|
|prMes||pseudorange measurement|
|doMes||Doppler measurement|
|mesQI||measurement quality index|
|cno||carrier-to-noise density ratio|
|lli||loss of lock indicator|

## GRXH
Raw uBlox data - header

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|rcvTime||receiver TimeOfWeek measurement|
|week||GPS week|
|leapS||GPS leap seconds|
|numMeas||number of space-vehicle measurements to follow|
|recStat||receiver tracking status bitfield|

## GRXS
Raw uBlox data - space-vehicle data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|prMes||Pseudorange measurement|
|cpMes||Carrier phase measurement|
|doMes||Doppler measurement|
|gnss||GNSS identifier|
|sv||Satellite identifier|
|freq||GLONASS frequency slot|
|lock||carrier phase locktime counter|
|cno||carrier-to-noise density ratio|
|prD||estimated pseudorange measurement standard deviation|
|cpD||estimated carrier phase measurement standard deviation|
|doD||estimated Doppler measurement standard deviation|
|trk||tracking status bitfield|

## GSLH
GSOF70 LLH with MSL Altitude

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup [µs]|
|Lat|deglatitude|Latitude [deg]|
|Lng|deglongitude|Longitude [deg]|
|AltMSL|m|Altitude above mean sea level [m]|
|Model|char[64]|Geoid model used (null-terminated string)|

## GSN1
GSOF49 Full INS Navigation Solution 1

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup [us]|
|GpsWk||GPS week number since Jan 1980|
|GpsTs|ms|GPS time of week [ms]|
|ImuStat||IMU alignment status (enum)|
|GStat||GNSS status (enum)|
|Lat|deglatitude|Latitude [degrees]|
|Lng|deglongitude|Longitude [degrees]|
|Alt|m|Altitude in ITRF 2020 [meters]|
|VN|m/s|Velocity North [m/s]|
|VE|m/s|Velocity East [m/s]|
|VD|m/s|Velocity Down [m/s]|
|Spd|m/s|3D Speed [m/s]|

## GSN2
GSOF49 Full INS Navigation Solution 2

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup [us]|
|Roll|deg|Roll [degrees]|
|Pitch|deg|Pitch [degrees]|
|Heading|degheading|Heading [degrees]|
|Track|deg|Track angle [degrees]|
|RateX|deg/s|Angular rate X [deg/s]|
|RateY|deg/s|Angular rate Y [deg/s]|
|RateZ|rad/s|Angular rate Z [m/s]|
|AccX|m/s/s|Acceleration X [m/s^2]|
|AccY|m/s/s|Acceleration Y [m/s^2]|
|AccZ|m/s/s|Acceleration Z [m/s^2]|

## GSPT
GSOF1 GPS Position Time Metadata

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|GPS Time since system startup [us]|
|TOWms|ms|GPS Time of week [ms]|
|Week||GPS week number|
|Sats|satellites|Number of satellites|
|Flags1||Positioning flags byte 1|
|Flags2||Positioning flags byte 2|
|InitNum||Initialization count|

## GSR1
GSOF50 INS Solution RMS Values 1

|FieldName|Units/Type|Description|
|---|---|---|
|TUS|μs|Time since system startup [us]|
|GpsTMs|ms|GPS time of week [ms]|
|PUN|m|North Position uncertainty RMS [m]|
|PUE|m|East Position uncertainty RMS [m]|
|PUD|m|Down Position uncertainty RMS [m]|
|VUN|m/s|North Velocity uncertainty RMS [m/s]|
|VUE|m/s|East Velocity uncertainty RMS [m/s]|
|VUD|m/s|Down Velocity uncertainty RMS [m/s]|
|RollU|deg|Roll RMS uncertainty [deg]|
|PitchU|deg|Pitch RMS uncertainty[deg]|
|YawU|deg|Yaw RMS uncertainty[deg]|

## GYR
IMU gyroscope data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|gyroscope sensor instance number|
|SampleUS|μs|time since system startup this sample was taken|
|GyrX|rad/s|measured rotation rate about X axis|
|GyrY|rad/s|measured rotation rate about Y axis|
|GyrZ|rad/s|measured rotation rate about Z axis|

## HEAT
IMU Heater data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Temp||Current IMU temperature|
|Targ||Target IMU temperature|
|P||Proportional portion of response|
|I||Integral portion of response|
|Out||Controller output to heating element|

## HRSC
Helicopter related messages 

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|Instance, 0=Main, 1=Tail|
|DRRPM||Desired rotor speed|
|ERRPM||Estimated rotor speed|
|Gov||Governor Output|
|Throt||Throttle output|
|Ramp||throttle ramp up|

## HYGR
Hygrometer data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id|instance|sensor ID|
|Humidity|%|percentage humidity|
|Temp|degC|temperature in degrees C|

## ICMB
ICM20789 diagnostics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Traw||raw temperature from sensor|
|Praw||raw pressure from sensor|
|P||pressure|
|T||temperature|

## IE24
Intelligent Energy Fuel Cell generator (legacy protocol) ([Read more...](https://ardupilot.org/copter/docs/common-ie24-fuelcell.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|FUEL|1e2 %|Fuel remaining|
|SPMPWR|Watt|stack power module power draw|
|POUT|Watt|output power|
|ERR|enum|error codes|

## IEFC
Intelligent Energy Fuel Cell generator ([Read more...](https://ardupilot.org/copter/docs/common-ie24-fuelcell.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tank|%|Fuel remaining|
|Inlet||Inlet pressure|
|BattV|V|battery voltage|
|OutPwr|Watt|output power|
|SPMPwr|Watt|stack power module power draw|
|FNo||fault number|
|BPwr|Watt|battery power draw|
|State|enum|generator state|
|F1|enum|error code|
|F2||sub-error code|

## ILB1
InertialLabs AHRS data1

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GPS INS time (round)|
|GyrX|deg/s|Gyro X|
|GyrY|deg/s|Gyro Y|
|GyrZ|deg/s|Gyro z|
|AccX|m/s/s|Accelerometer X|
|AccY|m/s/s|Accelerometer Y|
|AccZ|m/s/s|Accelerometer Z|

## ILB2
InertialLabs AHRS data2

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GPS INS time (round)|
|MagX||Magnetometer X|
|MagY||Magnetometer Y|
|MagZ||Magnetometer Z|

## ILB3
InertialLabs AHRS data3

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GPS INS time (round)|
|Press|Pa|Static pressure|
|Diff|Pa|Differential pressure|
|Temp|degC|Temperature|
|Alt|m|Baro altitude|
|TAS|m/s|true airspeed|
|VWN|m/s|Wind velocity north|
|VWE|m/s|Wind velocity east|
|VWD|m/s|Wind velocity down|
|ADU||Air Data Unit status|

## ILB4
InertialLabs AHRS data4

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GNSS Position timestamp|
|GWk||GPS Week|
|NSat||Number of satellites|
|NewGPS||Indicator of new update of GPS data|
|Lat|deglatitude|GNSS Latitude|
|Lng|deglongitude|GNSS Longitude|
|Alt|m|GNSS Altitude|
|GCrs|degheading|GNSS Track over ground|
|Spd|m/s|GNSS Horizontal speed|
|VZ|m/s|GNSS Vertical speed|

## ILB5
InertialLabs AHRS data5

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GNSS Position timestamp|
|FType||fix type|
|GSS||GNSS spoofing status|
|GJS||GNSS jamming status|
|GI1||GNSS Info1|
|GI2||GNSS Info2|
|GAPS||GNSS Angles position type|

## ILB6
InertialLabs AHRS data6

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GNSS Position timestamp|
|GpsHTS||GNSS Heading timestamp|
|GpsYaw|degheading|GNSS Heading|
|GpsPitch|deg|GNSS Pitch|
|GDOP||GNSS GDOP|
|PDOP||GNSS PDOP|
|HDOP||GNSS HDOP|
|VDOP||GNSS VDOP|
|TDOP||GNSS TDOP|

## ILB7
InertialLabs AHRS data7

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GPS INS time (round)|
|Roll|deg|euler roll|
|Pitch|deg|euler pitch|
|Yaw|deg|euler yaw|
|VN|m/s|velocity north|
|VE|m/s|velocity east|
|VD|m/s|velocity down|
|Lat|deglatitude|latitude|
|Lng|deglongitude|longitude|
|Alt|m|altitude MSL|
|USW||USW1|
|USW2||USW2|
|Vdc|V|Supply voltage|

## ILB8
InertialLabs AHRS data8

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GMS||GPS INS time (round)|
|PVN|m|position variance north|
|PVE|m|position variance east|
|PVD|m|position variance down|
|VVN|m/s|velocity variance north|
|VVE|m/s|velocity variance east|
|VVD|m/s|velocity variance down|

## IMU
Inertial Measurement Unit data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|IMU sensor instance number|
|GyrX|rad/s|measured rotation rate about X axis|
|GyrY|rad/s|measured rotation rate about Y axis|
|GyrZ|rad/s|measured rotation rate about Z axis|
|AccX|m/s/s|acceleration along X axis|
|AccY|m/s/s|acceleration along Y axis|
|AccZ|m/s/s|acceleration along Z axis|
|EG||gyroscope error count|
|EA||accelerometer error count|
|T|degC|IMU temperature|
|GH||gyroscope health|
|AH||accelerometer health|
|GHz|Hz|gyroscope measurement rate|
|AHz|Hz|accelerometer measurement rate|

## IOMC
IOMCU diagnostic information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|RSErr||Status Read error count (zeroed on successful read)|
|Mem||Free memory|
|TS||IOMCU uptime|
|NPkt||Number of packets received by IOMCU|
|Nerr||Protocol failures on MCU side|
|Nerr2||Reported number of failures on IOMCU side|
|NDel||Number of delayed packets received by MCU|

## IREG
IMU Register unexpected value change

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|DevID||bus ID|
|Bank||device register bank|
|Reg||device register|
|Val||unexpected value|

## ISBD
InertialSensor Batch Logging Data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|N||batch sequence number|
|seqno||sample sequence number|
|x|m/s/s|x-axis sample value|
|y|m/s/s|y-axis sample value|
|z|m/s/s|z-axis sample value|

## ISBH
InertialSensor Batch Logging Header

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|N||batch sequence number|
|type||indicates if this is accel or gyro data|
|instance||IMU sensor instance|
|mul||multiplier to be applied to samples in this batch|
|smp_cnt||samples in this batch|
|SampleUS|μs|timestamp of first sample|
|smp_rate|Hz|rate at which samples have been collected|

## JSN1
Log data received from JSON simulator

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup (us)|
|TStamp|s|Simulation's timestamp (s)|
|R|rad|Simulation's roll (rad)|
|P|rad|Simulation's pitch (rad)|
|Y|rad|Simulation's yaw (rad)|
|GX|rad/s|Simulated gyroscope, X-axis (rad/sec)|
|GY|rad/s|Simulated gyroscope, Y-axis (rad/sec)|
|GZ|rad/s|Simulated gyroscope, Z-axis (rad/sec)|

## JSN2
Log data received from JSON simulator

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup (us)|
|VN|m/s|simulation's velocity, North-axis (m/s)|
|VE|m/s|simulation's velocity, East-axis (m/s)|
|VD|m/s|simulation's velocity, Down-axis (m/s)|
|AX|m/s/s|simulation's acceleration, X-axis (m/s^2)|
|AY|m/s/s|simulation's acceleration, Y-axis (m/s^2)|
|AZ|m/s/s|simulation's acceleration, Z-axis (m/s^2)|
|AN|m/s/s|simulation's acceleration, North (m/s^2)|
|AE|m/s/s|simulation's acceleration, East (m/s^2)|
|AD|m/s/s|simulation's acceleration, Down (m/s^2)|

## LAND
Slope Landing data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|stage||progress through landing sequence|
|f1||Landing flags|
|f2||Slope-specific landing flags|
|slope||Slope to landing point|
|slopeInit||Initial slope to landing point|
|altO||Rangefinder correction|
|fh||Height for flare timing.|

## LGR
Landing gear information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|LandingGear|enum|Current landing gear state|
|WeightOnWheels|enum|Weight on wheels state|

## LOEC
Gathered Loweheiser EFI/Governor telemetry

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|SI||target system ID|
|CI||target component ID|
|C||command|
|I|instance|efi index|
|ES||desired engine state (0:EFI off 1:EFI on)|
|GS||desired governor state (0:Governor off 1:Governor on)|
|Thr||manual throttle value|
|Strtr||desired electric start|

## LOEG
Gathered Loweheiser EFI/Governor telemetry

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|EFI/Gov sensor instance number|
|VB|V|battery voltage|
|CB|A|battery current|
|CG|A|generator current|
|Th|%|throttle input|
|EB|V|EFI battery voltage|
|RPM|rpm|generator RPM|
|PW|μs|EFI pulse-width|
|FF|l/s|fuel flow|
|FC|l|fuel consumed|
|EP|Pa|EFI pressure|
|EMT|degC|EFI manifold air temperature|
|CHT|degC|cylinder head temperature|
|TPS|%|throttle position sensor|

## MAG
Information received from compasses

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|magnetometer sensor instance number|
|MagX|mGauss|magnetic field strength in body frame|
|MagY|mGauss|magnetic field strength in body frame|
|MagZ|mGauss|magnetic field strength in body frame|
|OfsX|mGauss|magnetic field offset in body frame|
|OfsY|mGauss|magnetic field offset in body frame|
|OfsZ|mGauss|magnetic field offset in body frame|
|MOX|mGauss|motor interference magnetic field offset in body frame|
|MOY|mGauss|motor interference magnetic field offset in body frame|
|MOZ|mGauss|motor interference magnetic field offset in body frame|
|Health||true if the compass is considered healthy|
|S|μs|time measurement was taken|

## MAGH
Magnetometer high resolution data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Node|instance|CAN node|
|Sensor||sensor ID on node|
|Bus||CAN bus|
|Mx||X axis field|
|My||y axis field|
|Mz||z axis field|

## MAV
GCS MAVLink link statistics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|chan|instance|mavlink channel number|
|txp||transmitted packet count|
|rxp||received packet count|
|rxdp||perceived number of packets we never received|
|flags|bitmask|compact representation of some state of the channel|
|ss|ms|stream slowdown is the number of ms being added to each message to fit within bandwidth|
|tf||times buffer was full when a message was going to be sent|
|mgs|ms|time MAV_GCS_SYSID heartbeat (or manual control) last seen|

## MAVC
MAVLink command we have just executed

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|TS||target system for command|
|TC||target component for command|
|SS||source system for command|
|SC||source component for command|
|Fr||command frame|
|Cmd||mavlink command enum value|
|P1||first parameter from mavlink packet|
|P2||second parameter from mavlink packet|
|P3||third parameter from mavlink packet|
|P4||fourth parameter from mavlink packet|
|X||X coordinate from mavlink packet|
|Y||Y coordinate from mavlink packet|
|Z||Z coordinate from mavlink packet|
|Res||command result being returned from autopilot|
|WL||true if this command arrived via a COMMAND_LONG rather than COMMAND_INT|

## MCU
MCU voltage and temprature monitering

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|MTemp|degC|Temperature|
|MVolt|V|Voltage|
|MVmin|V|Voltage min|
|MVmax|V|Voltage max|

## MISE
Executed mission command information; emitted when we start to run an item

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|CTot||Total number of mission commands|
|CNum||This command's offset in mission|
|CId||Command type|
|Prm1||Parameter 1|
|Prm2||Parameter 2|
|Prm3||Parameter 3|
|Prm4||Parameter 4|
|Lat|deglatitude|Command latitude|
|Lng|deglongitude|Command longitude|
|Alt|m|Command altitude|
|Frame||Frame used for position|

## MMO
MMC3416 compass data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Nx||new measurement X axis|
|Ny||new measurement Y axis|
|Nz||new measurement Z axis|
|Ox||new offset X axis|
|Oy||new offset Y axis|
|Oz||new offset Z axis|

## MNT
Mount's desired and actual roll, pitch and yaw angles

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|Instance number|
|Mode||Mount mode|
|DRoll|deg|Desired roll|
|Roll|deg|Actual roll|
|DPitch|deg|Desired pitch|
|Pitch|deg|Actual pitch|
|DYawB|deg|Desired yaw in body frame|
|YawB|deg|Actual yaw in body frame|
|DYawE|deg|Desired yaw in earth frame|
|YawE|deg|Actual yaw in earth frame|
|Dist|m|Rangefinder distance|

## MODE
vehicle control mode information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Mode||vehicle-specific mode number|
|ModeNum||alias for Mode|
|Rsn|enum|reason for entering this mode; enumeration value|

## MON
Main loop performance monitoring message.

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Dly||Loop delay so far|
|Tsk||Current task|
|IErr||Internal error mask|
|IErrCnt||Count of internal error occurances|
|IErrLn||Internal Error line|
|MM||MAVLink message currently being processed|
|MC||MAVLink command currently being processed|
|SmLn||If semaphore taken, line of semaphore take call|
|SPICnt||count of SPI transactions|
|I2CCnt||count of i2c transactions|

## MOTB
Motor mixer information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|LiftMax||Maximum motor compensation gain|
|BatVolt||Ratio between detected battery voltage and maximum battery voltage|
|ThLimit||Throttle limit set due to battery current limitations|
|ThrAvMx||Maximum average throttle that can be used to maintain attitude control, derived from throttle mix params|
|ThrOut||Throttle output|
|FailFlags||bit 0 motor failed, bit 1 motors balanced, should be 2 in normal flight|

## MSG
Textual messages

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|ID||identifier for chunks making up a message|
|Seq||chunk sequence number within message identified by ID|
|Message|char[64]|message text|

## MULT
Message mapping from single character to numeric multiplier

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id||character referenced by FMTU|
|Mult||numeric multiplier|

## NKF0
EKF2 beacon sensor diagnostics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF2 core this data is for|
|ID||Beacon sensor ID|
|rng|m|Beacon range|
|innov||Beacon range innovation|
|SIV||sqrt of beacon range innovation variance|
|TR||Beacon range innovation consistency test ratio|
|BPN|m|Beacon north position|
|BPE|m|Beacon east position|
|BPD|m|Beacon down position|
|OFH|m|High estimate of vertical position offset of beacons rel to EKF origin|
|OFL|m|Low estimate of vertical position offset of beacons rel to EKF origin|
|OFN|m|always zero|
|OFE|m|always zero|
|OFD|m|always zero|

## NKF1
EKF2 estimator outputs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF2 core this data is for|
|Roll|deg|Estimated roll|
|Pitch|deg|Estimated pitch|
|Yaw|degheading|Estimated yaw|
|VN|m/s|Estimated velocity (North component)|
|VE|m/s|Estimated velocity (East component)|
|VD|m/s|Estimated velocity (Down component)|
|dPD|m/s|Filtered derivative of vertical position (down)|
|PN|m|Estimated distance from origin (North component)|
|PE|m|Estimated distance from origin (East component)|
|PD|m|Estimated distance from origin (Down component)|
|GX|deg/s|Estimated gyro bias, X axis|
|GY|deg/s|Estimated gyro bias, Y axis|
|GZ|deg/s|Estimated gyro bias, Z axis|
|OH|m|Height of origin above WGS-84|

## NKF2
EKF2 estimator secondary outputs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF2 core this data is for|
|AZbias||Estimated accelerometer Z bias|
|GSX||Gyro Scale Factor (X-axis)|
|GSY||Gyro Scale Factor (Y-axis)|
|GSZ||Gyro Scale Factor (Z-axis)|
|VWN|m/s|Estimated wind velocity (moving-to-North component)|
|VWE|m/s|Estimated wind velocity (moving-to-East component)|
|MN|mGauss|Magnetic field strength (North component)|
|ME|mGauss|Magnetic field strength (East component)|
|MD|mGauss|Magnetic field strength (Down component)|
|MX|mGauss|Magnetic field strength (body X-axis)|
|MY|mGauss|Magnetic field strength (body Y-axis)|
|MZ|mGauss|Magnetic field strength (body Z-axis)|
|MI||Magnetometer used for data|

## NKF3
EKF2 innovations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF2 core this data is for|
|IVN|m/s|Innovation in velocity (North component)|
|IVE|m/s|Innovation in velocity (East component)|
|IVD|m/s|Innovation in velocity (Down component)|
|IPN|m|Innovation in position (North component)|
|IPE|m|Innovation in position (East component)|
|IPD|m|Innovation in position (Down component)|
|IMX|mGauss|Innovation in magnetic field strength (X-axis component)|
|IMY|mGauss|Innovation in magnetic field strength (Y-axis component)|
|IMZ|mGauss|Innovation in magnetic field strength (Z-axis component)|
|IYAW|deg|Innovation in vehicle yaw|
|IVT|UNKNOWN|Innovation in true-airspeed|
|RErr||Accumulated relative error of this core with respect to active primary core|
|ErSc||A consolidated error score where higher numbers are less healthy|

## NKF4
EKF2 variances  SV, SP, SH and SM are probably best described as 'Squared Innovation Test Ratios' where values <1 tells us the measurement was accepted and >1 tells us it was rejected. They represent the square of the (innovation / maximum allowed innovation) where the innovation is the difference between predicted and measured value and the maximum allowed innovation is determined from the uncertainty of the measurement, uncertainty of the prediction and scaled using the number of standard deviations set by the innovation gate parameter for that measurement, eg EK2_MAG_I_GATE, EK2_HGT_I_GATE, etc

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF2 core this data is for|
|SV||Square root of the velocity variance|
|SP||Square root of the position variance|
|SH||Square root of the height variance|
|SM||Magnetic field variance|
|SVT||tilt error convergence metric|
|errRP||Filtered error in roll/pitch estimate|
|OFN|m|Most recent position reset (North component)|
|OFE|m|Most recent position reset (East component)|
|FS|bitmask|Filter fault status|
|TS||Filter timeout status bitmask (0:position measurement, 1:velocity measurement, 2:height measurement, 3:magnetometer measurement, 4:airspeed measurement)|
|SS|bitmask|Filter solution status|
|GPS||Filter GPS status|
|PI||Primary core index|

## NKF5
EKF2 Sensor innovations (primary core) and general dumping ground

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF2 core this data is for|
|NI||Normalised flow variance|
|FIX||Optical flow LOS rate vector innovations from the main nav filter (X-axis)|
|FIY||Optical flow LOS rate vector innovations from the main nav filter (Y-axis)|
|AFI||Optical flow LOS rate innovation from terrain offset estimator|
|HAGL|m|Height above ground level|
|offset|UNKNOWN|Estimated vertical position of the terrain relative to the nav filter zero datum|
|RI|UNKNOWN|Range finder innovations|
|rng|UNKNOWN|Measured range|
|Herr|m|Filter ground offset state error|
|eAng|rad|Magnitude of angular error|
|eVel|m/s|Magnitude of velocity error|
|ePos|m|Magnitude of position error|

## NKQ
EKF2 quaternion defining the rotation from NED to XYZ (autopilot) axes

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF2 core this data is for|
|Q1||Quaternion a term|
|Q2||Quaternion b term|
|Q3||Quaternion c term|
|Q4||Quaternion d term|

## NKT
EKF2 timing information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF core this message instance applies to|
|Cnt|s|count of samples used to create this message|
|IMUMin|s|smallest IMU sample interval|
|IMUMax|s|largest IMU sample interval|
|EKFMin|s|low-passed achieved average time step rate for the EKF (minimum)|
|EKFMax|s|low-passed achieved average time step rate for the EKF (maximum)|
|AngMin|s|accumulated measurement time interval for the delta angle (minimum)|
|AngMax|s|accumulated measurement time interval for the delta angle (maximum)|
|VMin|s|accumulated measurement time interval for the delta velocity (minimum)|
|VMax|s|accumulated measurement time interval for the delta velocity (maximum)|

## NKY0
EKF Yaw Estimator States

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF core this data is for|
|YC|degheading|GSF yaw estimate (deg)|
|YCS|deg|GSF yaw estimate 1-Sigma uncertainty (deg)|
|Y0|degheading|Yaw estimate from individual EKF filter 0 (deg)|
|Y1|degheading|Yaw estimate from individual EKF filter 1 (deg)|
|Y2|degheading|Yaw estimate from individual EKF filter 2 (deg)|
|Y3|degheading|Yaw estimate from individual EKF filter 3 (deg)|
|Y4|degheading|Yaw estimate from individual EKF filter 4 (deg)|
|W0||Weighting applied to yaw estimate from individual EKF filter 0|
|W1||Weighting applied to yaw estimate from individual EKF filter 1|
|W2||Weighting applied to yaw estimate from individual EKF filter 2|
|W3||Weighting applied to yaw estimate from individual EKF filter 3|
|W4||Weighting applied to yaw estimate from individual EKF filter 4|

## NKY1
EKF Yaw Estimator Innovations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF core this data is for|
|IVN0|m/s|North velocity innovation from individual EKF filter 0 (m/s)|
|IVN1|m/s|North velocity innovation from individual EKF filter 1 (m/s)|
|IVN2|m/s|North velocity innovation from individual EKF filter 2 (m/s)|
|IVN3|m/s|North velocity innovation from individual EKF filter 3 (m/s)|
|IVN4|m/s|North velocity innovation from individual EKF filter 4 (m/s)|
|IVE0|m/s|East velocity innovation from individual EKF filter 0 (m/s)|
|IVE1|m/s|East velocity innovation from individual EKF filter 1 (m/s)|
|IVE2|m/s|East velocity innovation from individual EKF filter 2 (m/s)|
|IVE3|m/s|East velocity innovation from individual EKF filter 3 (m/s)|
|IVE4|m/s|East velocity innovation from individual EKF filter 4 (m/s)|

## NTP
Experimental waypoint trajectory tracking

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Index||Active mission waypoint index|
|Count||Number of corners in this transition|
|Prog||Projected trajectory time in seconds|
|End||Total trajectory time in seconds|
|XTrack||Signed cross-track error in metres|
|Rate||Planned heading rate in degrees per second|
|Roll||Requested bank in degrees|

## NTUN
Navigation Tuning information - e.g. vehicle destination

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Dist|m|distance to the current navigation waypoint|
|TBrg|deg|bearing to the current navigation waypoint|
|NavBrg|deg|the vehicle's desired heading|
|AltE|m|difference between current vehicle height and target height|
|XT|m|the vehicle's current distance from the current travel segment|
|XTi|cm|integration of the vehicle's crosstrack error|
|AsE|m/s|difference between vehicle's airspeed and desired airspeed|
|TLat|deglatitude|target latitude|
|TLng|deglongitude|target longitude|
|TAW|m|target altitude WP|
|TAT|m|target altitude TECS|
|TAsp|m/s|target airspeed|

## NVF
Named Value Float messages; messages sent to GCS via NAMED_VALUE_FLOAT

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Name|instance|Name of float|
|Value||Value of float|

## NVI
Named Value Int messages; messages sent to GCS via NAMED_VALUE_INT

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Name|instance|Name of int|
|Value||Value of int|

## NVS
Named Value String messages; messages sent to GCS via NAMED_VALUE_STRING

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Name|instance|Name of string|
|Value|char[64]|Value of string|

## OABR
Object avoidance (Bendy Ruler) diagnostics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Type||Type of BendyRuler currently active|
|Act||True if Bendy Ruler avoidance is being used|
|DYaw|deg|Best yaw chosen to avoid obstacle|
|Yaw|deg|Current vehicle yaw|
|DP|deg|Desired pitch chosen to avoid obstacle|
|RChg||True if BendyRuler resisted changing bearing and continued in last calculated bearing|
|Mar|m|Margin from path to obstacle on best yaw chosen|
|DLt|deglatitude|Destination latitude|
|DLg|deglongitude|Destination longitude|
|DAlt|m|Desired alt above EKF Origin|
|OLt|deglatitude|Intermediate location chosen for avoidance|
|OLg|deglongitude|Intermediate location chosen for avoidance|
|OAlt|m|Intermediate alt chosen for avoidance above EKF origin|

## OADJ
Object avoidance (Dijkstra) diagnostics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|State||Dijkstra avoidance library state|
|Err||Dijkstra library error condition|
|CurrPoint||Destination point in calculated path to destination|
|TotPoints||Number of points in path to destination|
|DLat|deglatitude|Destination latitude|
|DLng|deglongitude|Destination longitude|
|OALat|deglatitude|Object Avoidance chosen destination point latitude|
|OALng|deglongitude|Object Avoidance chosen destination point longitude|

## OAVG
Object avoidance path planning visgraph points

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|version||Visgraph version, increments each time the visgraph is re-generated|
|point_num||point number in visgraph|
|Lat|deglatitude|Latitude|
|Lon|deglongitude|longitude|

## OF
Optical flow sensor data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Qual||Estimated sensor data quality|
|flowX|rad/s|Sensor flow rate, X-axis|
|flowY|rad/s|Sensor flow rate,Y-axis|
|bodyX|rad/s|derived rotational velocity, X-axis|
|bodyY|rad/s|derived rotational velocity, Y-axis|

## OFCA
Optical Flow Calibration sample

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Axis|instance|Axis (X=0 Y=1)|
|Num||Sample number|
|FRate|rad/s|Flow rate|
|BRate|rad/s|Body rate|
|LPred|rad/s|Los pred|

## OFG
OFfboard-Guided - an advanced version of GUIDED for companion computers that includes rate/s.  

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Arsp|m/s|target airspeed cm|
|ArspA|m/s|target airspeed accel|
|Alt|m|target alt|
|AltA|m/s/s|target alt velocity (rate of change)|
|AltF||target alt frame (MAVLink)|
|Hdg|deg|target heading|
|HdgA||target heading lim|
|AltL||target alt frame (Location)|

## ORGN
Vehicle navigation origin or other notable position

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Type|instance|Position type|
|Lat|deglatitude|Position latitude|
|Lng|deglongitude|Position longitude|
|Alt|m|Position altitude|

## PARM
parameter value

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Name|char[16]|parameter name|
|Value||parameter value|
|Default||default parameter value for this board and config|

## PIDA
Proportional/Integral/Derivative gain values for vertical acceleration

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIDE
Proportional/Integral/Derivative gain values for East/West velocity

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIDG
Plane Proportional/Integral/Derivative gain values for Heading when using COMMAND_INT control.

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate|
|Flags|bitmask|bitmask of PID state flags|

## PIDN
Proportional/Integral/Derivative gain values for North/South velocity

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIDP
Proportional/Integral/Derivative gain values for Pitch rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIDR
Proportional/Integral/Derivative gain values for Roll rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIDS
Proportional/Integral/Derivative gain values for ground steering yaw rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIDW
Proportional/Integral/Derivative gain values for wheel rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIDY
Proportional/Integral/Derivative gain values for Yaw rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate used in slew limiter|
|Flags|bitmask|bitmask of PID state flags|

## PIQA
QuadPlane Proportional/Integral/Derivative gain values for vertical acceleration

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate|
|Flags|bitmask|bitmask of PID state flags|

## PIQP
QuadPlane Proportional/Integral/Derivative gain values for Pitch rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate|
|Flags|bitmask|bitmask of PID state flags|

## PIQR
QuadPlane Proportional/Integral/Derivative gain values for Roll rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate|
|Flags|bitmask|bitmask of PID state flags|

## PIQY
QuadPlane Proportional/Integral/Derivative gain values for Yaw rate

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tar||desired value|
|Act||achieved value|
|Err||error between target and achieved|
|P||proportional part of PID|
|I||integral part of PID|
|D||derivative part of PID|
|FF||controller feed-forward portion of response|
|DFF||controller derivative feed-forward portion of response|
|Dmod||scaler applied to D gain to reduce limit cycling|
|SRate||slew rate|
|Flags|bitmask|bitmask of PID state flags|

## PL
Precision Landing messages

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Heal||True if Precision Landing is healthy|
|TAcq||True if landing target is detected|
|pX|m|Target position relative to vehicle, X-Axis (0 if target not found)|
|pY|m|Target position relative to vehicle, Y-Axis (0 if target not found)|
|vX|m/s|Target velocity relative to vehicle, X-Axis (0 if target not found)|
|vY|m/s|Target velocity relative to vehicle, Y-Axis (0 if target not found)|
|mX|m|Target's relative to origin position as 3-D Vector, X-Axis|
|mY|m|Target's relative to origin position as 3-D Vector, Y-Axis|
|mZ|m|Target's relative to origin position as 3-D Vector, Z-Axis|
|LastMeasMS|ms|Time when target was last detected|
|EKFOutl||EKF's outlier count|
|Est||Type of estimator used|

## PM
autopilot system performance and general data dumping ground

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|LR|Hz|Main loop rate|
|NLon||Number of long loops detected|
|NL||Number of measurement loops for this message|
|MaxT||Maximum loop time|
|Mem|B|Free memory available|
|Load|d%|System processor load|
|ErrL||Internal error line number; last line number on which a internal error was detected|
|InE|bitmask|Internal error mask; which internal errors have been detected|
|ErC||Internal error count; how many internal errors have been detected|
|SPIC||Number of SPI transactions processed|
|I2CC||Number of i2c transactions processed|
|I2CI||Number of i2c interrupts serviced|
|Ex|μs|number of microseconds being added to each loop to address scheduler overruns|
|R|μs|RTC time, time since Unix epoch|

## POS
Canonical vehicle position

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Lat|deglatitude|Canonical vehicle latitude|
|Lng|deglongitude|Canonical vehicle longitude|
|Alt|m|Canonical vehicle altitude|
|RelHomeAlt|m|Canonical vehicle altitude relative to home|
|RelOriginAlt|m|Canonical vehicle altitude relative to navigation origin|

## POWR
System power information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Vcc|V|Flight board voltage|
|VServo|V|Servo rail voltage|
|Flags|bitmask|System power flags|
|AccFlags|bitmask|Accumulated System power flags; all flags which have ever been set|
|Safety||Hardware Safety Switch status|

## PRTN
Plane Parameter Tuning data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Set||Parameter set being tuned|
|Parm||Parameter being tuned|
|Value||Current parameter value|
|CenterValue||Center value (startpoint of current modifications) of parameter being tuned|

## PRX
Proximity Filtered sensor data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Layer|instance|Pitch(instance) at which the obstacle is at. 0th layer {-75,-45} degrees. 1st layer {-45,-15} degrees. 2nd layer {-15, 15} degrees. 3rd layer {15, 45} degrees. 4th layer {45,75} degrees. Minimum distance in each layer will be logged.|
|He||True if proximity sensor is healthy|
|D0|m|Nearest object in sector surrounding 0-degrees|
|D45|m|Nearest object in sector surrounding 45-degrees|
|D90|m|Nearest object in sector surrounding 90-degrees|
|D135|m|Nearest object in sector surrounding 135-degrees|
|D180|m|Nearest object in sector surrounding 180-degrees|
|D225|m|Nearest object in sector surrounding 225-degrees|
|D270|m|Nearest object in sector surrounding 270-degrees|
|D315|m|Nearest object in sector surrounding 315-degrees|
|DUp|m|Nearest object in upwards direction|
|CAn|degheading|Angle to closest object|
|CDis|m|Distance to closest object|

## PRXR
Proximity Raw sensor data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Layer|instance|Pitch(instance) at which the obstacle is at. 0th layer {-75,-45} degrees. 1st layer {-45,-15} degrees. 2nd layer {-15, 15} degrees. 3rd layer {15, 45} degrees. 4th layer {45,75} degrees. Minimum distance in each layer will be logged.|
|D0|m|Nearest object in sector surrounding 0-degrees|
|D45|m|Nearest object in sector surrounding 45-degrees|
|D90|m|Nearest object in sector surrounding 90-degrees|
|D135|m|Nearest object in sector surrounding 135-degrees|
|D180|m|Nearest object in sector surrounding 180-degrees|
|D225|m|Nearest object in sector surrounding 225-degrees|
|D270|m|Nearest object in sector surrounding 270-degrees|
|D315|m|Nearest object in sector surrounding 315-degrees|

## PSCD
Position Control Down

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|DPD|m|Desired position relative to EKF origin + Offsets|
|TPD|m|Target position relative to EKF origin|
|PD|m|Position relative to EKF origin|
|DVD|m/s|Desired velocity Down|
|TVD|m/s|Target velocity Down|
|VD|m/s|Velocity Down|
|DAD|m/s/s|Desired acceleration Down|
|TAD|m/s/s|Target acceleration Down|
|AD|m/s/s|Acceleration Down|

## PSCE
Position Control East

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|DPE|m|Desired position relative to EKF origin + Offsets|
|TPE|m|Target position relative to EKF origin|
|PE|m|Position relative to EKF origin|
|DVE|m/s|Desired velocity East|
|TVE|m/s|Target velocity East|
|VE|m/s|Velocity East|
|DAE|m/s/s|Desired acceleration East|
|TAE|m/s/s|Target acceleration East|
|AE|m/s/s|Acceleration East|

## PSCN
Position Control North

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|DPN|m|Desired position relative to EKF origin|
|TPN|m|Target position relative to EKF origin|
|PN|m|Position relative to EKF origin|
|DVN|m/s|Desired velocity North|
|TVN|m/s|Target velocity North|
|VN|m/s|Velocity North|
|DAN|m/s/s|Desired acceleration North|
|TAN|m/s/s|Target acceleration North|
|AN|m/s/s|Acceleration North|

## PSOD
Position Control Offsets Down

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|TPOD|m|Target position offset Down|
|POD|m|Position offset Down|
|TVOD|m/s|Target velocity offset Down|
|VOD|m/s|Velocity offset Down|
|TAOD|m/s/s|Target acceleration offset Down|
|AOD|m/s/s|Acceleration offset Down|

## PSOE
Position Control Offsets East

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|TPOE|m|Target position offset East|
|POE|m|Position offset East|
|TVOE|m/s|Target velocity offset East|
|VOE|m/s|Velocity offset East|
|TAOE|m/s/s|Target acceleration offset East|
|AOE|m/s/s|Acceleration offset East|

## PSON
Position Control Offsets North

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|TPON|m|Target position offset North|
|PON|m|Position offset North|
|TVON|m/s|Target velocity offset North|
|VON|m/s|Velocity offset North|
|TAON|m/s/s|Target acceleration offset North|
|AON|m/s/s|Acceleration offset North|

## PSOT
Position Control Offsets Terrain (Down)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|TPOT|m|Target position offset Terrain|
|POT|m|Position offset Terrain|
|TVOT|m/s|Target velocity offset Terrain|
|VOT|m/s|Velocity offset Terrain|
|TAOT|m/s/s|Target acceleration offset Terrain|
|AOT|m/s/s|Acceleration offset Terrain|

## QBRK
Quadplane Braking

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|SpdScaler||braking speed scaler|
|NPULCD||upper limit for navigation pitch|
|NPCD||demanded navigation pitch|

## QPOS
Quadplane position data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|State|enum|Position control state|
|Dist||Distance to next waypoint|
|TSpd||Target speed|
|TAcc||Target acceleration|
|OShoot||True if landing point is overshot or heading off by more than 60 degrees|

## QTUN
QuadPlane vertical tuning message

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|ThI||throttle input|
|ABst||angle boost|
|ThO||throttle output|
|ThH||calculated hover throttle|
|DAlt|m|desired altitude|
|Alt|m|achieved altitude|
|BAlt|m|barometric altitude|
|DCRt|m/s|desired climb rate|
|CRt|m/s|climb rate|
|TMix||transition throttle mix value|
|Trn||Transition state: 0-AirspeedWait,1-Timer,2-Done / TailSitter: 0-FW Wait,1-VTOL Wait,2-Done|
|Ast|bitmask|bitmask of assistance flags|

## QWIK
Quicktune

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|s|Time since system startup|
|ParamNo|instance|number of parameter being tuned|
|SRate||slew rate|
|Gain||test gain for current axis and PID element|
|Param|char[16]|name of parameter being being tuned|

## RAD
Telemetry radio statistics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|RSSI||RSSI|
|RemRSSI||RSSI reported from remote radio|
|TxBuf||number of bytes in radio ready to be sent|
|Noise||local noise floor|
|RemNoise||local noise floor reported from remote radio|
|RxErrors||damaged packet count|
|Fixed||fixed damaged packet count|

## RALY
Rally point information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tot||total number of rally points onboard|
|Seq||this rally point's sequence number|
|Lat|deglatitude|latitude of rally point|
|Lng|deglongitude|longitude of rally point|
|Alt|m|altitude of rally point|
|Flags||altitude frame flags|

## RASH
Replay Airspeed Sensor Header

|FieldName|Units/Type|Description|
|---|---|---|
|Primary||airspeed instance number|
|NumInst||number of airspeed instances|

## RASI
Replay Airspeed Sensor Instance data

|FieldName|Units/Type|Description|
|---|---|---|
|pd||measured airspeed|
|UpdateMS||timestamp of measured airspeed|
|H||indicator of airspeed sensor health|
|Use||true if airspeed is configured to be used|
|I|instance|airspeed instance number|

## RATE
Desired and achieved vehicle attitude rates. Not logged in Fixed Wing Plane modes.

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|RDes|deg/s|vehicle desired roll rate|
|R|deg/s|achieved vehicle roll rate|
|ROut||normalized output for Roll|
|PDes|deg/s|vehicle desired pitch rate|
|P|deg/s|vehicle pitch rate|
|POut||normalized output for Pitch|
|YDes|deg/s|vehicle desired yaw rate|
|Y|deg/s|achieved vehicle yaw rate|
|YOut||normalized output for Yaw|
|ADes|cm/s/s|desired vehicle vertical acceleration|
|A|cm/s/s|achieved vehicle vertical acceleration|
|AOut||percentage of vertical thrust output current being used|
|AOutSlew||vertical thrust output slew rate|

## RBCH
Replay Data Beacon Header

|FieldName|Units/Type|Description|
|---|---|---|
|PX||beacon system estimated vehicle position, North|
|PY||beacon system estimated vehicle position, East|
|PZ||beacon system estimated vehicle position, Down|
|AE||beacon system estimated vehicle position accuracy|
|OLat||origin latitude|
|OLng||origin longitude|
|OAlt||origin altitude|
|Flags||vehicle_position_ned_returncode,get_origin_returncode,enabled|
|NumInst||number of beacons|

## RBCI
Replay Data Beacon Instance

|FieldName|Units/Type|Description|
|---|---|---|
|LU|s|last update from this beacon instance|
|PX|m|beacon distance from origin, X-axis|
|PY|m|beacon distance from origin, Y-axis|
|PZ|m|beacon distance from origin, Z-axis|
|Dist|m|distance to beacon|
|H||beacon data health|
|I|instance|beacon instance number|

## RBOH
Replay body odometry data

|FieldName|Units/Type|Description|
|---|---|---|
|Q||data quality measure|
|DPX||delta-position-X|
|DPY||delta-position-Y|
|DPZ||delta-position-Z|
|DAX||delta-angle-X|
|DAY||delta-angle-Y|
|DAZ||delta-angle-Z|
|DT||delta-time|
|TS||data timestamp|
|OX||pos-offset-X|
|OY||pos-offset-Y|
|OZ||pos-offset-Z|
|D||delay in body odometry data|

## RBRH
Replay Data Barometer Header

|FieldName|Units/Type|Description|
|---|---|---|
|Primary||primary barometer instance number|
|NumInst||number of barometer sensors|

## RBRI
Replay Data Barometer Instance

|FieldName|Units/Type|Description|
|---|---|---|
|LastUpdate||timestamp of barometer data|
|Alt||barometer altitude estimate|
|H||barometer sensor health indication|
|I|instance|barometer instance number|

## RCDA
Raw RC data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|TS||data arrival timestamp|
|Prot||Protocol currently being decoded|
|Len||Number of valid bytes in message|
|U0||first quartet of bytes|
|U1||second quartet of bytes|
|U2||third quartet of bytes|
|U3||fourth quartet of bytes|
|U4||fifth quartet of bytes|
|U5||sixth quartet of bytes|
|U6||seventh quartet of bytes|
|U7||eight quartet of bytes|
|U8||ninth quartet of bytes|
|U9||tenth quartet of bytes|

## RCI2
(More) RC input channels to vehicle

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C15|us|channel 15 input|
|C16|us|channel 16 input|
|OMask||bitmask of RC channels being overridden by mavlink input|
|Flags|bitmask|bitmask of RC state flags|

## RCIN
RC input channels to vehicle

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C1|us|channel 1 input|
|C2|us|channel 2 input|
|C3|us|channel 3 input|
|C4|us|channel 4 input|
|C5|us|channel 5 input|
|C6|us|channel 6 input|
|C7|us|channel 7 input|
|C8|us|channel 8 input|
|C9|us|channel 9 input|
|C10|us|channel 10 input|
|C11|us|channel 11 input|
|C12|us|channel 12 input|
|C13|us|channel 13 input|
|C14|us|channel 14 input|

## RCO2
Servo channel output values 15 to 18

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C15|us|channel 15 output|
|C16|us|channel 16 output|
|C17|us|channel 17 output|
|C18|us|channel 18 output|

## RCO3
Servo channel output values 19 to 32

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C19|us|channel 19 output|
|C20|us|channel 20 output|
|C21|us|channel 21 output|
|C22|us|channel 22 output|
|C23|us|channel 23 output|
|C24|us|channel 24 output|
|C25|us|channel 25 output|
|C26|us|channel 26 output|
|C27|us|channel 27 output|
|C28|us|channel 28 output|
|C29|us|channel 29 output|
|C30|us|channel 30 output|
|C31|us|channel 31 output|
|C32|us|channel 32 output|

## RCOU
Servo channel output values 1 to 14

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C1|us|channel 1 output|
|C2|us|channel 2 output|
|C3|us|channel 3 output|
|C4|us|channel 4 output|
|C5|us|channel 5 output|
|C6|us|channel 6 output|
|C7|us|channel 7 output|
|C8|us|channel 8 output|
|C9|us|channel 9 output|
|C10|us|channel 10 output|
|C11|us|channel 11 output|
|C12|us|channel 12 output|
|C13|us|channel 13 output|
|C14|us|channel 14 output|

## RELY
Relay state

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|relay instance number|
|State||current state|

## REPH
Replay external position data

|FieldName|Units/Type|Description|
|---|---|---|
|PX||external position estimate, X-axis|
|PY||external position estimate, Y-axis|
|PZ||external position estimate, Z-axis|
|Q1||external attitude quaternion|
|Q2||external attitude quaternion|
|Q3||external attitude quaternion|
|Q4||external attitude quaternion|
|PEr||external position error estimate|
|AEr||external attitude error estimate|
|TS||timestamp on external error estimate|
|RT||timestamp of last external reset|
|D||delay on external data|

## REV2
Replay Event (EKF2)

|FieldName|Units/Type|Description|
|---|---|---|
|Event|enum|external event injected into EKF|

## REV3
Replay Event (EKF3)

|FieldName|Units/Type|Description|
|---|---|---|
|Event|enum|external event injected into EKF|

## REVH
Replay external velocity data

|FieldName|Units/Type|Description|
|---|---|---|
|VX||external velocity estimate, X-axis|
|VY||external velocity estimate, Y-axis|
|VZ||external velocity estimate, Z-axis|
|Er||error in velocity estimate|
|TS||timestamp of velocity estimate|
|D||delay in external velocity data|

## REY3
Replay Euler Yaw event

|FieldName|Units/Type|Description|
|---|---|---|
|yawangle|UNKNOWN|externally supplied yaw angle|
|yawangleerr|UNKNOWN|error in externally supplied yaw angle|
|timestamp_ms|UNKNOWN|timestamp associated with yaw angle and yaw angle error|
|type||number that needs documenting|

## RF
RealFlight mode messages

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Dt||delta time between this frame and the previous frame|
|Fps||frames-per-second implied by the current delta time|

## RFND
Rangefinder sensor information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|rangefinder instance number this data is from|
|Dist|m|Reported distance from sensor|
|Stat|enum|Sensor state|
|Orient|enum|Sensor orientation|
|Quality|%|Signal quality. -1 means invalid, 0 is no signal, 100 is perfect signal|
|Temp|degC|Temperature of the fluid (air or water) the rangefinder measures through, not the sensor internal temperature|

## RFNS
Rangefinder state

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|InUse||Whether the rangefinder is in use.|
|InRng||Whether the rangefinder is in range.|
|IRCnt||Count of in-range measurements|
|Ms0OK||Whether there has been an initial measurement.|
|Ms0|m|The initial measured range|
|Dst|m|The last recorded distance|
|Cor|m|The rangefinder correction|
|Cor0|m|The initial rangefinder correction|
|CorL|m|The last stable correction|
|TimeCL|ms|The last correction time|
|HE|m|Height estimate|

## RFRF
Replay FRame data - Finished frame

|FieldName|Units/Type|Description|
|---|---|---|
|FTypes|bitmask|accumulated method calls made during frame|
|Slow||true if we are not keeping up with IMU loop rate|

## RFRH
Replay FRame Header

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|TF||Time flying|

## RFRN
Replay FRame - aNother frame header

|FieldName|Units/Type|Description|
|---|---|---|
|HLat|1e-7 deglatitude|home latitude|
|HLon|1e-7 deglongitude|home latitude|
|HAlt|cm|home altitude AMSL|
|E2T||EAS to TAS factor|
|AM|B|available memory|
|TX|deg|AHRS trim X|
|TY|deg|AHRS trim Y|
|TZ|deg|AHRS trim Z|
|VC||AHRS Vehicle Class|
|EKT|enum|configured EKF type|
|Flags|bitmask|bitmask of boolean state|

## RGPH
Replay Data GPS Header

|FieldName|Units/Type|Description|
|---|---|---|
|NumInst||number of GPS sensors|
|Primary||instance number of primary sensor|

## RGPI
Replay Data GPS Instance, infrequently changing data

|FieldName|Units/Type|Description|
|---|---|---|
|OX||antenna body-frame offset, X-axis|
|OY||antenna body-frame offset, Y-axis|
|OZ||antenna body-frame offset, Z-axis|
|Lg||GPS time lag|
|Flags|bitmask|various GPS flags|
|Stat||GPS fix status|
|NSats||number of satellites GPS is using|
|I|instance|GPS sensor instance number|

## RGPJ
Replay Data GPS Instance - rapidly changing data

|FieldName|Units/Type|Description|
|---|---|---|
|TS||GPS data timestamp|
|VX||GPS velocity, North|
|VY||GPS velocity, East|
|VZ||GPS velocity, Down|
|SA||speed accuracy|
|Y||GPS yaw|
|YA||GPS yaw accuracy|
|YT||timestamp of GPS yaw estimate|
|Lat||latitude|
|Lon||longitude|
|Alt||altitude|
|HA||horizontal accuracy|
|VA||vertical accuracy|
|HD||HDOP|
|I|instance|GPS sensor instance number|

## RGPK
Replay Data GPS Instance - moving baseline yaw antenna offset (low-rate, only logged when changed)

|FieldName|Units/Type|Description|
|---|---|---|
|OX||moving baseline antenna offset used to calculate GPS yaw, X-axis|
|OY||moving baseline antenna offset used to calculate GPS yaw, Y-axis|
|OZ||moving baseline antenna offset used to calculate GPS yaw, Z-axis|
|I|instance|GPS sensor instance number|

## RICH
Richenpower generator telemetry

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|runTime||total generator runtime|
|maintTime||time until generator requires maintenance|
|errors||bitmask of error received from generator|
|rpm||current generator RPM|
|ovolt||output voltage|
|ocurr||output current|
|mode||generator mode; idle/run/charge/balance|

## RISH
Replay Inertial Sensor header

|FieldName|Units/Type|Description|
|---|---|---|
|LR||INS loop rate|
|PG||primary gyro index|
|PA||primary accel index|
|LD||INS loop-delta-t|
|AC||accel count|
|GC||gyro count|

## RISI
Replay Inertial Sensor instance data

|FieldName|Units/Type|Description|
|---|---|---|
|DVX||x-axis delta-velocity|
|DVY||y-axis delta-velocity|
|DVZ||z-axis delta-velocity|
|DAX||x-axis delta-angle|
|DAY||y-axis delta-angle|
|DAZ||z-axis delta-angle|
|DVDT||delta-velocity-delta-time|
|DADT||delta-angle-delta-time|
|Flags||use-accel, use-gyro, delta-vel-valid, delta-accel-valid|
|I|instance|IMU instance|

## RISJ
Replay Inertial Sensor instance metadata (low-rate, only logged when changed)

|FieldName|Units/Type|Description|
|---|---|---|
|GBL||gyro bias limit (rad/s) for the EKF gyro bias state clamp|
|GBI||initial gyro bias 1-sigma uncertainty (deg/s)|
|I|instance|IMU instance|

## RMGH
Replay Data Magnetometer Header

|FieldName|Units/Type|Description|
|---|---|---|
|Dec||vehicle declination|
|Avail||true if the compass library is marking itself as available|
|NumInst||number of compass instances|
|AutoDec||true if compass autodeclination is enabled|
|NumEna||number of enabled compass instances|
|LOE||true if compass learning of offsets is enabled|
|C||true if compasses are consistent|
|FUsable||index of first usable compass|

## RMGI
Replay Data Magnetometer Instance

|FieldName|Units/Type|Description|
|---|---|---|
|LU||last update time for magnetometer data|
|OX||mag sensor offset, X-axis|
|OY||mag sensor offset, Y-axis|
|OZ||mag sensor offset, Z-axis|
|FX||field strength, X-axis|
|FY||field strength, Y-axis|
|FZ||field strength, Z-axis|
|UFY||true if compass is being used for yaw|
|H||sensor health|
|HSF||compass has scale factor|
|I|instance|magnetometer instance number|

## ROFH
Replay optical flow data

|FieldName|Units/Type|Description|
|---|---|---|
|FX||raw flow rate, X-axis|
|FY||raw flow rate, Y-axis|
|GX||gyro rate, X-axis|
|GY||gyro rate, Y-axis|
|Tms||measurement timestamp|
|PX||gyro rate, X-axis|
|PY||body-frame offset, Y-axis|
|PZ||body-frame offset, Z-axis|
|HgtOvr||sensor height override|
|Qual||flow quality measurement|

## RPM
Data from RPM sensors

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|Instance|
|RPM|rpm|Sensor's rpm measurement|
|Qual||Signal quality|
|H||Sensor Health (Bool)|

## RRNH
Replay Data Rangefinder Header

|FieldName|Units/Type|Description|
|---|---|---|
|GCl|m|rangefinder ground clearance for downward-facing rangefinders|
|MaxD|m|rangefinder maximum distance for downward-facing rangefinders|
|NumSensors||number of rangefinder instances|

## RRNI
Replay Data Rangefinder Instance

|FieldName|Units/Type|Description|
|---|---|---|
|PX||rangefinder body-frame offset, X-axis|
|PY||rangefinder body-frame offset, Y-axis|
|PZ||rangefinder body-frame offset, Z-axis|
|Dist|m|Measured rangefinder distance|
|Orient||orientation|
|Status||status|
|I|instance|rangefinder instance number|

## RSLL
Replay Set Lat Lng event

|FieldName|Units/Type|Description|
|---|---|---|
|Lat|1e-7 deglatitude|latitude|
|Lng|1e-7 deglongitude|longitude|
|PosAccSD||position accuracy, 1-StD|
|TS||timestamp of latitude/longitude|

## RSO2
Replay Set Origin event (EKF2)

|FieldName|Units/Type|Description|
|---|---|---|
|Lat|1e-7 deglatitude|origin latitude|
|Lon|1e-7 deglongitude|origin longitude|
|Alt|cm|origin altitude|

## RSO3
Replay Set Origin event (EKF3)

|FieldName|Units/Type|Description|
|---|---|---|
|Lat|1e-7 deglatitude|origin latitude|
|Lon|1e-7 deglongitude|origin longitude|
|Alt|cm|origin altitude|

## RSSI
Received Signal Strength Indicator for RC receiver

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|RXRSSI||RSSI|
|RXLQ|%|RX Link Quality|

## RTC
RTC (Unix time) information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Epoch|μs|current unix epoch time*1000000 (ie. microseconds since Jan 1 1970)|
|SourceType|enum|source of RTC data|

## RTCM
GPS atmospheric perturbation data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Chan|instance|mavlink channel number this data was received on|
|RTCMId||ID field from RTCM packet|
|Len||RTCM packet length|
|CRC||calculated crc32 for the packet|

## RTER
Replay Terrain SRTM Altitude

|FieldName|Units/Type|Description|
|---|---|---|
|Alt|m|altitude above origin in meters|

## RVOH
Replay Data Visual Odometry data

|FieldName|Units/Type|Description|
|---|---|---|
|OX||offset, x-axis|
|OY||offset, y-axis|
|OZ||offset, z-axis|
|Del||data delay|
|H||sensor health|
|Ena||sensor enabled|

## RWA2
Replay set-default-airspeed event (EKF2)

|FieldName|Units/Type|Description|
|---|---|---|
|Airspeed|m/s|default airspeed|
|uncertainty|m/s|uncertainty in default airspeed|

## RWA3
Replay set-default-airspeed event (EKF3)

|FieldName|Units/Type|Description|
|---|---|---|
|Airspeed|m/s|default airspeed|
|Uncertainty|m/s|uncertainty in default airspeed|

## RWOH
Replay wheel odometry data

|FieldName|Units/Type|Description|
|---|---|---|
|DA||delta-angle|
|DT||delta-time|
|TS||data timestamp|
|PX||sensor body-frame offset, x-axis|
|PY||sensor body-frame offset, y-axis|
|PZ||sensor body-frame offset, z-axis|
|R||wheel radius|

## SA
Simple Avoidance messages

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|State||True if Simple Avoidance is active|
|DVelX|m/s|Desired velocity, X-Axis (Velocity before Avoidance)|
|DVelY|m/s|Desired velocity, Y-Axis (Velocity before Avoidance)|
|DVelZ|m/s|Desired velocity, Z-Axis (Velocity before Avoidance)|
|MVelX|m/s|Modified velocity, X-Axis (Velocity after Avoidance)|
|MVelY|m/s|Modified velocity, Y-Axis (Velocity after Avoidance)|
|MVelZ|m/s|Modified velocity, Z-Axis (Velocity after Avoidance)|
|Back||True if vehicle is backing away|

## SAF1
Simulated Blimp Sin-Angles

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|afx||sin(x angle)|
|afy||sin(y angle)|
|afz||sin(z angle)|

## SAN1
Simulated Blimp Angles

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|anx||x angle|
|any||y angle|
|anz||z angle|

## SAN2
Simulated Blimp Angles

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|anx||x earth-frame angle|
|any||y earth-frame angle|
|anz||z earth-frame angle|

## SBA1
Simulated Blimp Body-Frame accelerations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|ax||x-axis acceleration|
|ay||y-axis acceleration|
|az||z-axis acceleration|

## SBPH
Swift Health Data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|CrcError||Number of packet CRC errors on serial connection|
|LastInject||Timestamp of last raw data injection to GPS|
|IARhyp||Current number of integer ambiguity hypotheses|

## SBRE
Swift Time Data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GWk|UNKNOWN|GPS week number|
|GMS|UNKNOWN|Milliseconds through GPS week|
|ns_residual|UNKNOWN|residual of milliseconds rounding in ns|
|level|UNKNOWN|GPIO pin levels|
|quality|UNKNOWN|time quality|

## SCR
Scripting runtime stats

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Name|instance|script name|
|Runtime|μs|run time|
|Total_mem|B|total memory usage of all scripts|
|Run_mem|B|run memory usage|

## SCTL
Simulated Glider Drop control outputs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|Ail||aileron output|
|Elev||elevator output|
|Rudd||rudder output|

## SCVE
Debug message for SCurve internal error

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Sm||duration of the raised cosine jerk profile|
|Jm||maximum value of the raised cosine jerk profile|
|V0||initial velocity magnitude|
|Am||maximum constant acceleration|
|Vm||maximum constant velocity|
|L||Length of the path|
|Jm_out||maximum value of the raised cosine jerk profile|
|tj_out||segment duration|
|t2_out||segment duration|
|t4_out||segment duration|
|t6_out||segment duration|

## SFA1
Simulated Blimp Fin Angles

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|f0||fin 0 angle|
|f1||fin 1 angle|
|f2||fin 2 angle|
|f3||fin 3 angle|

## SFAN
Simulated Blimp Servo Angles

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|f0||fin 0 servo angle|
|f1||fin 1 servo angle|
|f2||fin 2 servo angle|
|f3||fin 3 servo angle|

## SFN
Simulated Blimp Fin Forces

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|n0||Fin 0 normal force|
|n1||Fin 1 normal force|
|n2||Fin 2 normal force|
|n3||Fin 3 normal force|

## SFT
Simulated Blimp Fin Thrust

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|f0||Fin 0 tangential thrust|
|f1||Fin 1 tangential thrust|
|f2||Fin 2 tangential thrust|
|f3||Fin 3 tangential thrust|

## SFV1
Simulated Blimp Fin Velocities

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|f0||fin 0 velocity|
|f1||fin 1 velocity|
|f2||fin 2 velocity|
|f3||fin 3 velocity|

## SIDD
System ID data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Time|s|Time reference for waveform|
|Targ||Current waveform sample|
|F|Hz|Instantaneous waveform frequency|
|Gx|deg/s|Delta angle, X-Axis|
|Gy|deg/s|Delta angle, Y-Axis|
|Gz|deg/s|Delta angle, Z-Axis|
|Ax|m/s/s|Delta velocity, X-Axis|
|Ay|m/s/s|Delta velocity, Y-Axis|
|Az|m/s/s|Delta velocity, Z-Axis|

## SIDP
System ID data for Plane

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|DRll|m/s/s|Desired Roll Angle|
|Rll|m/s/s|Roll Angle|
|DPit|m/s/s|Desired Pitch Angle|
|Pit|m/s/s|Pitch Angle|
|rdes|m/s/s|Desired Roll Rate|
|r|m/s/s|Measured Roll Rate|
|pdes|m/s/s|Desired Pitch Rate|
|p|m/s/s|Measured Pitch Rate|
|Aile|m/s/s|Aileron|
|Elev|m/s/s|Elevator|
|aspd|m/s/s|Speed_Scalar|
|eastas|m/s/s|EAS2TAS|

## SIDS
System ID settings

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Ax||The axis which is being excited|
|Mag||Magnitude of the chirp waveform|
|FSt|s|Frequency at the start of chirp|
|FSp|s|Frequency at the end of chirp|
|TFin|s|Time to reach maximum amplitude of chirp|
|TC|s|Time at constant frequency before chirp starts|
|TR|s|Time taken to complete chirp waveform|
|TFout|s|Time to reach zero amplitude after chirp finishes|

## SIM
SITL simulator state

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Roll|deg|Simulated roll|
|Pitch|deg|Simulated pitch|
|Yaw|degheading|Simulated yaw|
|Alt|m|Simulated altitude|
|Lat|deglatitude|Simulated latitude|
|Lng|deglongitude|Simulated longitude|
|Q1||Attitude quaternion component 1|
|Q2||Attitude quaternion component 2|
|Q3||Attitude quaternion component 3|
|Q4||Attitude quaternion component 4|

## SIM2
Additional simulator state

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|PN||North position from home|
|PE||East position from home|
|PD||Down position from home|
|VN||Velocity north|
|VE||Velocity east|
|VD||Velocity down|
|As||Airspeed|
|ASpdU||Achieved simulation speedup value|
|UFC||Number of times simulation paused for serial0 output|

## SITL
Simulation data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|VN||Velocity - North component|
|VE||Velocity - East component|
|VD||Velocity - Down component|
|AN||Acceleration - North component|
|AE||Acceleration - East component|
|AD||Acceleration - Down component|
|PN||Position - North component|
|PE||Position - East component|
|PD||Position - Down component|

## SL2
More Simulated Glider Dropped Calculations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|AltFt||altitude in feet|
|KEAS||equivalent airspeed in knots|
|KTAS||true airspeed in knots|
|AD||air density|
|Fl||lift|
|Fd||drag|
|LD||lift/drag ratio|
|Elev||elevator output|
|Ail||aileron output|
|Rud||rudder output|
|AoA||Angle of Attack|
|SSA||Side Slip Angle|
|q||air pressire|
|Az||z-axis body-frame acceleration|

## SLD
Simulated Glider Dropped Calculations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|AltFt||altitude in feet|
|AltM||altitude in metres|
|EAS||equivalent airspeed|
|TAS||true airspeed|
|AD||air density|
|Fl||lift|
|Fd||drag|
|LD||lift/drag ratio|
|Elev||elevator output|
|AoA||angle of attack|
|Fx||X-axis force|
|Fy||Y-axis force|
|Fz||Z-axis force|
|q||air pressure|

## SLUP
Slung payload

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Land||1 if payload is landed, 0 otherwise|
|Tens|1e2 %|Tension ratio, 1 if line is taut, 0 if slack|
|Len|m|Line length|
|PN|m|Payload position as offset from vehicle in North direction|
|PE|m|Payload position as offset from vehicle in East direction|
|PD|m|Payload position as offset from vehicle in Down direction|
|VN|m/s|Payload velocity in North direction|
|VE|m/s|Payload velocity in East direction|
|VD|m/s|Payload velocity in Down direction|
|AN|m/s/s|Payload acceleration in North direction|
|AE|m/s/s|Payload acceleration in East direction|
|AD|m/s/s|Payload acceleration in Down direction|
|VFN||Force on vehicle in North direction|
|VFE||Force on vehicle in East direction|
|VFD||Force on vehicle in Down direction|

## SLV1
Log data received from JSON simulator 1

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup (us)|
|Instance|instance|Slave instance|
|magic||magic JSON protocol key|
|frame_rate||Slave instance's desired frame rate|
|frame_count||Slave instance's current frame count|
|active||1 if the servo outputs are being used from this instance|

## SLV2
Log data received from JSON simulator 2

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|Slave instance|
|C1|us|channel 1 output|
|C2|us|channel 2 output|
|C3|us|channel 3 output|
|C4|us|channel 4 output|
|C5|us|channel 5 output|
|C6|us|channel 6 output|
|C7|us|channel 7 output|
|C8|us|channel 8 output|
|C9|us|channel 9 output|
|C10|us|channel 10 output|
|C11|us|channel 11 output|
|C12|us|channel 12 output|
|C13|us|channel 13 output|
|C14|us|channel 14 output|

## SMGC
Simulated Blimp Mass and COG

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|m||mass|
|g||gravity|
|cz||centre-of-gravity, z-axis|

## SMOO
Smoothed sensor data fed to EKF to avoid inconsistencies

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|AEx||Angular Velocity (around x-axis)|
|AEy||Angular Velocity (around y-axis)|
|AEz||Angular Velocity (around z-axis)|
|DPx||Velocity (along x-axis)|
|DPy||Velocity (along y-axis)|
|DPz||Velocity (along z-axis)|
|R||Roll|
|P||Pitch|
|Y||Yaw|
|R2||DCM Roll|
|P2||DCM Pitch|
|Y2||DCM Yaw|

## SMVZ
Simulated Volz servo information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id|instance|Volz servo ID|
|Pos|%|Current Simulated Position|
|DesPos|%|Desired Simulated Position|
|V|V|simulated servo voltage|
|A|A|simulated servo current|
|PCBT|degC|simulated PCB Temperature|
|MotT|degC|simulated motor Temperature|

## SOAR
Logged data from soaring feature ([Read more...](https://ardupilot.org/plane/docs/soaring.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||microseconds since system startup|
|nettorate||Estimate of vertical speed of surrounding airmass|
|x0||Thermal strength estimate|
|x1||Thermal radius estimate|
|x2||Thermal position estimate north from home|
|x3||Thermal position estimate east from home|
|north||Aircraft position north from home|
|east||Aircraft position east from home|
|alt||Aircraft altitude|
|dx_w||Wind speed north|
|dy_w||Wind speed east|
|th||Estimate of achievable climbrate in thermal|

## SORC
Soaring Cruise-phase data ([Read more...](https://ardupilot.org/plane/docs/soaring.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|wx||body-frame wind estimate, x-axis|
|wz||body-frame wind estimate, z-axis|
|wexp||estimated thermal vertical speed|
|CLmin||expected climb-rate lower-limit|
|CLmax||expected climb-rate upper-limit|
|Vopt||calculated optimal speed to fly|

## SPOL
Spool state logging

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Spl||Motors spool state|
|SplDes||Desired motors spool state|

## SRT1
Simulated Blimp Rotational forces

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|rtx||zero|
|rty||zero|
|rtz||zero|

## SRT2
Transformed Simulated Blimp Rotational forces

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|rtx||x-axis wobble rotational force|
|rty||y-axis wobble rotational force|
|rtz||z-axis wobble rotational force|

## SRT3
Simulated Blimp Torques

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|rtx||torque around x axis|
|rty||torque around y axis|
|rtz||torque around z axis|

## SRTL
SmartRTL statistics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Active||true if SmartRTL could be used right now|
|NumPts||number of points currently in use|
|MaxPts||maximum number of points that could be used|
|Action|enum|most recent internal action taken by SRTL library|
|N|m|point associated with most recent action (North component)|
|E|m|point associated with most recent action (East component)|
|D|m|point associated with most recent action (Down component)|

## SSAN
Simulated Blimp Servo Inputs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|f0||fin 0 servo angle input|
|f1||fin 1 servo angle input|
|f2||fin 2 servo angle input|
|f3||fin 3 servo angle input|

## STAK
Stack information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id|instance|thread ID|
|Pri||thread priority|
|Total||total stack|
|Free||free stack|
|Name|char[16]|thread name|

## STAT
Current status of the aircraft

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|isFlying||True if aircraft is probably flying|
|isFlyProb||Probability that the aircraft is flying|
|Armed||Arm status of the aircraft|
|Safety||State of the safety switch|
|Crash||True if crash is detected|
|Still||True when vehicle is not moving in any axis|
|Stage||Current stage of the flight|
|Hit||True if impact is detected|
|Sup||True if throttle is suppressed|

## SWSH
Helicopter swashplate logging

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|Swashplate instance|
|Col|deg|Blade pitch angle contribution from collective|
|TCyc|deg|Total blade pitch angle contribution from cyclic|
|PCyc|deg|Blade pitch angle contribution from pitch cyclic|
|RCyc|deg|Blade pitch angle contribution from roll cyclic|

## TCLR
Temperature Calibration Information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|temperature calibration instance number|
|SType||sensor type (0==accel, 1==gyro)|
|Temp||current temperature|
|X||x-axis sample sum|
|Y||y-axis sample sum|
|Z||z-axis sample sum|
|NSamp||sample count|

## TEC2
Additional information about the Total Energy Control System ([Read more...](http://ardupilot.org/plane/docs/tecs-total-energy-control-system-for-speed-height-tuning-guide.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|PEW||Potential energy weighting|
|KEW||Kinetic energy weighting|
|EBD|UNKNOWN|Energy balance demand|
|EBE|UNKNOWN|Energy balance estimate|
|EBDD|UNKNOWN|Energy balance rate demand|
|EBDE|UNKNOWN|Energy balance rate estimate|
|EBDDT||Energy balance rate demand + Energy balance rate error*pitch_damping|
|Imin||Minimum integrator value|
|Imax||Maximum integrator value|
|I||Energy balance error integral|
|KI||Pitch demand kinetic energy integral|
|tmin||Throttle min|
|tmax||Throttle max|

## TEC3
Additional additional information about the Total Energy Control System ([Read more...](http://ardupilot.org/plane/docs/tecs-total-energy-control-system-for-speed-height-tuning-guide.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|KED|UNKNOWN|Kinetic Energy Dot (1st derivative of KE)|
|PED|UNKNOWN|Potential Energy Dot (1st derivative of PE)|
|KEDD|UNKNOWN|Kinetic Energy Dot Demand|
|PEDD|UNKNOWN|Potential Energy Dot Demand|
|TEE|UNKNOWN|Total energy error|
|TEDE|UNKNOWN|Total energy dot error (1st derivative of total energy error)|
|FFT||feed-forward throttle|
|Imin||integrator limit based on throttle values|
|Imax||integrator limit based on throttle values|
|I||integrator state for throttle|
|Emin|UNKNOWN|lower limit for potential energy error|
|Emax|UNKNOWN|upper limit for potential energy error|

## TEC4
Additional additional additional information about the Total Energy Control System ([Read more...](http://ardupilot.org/plane/docs/tecs-total-energy-control-system-for-speed-height-tuning-guide.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|P|UNKNOWN|estimate of potential energy|
|K|UNKNOWN|estimate of kinetic energy|
|Pdem|UNKNOWN|demanded potential energy|
|Kdem|UNKNOWN|demanded kinetic energy|
|ClimbMax|m/s|Climb rate upper limit|
|ClimbMin|m/s|Climb rate lower limit|

## TECS
Information about the Total Energy Control System ([Read more...](http://ardupilot.org/plane/docs/tecs-total-energy-control-system-for-speed-height-tuning-guide.html))

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|h|m|height estimate (UP) currently in use by TECS|
|dh|m/s|current climb rate ("delta-height")|
|hin|m|height demand received by TECS|
|hdem|m|height demand after rate limiting and filtering that TECS is currently trying to achieve|
|dhdem|m/s|climb rate TECS is currently trying to achieve|
|spdem|m/s|True AirSpeed TECS is currently trying to achieve|
|sp|m/s|current estimated True AirSpeed|
|dsp|m/s|x-axis acceleration estimate ("delta-speed")|
|th||throttle output|
|ph||pitch output|
|pmin||pitch lower limit|
|pmax||pitch upper limit|
|dspdem||demanded acceleration output ("delta-speed demand")|
|f|bitmask|flags|

## TEMP
Temperature Sensor Data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|temperature sensor instance|
|Temp|degC|temperature|

## TERR
Terrain database information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Status|enum|Terrain database status|
|Lat|deglatitude|Current vehicle latitude|
|Lng|deglongitude|Current vehicle longitude|
|Spacing||terrain Tile spacing|
|TerrH|m|current Terrain height|
|CHeight|m|Vehicle height above terrain|
|Pending||Number of tile requests outstanding|
|Loaded||Number of tiles in memory|
|ROfs|m|terrain reference offset for arming altitude|

## TETH
Tether state

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Len||Tether length|
|VFN||Force on vehicle in North direction|
|VFE||Force on vehicle in East direction|
|VFD||Force on vehicle in Down direction|

## TILT
Tiltrotor tilt values

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tilt|deg|Current tilt angle, 0 deg vertical, 90 deg horizontal|
|FL|deg|Front left tilt angle, 0 deg vertical, 90 deg horizontal|
|FR|deg|Front right tilt angle, 0 deg vertical, 90 deg horizontal|

## TRIG
Camera shutter information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|Instance number|
|Img||Image number|
|GPSTime||milliseconds since start of GPS week|
|GPSWeek||weeks since 5 Jan 1980|
|Lat|deglatitude|current latitude|
|Lng|deglongitude|current longitude|
|Alt|m|current altitude|
|RelAlt|m|current altitude relative to home|
|GPSAlt|m|altitude as reported by GPS|
|R|deg|current vehicle roll|
|P|deg|current vehicle pitch|
|Y|deg|current vehicle yaw|

## TRMP
Torqeedo Motor Param

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|instance|
|RPM|rpm|Motor RPM|
|Pow|Watt|Motor power|
|Volt|V|Motor voltage|
|Cur|A|Motor current|
|ETemp|degC|ESC Temp|
|MTemp|degC|Motor Temp|

## TRMS
Torqeedo Motor Status

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|instance|
|State||Motor status flags|
|Err||Motor error flags|

## TRQD
Torqeedo Status

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|instance|
|Health||Health|
|DesMotSpeed||Desired Motor Speed (-1000 to 1000)|
|MotSpeed||Motor Speed (-1000 to 1000)|
|SuccCnt||Success Count|
|ErrCnt||Error Count|

## TRSE
Torqeedo System Setup

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|instance|
|Flag||Flags|
|MotType||Motor type|
|MotVer||Motor software version|
|BattCap|Ah|Battery capacity|
|BattPct|%|Battery charge percentage|
|BattType||Battery type|
|SwVer||Master software version|

## TRST
Torqeedo System State

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|instance|
|F||Flags bitmask|
|Err||Master error code|
|MVolt|V|Motor voltage|
|MCur|A|Motor current|
|Pow|Watt|Motor power|
|RPM|rpm|Motor RPM|
|MTemp|degC|Motor Temp (higher of pcb or stator)|
|BPct|%|Battery charge percentage|
|BVolt|V|Battery voltage|
|BCur|A|Battery current|

## TSIT
tailsitter speed scaling values

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Ts||throttle scaling used for tilt motors|
|Ss||speed scaling used for control surfaces method from Q_TAILSIT_GSCMSK|
|Tmin||minimum output throttle calculated from disk thoery gain scale with Q_TAILSIT_MIN_VO|

## TSYN
Time synchronisation response information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|SysID||system ID this data is for|
|RTT|μs|round trip time for this system|

## UART
UART stats

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|instance|
|Tx|B/s|transmitted data rate bytes per second|
|Rx|B/s|received data rate bytes per second, this is all incoming data, it may not all be processed by the driver using this port.|
|RxDp|B/s|Data rate of dropped received bytes, ideally should be 0. This is the difference between the received data rate and the processed data rate.|

## UBX1
uBlox-specific GPS information (part 1)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|GPS instance number|
|noisePerMS||noise level as measured by GPS|
|jamInd||jamming indicator; higher is more likely jammed|
|aPower||antenna power indicator; 2 is don't know|
|agcCnt||automatic gain control monitor|
|config||bitmask for messages which haven't been seen|

## UBX2
uBlox-specific GPS information (part 2)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Instance|instance|GPS instance number|
|ofsI||imbalance of I part of complex signal|
|magI||magnitude of I part of complex signal|
|ofsQ||imbalance of Q part of complex signal|
|magQ||magnitude of Q part of complex signal|

## UBXT
uBlox specific UBX-TIM-TM2 logging, see uBlox interface description

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|I|instance|GPS instance number|
|ch||Channel (i.e. EXTINT) upon which the pulse was measured|
|flags||Bitmask|
|count||Rising edge counter|
|wnR||Week number of last rising edge|
|MsR|ms|Tow of rising edge|
|SubMsR|ns|Millisecond fraction of tow of rising edge in nanoseconds|
|wnF||Week number of last falling edge|
|MsF|ms|Tow of falling edge|
|SubMsF|ns|Millisecond fraction of tow of falling edge in nanoseconds|
|accEst|ns|Accuracy estimate|

## UNIT
Message mapping from single character to SI unit

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Id||character referenced by FMTU|
|Label|char[64]|Unit - SI where available|

## VAR
Variometer data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS||Time since system startup|
|aspd_raw||always zero|
|aspd_filt||filtered and constrained airspeed|
|alt||AHRS altitude|
|roll||AHRS roll|
|raw||estimated air vertical speed|
|filt||low-pass filtered air vertical speed|
|cl||raw climb rate|
|fc||filtered climb rate|
|exs||expected sink rate relative to air in thermalling turn|
|dsp||average acceleration along X axis|
|dspb||detected bias in average acceleration along X axis|

## VER
Ardupilot version

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|BT|enum|Board type|
|BST|enum|Board subtype|
|Maj||Major version number|
|Min||Minor version number|
|Pat||Patch number|
|FWT||Firmware type|
|GH||Github commit|
|FWS|char[64]|Firmware version string|
|APJ||Board ID|
|BU|enum|Build vehicle type|
|FV||Filter version|
|IMI||IOMCU MCU ID|
|ICI||IOMCU CPU ID|

## VIBE
Processed (acceleration) vibration information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|IMU|instance|Vibration instance number|
|VibeX|m/s/s|Filtered accelerometer vibration, x-axis|
|VibeY|m/s/s|Filtered accelerometer vibration, y-axis|
|VibeZ|m/s/s|Filtered accelerometer vibration, z-axis|
|Clip||Number of clipping events on this accelerometer|

## VISO
Visual Odometry

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|System time|
|dt|μs|Time period this data covers|
|AngDX|rad|Angular change for body-frame roll axis|
|AngDY|rad|Angular change for body-frame pitch axis|
|AngDZ|rad|Angular change for body-frame z axis|
|PosDX|m|Position change for body-frame X axis (Forward-Back)|
|PosDY|m|Position change for body-frame Y axis (Right-Left)|
|PosDZ|m|Position change for body-frame Z axis (Down-Up)|
|conf||Confidence|

## VISP
Vision Position

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|System time|
|RTimeUS|μs|Remote system time|
|CTimeMS|ms|Corrected system time|
|PX|m|Position X-axis (North-South)|
|PY|m|Position Y-axis (East-West)|
|PZ|m|Position Z-axis (Down-Up)|
|R|deg|Roll lean angle|
|P|deg|Pitch lean angle|
|Y|degheading|Yaw angle|
|PErr|m|Position estimate error|
|AErr|deg|Attitude estimate error|
|Rst||Position reset counter|
|Ign||Ignored|
|Q|%|Quality|

## VISV
Vision Velocity

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|System time|
|RTimeUS|μs|Remote system time|
|CTimeMS|ms|Corrected system time|
|VX|m/s|Velocity X-axis (North-South)|
|VY|m/s|Velocity Y-axis (East-West)|
|VZ|m/s|Velocity Z-axis (Down-Up)|
|VErr|m/s|Velocity estimate error|
|Rst||Velocity reset counter|
|Ign||Ignored|
|Q|%|Quality|

## VNAT
VectorNav Attitude data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Q1||Attitude quaternion 1|
|Q2||Attitude quaternion 2|
|Q3||Attitude quaternion 3|
|Q4||Attitude quaternion 4|
|Yaw|deg|Yaw|
|Pitch|deg|Pitch|
|Roll|deg|Roll|
|YU|deg|Yaw unceratainty|
|PU|deg|Pitch uncertainty|
|RU|deg|Roll uncertainty|

## VNIM
VectorNav IMU data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Temp|deg|Temprature|
|Pres|Pa|Pressure|
|MX|Gauss|Magnetic feild X-axis|
|MY|Gauss|Magnetic feild Y-axis|
|MZ|Gauss|Magnetic feild Z-axis|
|AX|m/s/s|Acceleration X-axis|
|AY|m/s/s|Acceleration Y-axis|
|AZ|m/s/s|Acceleration Z-axis|
|GX|rad/s|Rotation rate X-axis|
|GY|rad/s|Rotation rate Y-axis|
|GZ|rad/s|Rotation rate Z-axis|

## VNKF
VectorNav INS Kalman Filter data

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|InsStatus||VectorNav INS health status|
|Lat|deg|Latitude|
|Lon|deg|Longitude|
|Alt|m|Altitude|
|VelN|m/s|Velocity Northing|
|VelE|m/s|Velocity Easting|
|VelD|m/s|Velocity Downing|
|PosU|deg|Filter estimated position uncertainty|
|VelU|m/s|Filter estimated Velocity uncertainty|

## VSTB
Log message for video stabilisation software such as Gyroflow

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|GyrX|rad/s|measured rotation rate about X axis|
|GyrY|rad/s|measured rotation rate about Y axis|
|GyrZ|rad/s|measured rotation rate about Z axis|
|AccX|m/s/s|acceleration along X axis|
|AccY|m/s/s|acceleration along Y axis|
|AccZ|m/s/s|acceleration along Z axis|
|Q1||Estimated attitude quaternion component 1|
|Q2||Estimated attitude quaternion component 2|
|Q3||Estimated attitude quaternion component 3|
|Q4||Estimated attitude quaternion component 4|

## WDOG
Watchdog diagnostics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Tsk||current task number|
|IE||internal error mast|
|IEC||internal error count|
|IEL||line internal error was raised on|
|MvMsg||mavlink message being acted on|
|MvCmd||mavlink command being acted on|
|SmLn||line semaphore was taken on|
|FL||fault_line|
|FT||fault_type|
|FA||fault address|
|FP||fault thread priority|
|ICSR||ICS regiuster|
|LR||long return address|
|TN|char[4]|Thread name|

## WENC
Wheel encoder measurements

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Dist0|m|First wheel distance travelled|
|Qual0||Quality measurement of Dist0|
|Dist1|m|Second wheel distance travelled|
|Qual1||Quality measurement of Dist1|

## WINC
Winch

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|Heal||Healthy|
|ThEnd||Reached end of thread|
|Mov||Motor is moving|
|Clut||Clutch is engaged (motor can move freely)|
|Mode||0 is Relaxed, 1 is Position Control, 2 is Rate Control|
|DLen|m|Desired Length|
|Len|m|Estimated Length|
|DRate|m/s|Desired Rate|
|Tens|UNKNOWN|Tension on line|
|Vcc|V|Voltage to Motor|
|Temp|degC|Motor temperature|

## WIND
Windvane readings

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|DrRaw|deg|raw apparent wind direction direct from sensor, in body-frame|
|DrApp|deg|Apparent wind direction, in body-frame|
|DrTru|degheading|True wind direction|
|SpdRaw|m/s|raw wind speed direct from sensor|
|SpdApp|m/s|Apparent wind Speed|
|SpdTru|m/s|True wind speed|

## XKF0
EKF3 beacon sensor diagnostics

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|ID||Beacon sensor ID|
|rng|m|Beacon range|
|innov||Beacon range innovation|
|SIV||sqrt of beacon range innovation variance|
|TR||Beacon range innovation consistency test ratio|
|BPN|m|Beacon north position|
|BPE|m|Beacon east position|
|BPD|m|Beacon down position|
|OFH|m|High estimate of vertical position offset of beacons rel to EKF origin|
|OFL|m|Low estimate of vertical position offset of beacons rel to EKF origin|
|OFN|m|North position of receiver rel to EKF origin|
|OFE|m|East position of receiver rel to EKF origin|
|OFD|m|Down position of receiver rel to EKF origin|

## XKF1
EKF3 estimator outputs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|Roll|deg|Estimated roll|
|Pitch|deg|Estimated pitch|
|Yaw|degheading|Estimated yaw|
|VN|m/s|Estimated velocity (North component)|
|VE|m/s|Estimated velocity (East component)|
|VD|m/s|Estimated velocity (Down component)|
|dPD|m/s|Filtered derivative of vertical position (down)|
|PN|m|Estimated distance from origin (North component)|
|PE|m|Estimated distance from origin (East component)|
|PD|m|Estimated distance from origin (Down component)|
|GX|deg/s|Estimated gyro bias, X axis|
|GY|deg/s|Estimated gyro bias, Y axis|
|GZ|deg/s|Estimated gyro bias, Z axis|
|OH|m|Height of origin above WGS-84|

## XKF2
EKF3 estimator secondary outputs

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|AX||Estimated accelerometer X bias|
|AY||Estimated accelerometer Y bias|
|AZ||Estimated accelerometer Z bias|
|VWN|m/s|Estimated wind velocity (moving-to-North component)|
|VWE|m/s|Estimated wind velocity (moving-to-East component)|
|MN|mGauss|Magnetic field strength (North component)|
|ME|mGauss|Magnetic field strength (East component)|
|MD|mGauss|Magnetic field strength (Down component)|
|MX|mGauss|Magnetic field strength (body X-axis)|
|MY|mGauss|Magnetic field strength (body Y-axis)|
|MZ|mGauss|Magnetic field strength (body Z-axis)|
|IDX|m/s/s|Innovation in vehicle drag acceleration (X-axis component)|
|IDY|m/s/s|Innovation in vehicle drag acceleration (Y-axis component)|
|IS|rad|Innovation in vehicle sideslip|

## XKF3
EKF3 innovations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|IVN|m/s|Innovation in velocity (North component)|
|IVE|m/s|Innovation in velocity (East component)|
|IVD|m/s|Innovation in velocity (Down component)|
|IPN|m|Innovation in position (North component)|
|IPE|m|Innovation in position (East component)|
|IPD|m|Innovation in position (Down component)|
|IMX|mGauss|Innovation in magnetic field strength (X-axis component)|
|IMY|mGauss|Innovation in magnetic field strength (Y-axis component)|
|IMZ|mGauss|Innovation in magnetic field strength (Z-axis component)|
|IYAW|deg|Innovation in vehicle yaw|
|IVT|UNKNOWN|Innovation in true-airspeed|
|RErr||Accumulated relative error of this core with respect to active primary core|
|ErSc||A consolidated error score where higher numbers are less healthy|

## XKF4
EKF3 variances.  SV, SP, SH and SM are probably best described as 'Squared Innovation Test Ratios' where values <1 tells us the measurement was accepted and >1 tells us it was rejected. They represent the square of the (innovation / maximum allowed innovation) where the innovation is the difference between predicted and measured value and the maximum allowed innovation is determined from the uncertainty of the measurement, uncertainty of the prediction and scaled using the number of standard deviations set by the innovation gate parameter for that measurement, eg EK3_MAG_I_GATE, EK3_HGT_I_GATE, etc

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|SV||Square root of the velocity variance|
|SP||Square root of the position variance|
|SH||Square root of the height variance|
|SM||Magnetic field variance|
|SVT||Square root of the total airspeed variance|
|errRP||Filtered error in roll/pitch estimate|
|OFN|m|Most recent position reset (North component)|
|OFE|m|Most recent position reset (East component)|
|FS|bitmask|Filter fault status|
|TS||Filter timeout status bitmask (0:position measurement, 1:velocity measurement, 2:height measurement, 3:magnetometer measurement, 4:airspeed measurement, 5:drag measurement)|
|SS|bitmask|Filter solution status|
|GPS||Filter GPS status|
|PI||Primary core index|

## XKF5
EKF3 Sensor innovations (primary core) and general dumping ground

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|NI||Normalised flow variance|
|FIX||Optical flow LOS rate vector innovations from the main nav filter (X-axis)|
|FIY||Optical flow LOS rate vector innovations from the main nav filter (Y-axis)|
|AFI||Optical flow LOS rate innovation from terrain offset estimator|
|HAGL|m|Height above ground level|
|TOfs|UNKNOWN|Estimated vertical position of the terrain relative to the nav filter zero datum|
|RI|UNKNOWN|Range finder innovations|
|rng|UNKNOWN|Measured range|
|Herr|m|Filter ground offset state error|
|eAng|rad|Magnitude of angular error|
|eVel|m/s|Magnitude of velocity error|
|ePos|m|Magnitude of position error|
|BOf|m|Barometer offset subtracted from raw baro measurement when fusing baro height|

## XKFA
EKF3 AGL Kalman Filter state (optionally used in Optical Flow scaling)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|HAgl|m|AGL height estimate|
|VAgl|m/s|AGL velocity estimate|
|HAglStd|m|Std-dev of AGL height estimate|
|VAglStd|m/s|Std-dev of AGL velocity estimate|
|Valid||1 when rangefinder has been fused within the last 5s|

## XKFD
EKF3 Body Frame Odometry errors

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|IX||Innovation in velocity (X-axis)|
|IY||Innovation in velocity (Y-axis)|
|IZ||Innovation in velocity (Z-axis)|
|IVX||Variance in velocity (X-axis)|
|IVY||Variance in velocity (Y-axis)|
|IVZ||Variance in velocity (Z-axis)|

## XKFM
EKF3 diagnostic data for on-ground-and-not-moving check

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF core this message instance applies to|
|OGNM||True of on ground and not moving|
|GLR||Gyroscope length ratio|
|ALR||Accelerometer length ratio|
|GDR||Gyroscope rate of change ratio|
|ADR||Accelerometer rate of change ratio|

## XKFS
EKF3 sensor selection

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|MI||compass selection index|
|BI||barometer selection index|
|GI||GPS selection index|
|AI||airspeed selection index|
|SS||Source Set (primary=0/secondary=1/tertiary=2)|
|GPS_GTA||GPS good to align|
|GPS_CHK_WAIT||Waiting for GPS checks to pass|
|MAG_FUSION||Magnetometer fusion (0=not fusing/1=fuse yaw/2=fuse mag/3=fuse mag with yaw anchored)|

## XKQ
EKF3 quaternion defining the rotation from NED to XYZ (autopilot) axes

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|Q1|UNKNOWN|Quaternion a term|
|Q2|UNKNOWN|Quaternion b term|
|Q3|UNKNOWN|Quaternion c term|
|Q4|UNKNOWN|Quaternion d term|

## XKT
EKF3 timing information

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF core this message instance applies to|
|Cnt|s|count of samples used to create this message|
|IMUMin|s|smallest IMU sample interval|
|IMUMax|s|largest IMU sample interval|
|EKFMin|s|low-passed achieved average time step rate for the EKF (minimum)|
|EKFMax|s|low-passed achieved average time step rate for the EKF (maximum)|
|AngMin|s|accumulated measurement time interval for the delta angle (minimum)|
|AngMax|s|accumulated measurement time interval for the delta angle (maximum)|
|VMin|s|accumulated measurement time interval for the delta velocity (minimum)|
|VMax|s|accumulated measurement time interval for the delta velocity (maximum)|

## XKTV
EKF3 Yaw Estimator States

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|TVS|rad|Tilt Error Variance from symbolic equations (rad^2)|
|TVD|rad|Tilt Error Variance from difference method (rad^2)|

## XKV1
EKF3 State variances (primary core)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|V00||Variance for state 0 (attitude quaternion)|
|V01||Variance for state 1 (attitude quaternion)|
|V02||Variance for state 2 (attitude quaternion)|
|V03||Variance for state 3 (attitude quaternion)|
|V04||Variance for state 4 (velocity-north)|
|V05||Variance for state 5 (velocity-east)|
|V06||Variance for state 6 (velocity-down)|
|V07||Variance for state 7 (position-north)|
|V08||Variance for state 8 (position-east)|
|V09||Variance for state 9 (position-down)|
|V10||Variance for state 10 (delta-angle-bias-x)|
|V11||Variance for state 11 (delta-angle-bias-y)|

## XKV2
more EKF3 State Variances (primary core)

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF3 core this data is for|
|V12||Variance for state 12 (delta-angle-bias-z)|
|V13||Variance for state 13 (delta-velocity-bias-x)|
|V14||Variance for state 14 (delta-velocity-bias-y)|
|V15||Variance for state 15 (delta-velocity-bias-z)|
|V16||Variance for state 16 (Earth-frame mag-field-bias-x)|
|V17||Variance for state 17 (Earth-frame mag-field-bias-y)|
|V18||Variance for state 18 (Earth-frame mag-field-bias-z)|
|V19||Variance for state 19 (body-frame mag-field-bias-x)|
|V20||Variance for state 20 (body-frame mag-field-bias-y)|
|V21||Variance for state 21 (body-frame mag-field-bias-z)|
|V22||Variance for state 22 (wind-north)|
|V23||Variance for state 23 (wind-east)|

## XKY0
EKF Yaw Estimator States

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF core this data is for|
|YC|degheading|GSF yaw estimate (deg)|
|YCS|deg|GSF yaw estimate 1-Sigma uncertainty (deg)|
|Y0|degheading|Yaw estimate from individual EKF filter 0 (deg)|
|Y1|degheading|Yaw estimate from individual EKF filter 1 (deg)|
|Y2|degheading|Yaw estimate from individual EKF filter 2 (deg)|
|Y3|degheading|Yaw estimate from individual EKF filter 3 (deg)|
|Y4|degheading|Yaw estimate from individual EKF filter 4 (deg)|
|W0||Weighting applied to yaw estimate from individual EKF filter 0|
|W1||Weighting applied to yaw estimate from individual EKF filter 1|
|W2||Weighting applied to yaw estimate from individual EKF filter 2|
|W3||Weighting applied to yaw estimate from individual EKF filter 3|
|W4||Weighting applied to yaw estimate from individual EKF filter 4|

## XKY1
EKF Yaw Estimator Innovations

|FieldName|Units/Type|Description|
|---|---|---|
|TimeUS|μs|Time since system startup|
|C|instance|EKF core this data is for|
|IVN0|m/s|North velocity innovation from individual EKF filter 0 (m/s)|
|IVN1|m/s|North velocity innovation from individual EKF filter 1 (m/s)|
|IVN2|m/s|North velocity innovation from individual EKF filter 2 (m/s)|
|IVN3|m/s|North velocity innovation from individual EKF filter 3 (m/s)|
|IVN4|m/s|North velocity innovation from individual EKF filter 4 (m/s)|
|IVE0|m/s|East velocity innovation from individual EKF filter 0 (m/s)|
|IVE1|m/s|East velocity innovation from individual EKF filter 1 (m/s)|
|IVE2|m/s|East velocity innovation from individual EKF filter 2 (m/s)|
|IVE3|m/s|East velocity innovation from individual EKF filter 3 (m/s)|
|IVE4|m/s|East velocity innovation from individual EKF filter 4 (m/s)|


