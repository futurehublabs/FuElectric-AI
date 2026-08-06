# data.py
"""
FuElectric-AI Version 2.0 Diagnostic Knowledge Base
Stores diagnostic data only (no logic).
"""

RISK_LOW="Low"
RISK_MEDIUM="Medium"
RISK_HIGH="High"
RISK_CRITICAL="Critical"

HOME_APPLIANCE_FAULTS={
"not starting":{
"id":"HA001","category":"Electrical","severity":3,"is_emergency":False,
"causes":["Power supply failure","Blown fuse","Faulty switch"],
"risk_level":RISK_MEDIUM,
"recommendations":["Check power source","Inspect the fuse","Test the switch"],
"repair_time":"30 minutes - 1 hour",
"tools":["Multimeter","Screwdriver set"],
"spare_parts":["Fuse","Switch"],
"safety_precautions":["Disconnect power before inspection"],
"preventive_maintenance":["Inspect power cable monthly","Replace damaged fuses only with correct rating"],
"skill_level":"Beginner"},
"high temperature":{
"id":"HA002","category":"Thermal","severity":4,"is_emergency":False,
"causes":["Blocked ventilation","Overloaded circuit","Faulty thermostat"],
"risk_level":RISK_HIGH,
"recommendations":["Switch off and allow to cool","Clear blockages","Inspect thermostat"],
"repair_time":"1 - 2 hours",
"tools":["Multimeter","Thermometer"],
"spare_parts":["Thermostat"],
"safety_precautions":["Do not touch hot surfaces","Allow full cooldown before inspection"],
"preventive_maintenance":["Clean vents regularly","Avoid overloading"],
"skill_level":"Intermediate"},
"noise":{
"id":"HA003","category":"Mechanical","severity":2,"is_emergency":False,
"causes":["Loose components","Worn bearings","Foreign object inside"],
"risk_level":RISK_LOW,
"recommendations":["Tighten loose parts","Inspect bearings","Check for foreign objects"],
"repair_time":"30 minutes - 1 hour",
"tools":["Screwdriver set","Flashlight"],
"spare_parts":["Bearings"],
"safety_precautions":["Switch off before inspecting"],
"preventive_maintenance":["Inspect fasteners monthly","Lubricate moving parts"],
"skill_level":"Beginner"},
"smoke":{
"id":"HA004","category":"Electrical","severity":5,"is_emergency":True,
"causes":["Burnt wiring","Overloaded equipment"],
"risk_level":RISK_CRITICAL,
"recommendations":["Switch off power immediately","Do not continue using equipment","Contact a qualified technician"],
"repair_time":"2+ hours (technician required)",
"tools":["Multimeter","Insulation tester"],
"spare_parts":["Wiring","Circuit breaker"],
"safety_precautions":["Do NOT touch equipment","Evacuate if smoke is heavy","Use extinguisher only if trained"],
"preventive_maintenance":["Inspect wiring periodically","Avoid overload"],
"skill_level":"Professional"},
"constant vibrating":{
"id":"HA005","category":"Mechanical","severity":4,"is_emergency":False,
"causes":["Loose mounting bolts","Worn bearings","Unbalanced rotating components"],
"risk_level":RISK_HIGH,
"recommendations":["Tighten mounting bolts","Inspect bearings","Balance rotating components"],
"repair_time":"1 - 3 hours",
"tools":["Wrench set","Vibration meter"],
"spare_parts":["Bearings","Mounting bolts"],
"safety_precautions":["Switch off before inspection"],
"preventive_maintenance":["Check alignment","Inspect bearings regularly"],
"skill_level":"Intermediate"},
"burning smell":{
"id":"HA006","category":"Electrical","severity":5,"is_emergency":True,
"causes":["Overheating components","Insulation breakdown","Electrical short circuit"],
"risk_level":RISK_CRITICAL,
"recommendations":["Switch off power immediately","Stop using equipment","Contact technician"],
"repair_time":"2+ hours (technician required)",
"tools":["Multimeter","Insulation tester"],
"spare_parts":["Wiring","Insulation material"],
"safety_precautions":["Do NOT touch equipment","Ensure ventilation"],
"preventive_maintenance":["Inspect insulation","Avoid overload"],
"skill_level":"Professional"},
"sparking":{
"id":"HA007","category":"Electrical","severity":5,"is_emergency":True,
"causes":["Loose electrical connections","Damaged wiring","Faulty switch or socket"],
"risk_level":RISK_CRITICAL,
"recommendations":["Switch off power immediately","Avoid contact","Contact technician"],
"repair_time":"1 - 2 hours (technician required)",
"tools":["Multimeter","Insulated screwdriver"],
"spare_parts":["Switch","Socket","Wiring"],
"safety_precautions":["Do NOT touch sparking components","Keep flammables away"],
"preventive_maintenance":["Tighten terminals","Inspect cables"],
"skill_level":"Professional"},
"power fluctuation":{
"id":"HA008","category":"Power","severity":3,"is_emergency":False,
"causes":["Unstable power supply","Faulty voltage regulator","Loose connections"],
"risk_level":RISK_MEDIUM,
"recommendations":["Check power supply","Inspect voltage regulator","Tighten connections"],
"repair_time":"1 hour",
"tools":["Multimeter","Voltage tester"],
"spare_parts":["Voltage regulator"],
"safety_precautions":["Disconnect power before inspection"],
"preventive_maintenance":["Use surge protector","Inspect regulator"],
"skill_level":"Intermediate"},
"frequent tripping":{
"id":"HA009","category":"Electrical","severity":4,"is_emergency":False,
"causes":["Overloaded circuit","Faulty circuit breaker","Short circuit"],
"risk_level":RISK_HIGH,
"recommendations":["Reduce load","Inspect breaker","Check for shorts"],
"repair_time":"1 - 2 hours",
"tools":["Multimeter","Circuit tester"],
"spare_parts":["Circuit breaker"],
"safety_precautions":["Switch off power before inspection"],
"preventive_maintenance":["Avoid overloading","Test breakers"],
"skill_level":"Intermediate"},
"low performance":{
"id":"HA010","category":"Performance","severity":2,"is_emergency":False,
"causes":["Worn components","Insufficient power supply","Dirty or clogged parts"],
"risk_level":RISK_LOW,
"recommendations":["Clean or replace worn components","Check power supply","Clean clogged parts"],
"repair_time":"30 minutes - 1 hour",
"tools":["Screwdriver set","Cleaning kit"],
"spare_parts":["Filters","Worn components"],
"safety_precautions":["Switch off before cleaning"],
"preventive_maintenance":["Clean regularly","Replace filters on schedule"],
"skill_level":"Beginner"}
}

 