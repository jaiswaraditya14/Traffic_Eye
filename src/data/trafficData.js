/**
 * Traffic Eye — Maharashtra Traffic Information Data
 * Comprehensive data: offences, fines, signs, rules, tips
 */

// ── Offences & Fines ──────────────────────────────────────────
export const OFFENCES_FINES = [
  {"offence": "Riding without helmet by Driver", "fine": "\u20b91,000", "section": "Sec 129/194(D) MVA", "category": "Safety", "severity": "medium", "description": "Details regarding Riding without helmet by Driver", "penalty": "\u20b91,000"},
  {"offence": "Without Seatbelt", "fine": "\u20b91,000", "section": "Sec 194B(1) MVA", "category": "Safety", "severity": "medium", "description": "Details regarding Without Seatbelt", "penalty": "\u20b91,000"},
  {"offence": "Drive a motor cycle with triple seat", "fine": "\u20b91,000", "section": "Sec 128(1)/194(C) MVA", "category": "Safety", "severity": "medium", "description": "Details regarding Drive a motor cycle with triple seat", "penalty": "\u20b91,000"},
  {"offence": "Tinted glasses / Black Film", "fine": "\u20b9500", "section": "CMVR 100(2)/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Tinted glasses / Black Film", "penalty": "\u20b9500"},
  {"offence": "Illegal Number Plate", "fine": "\u20b91,000", "section": "CMVR 51/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Illegal Number Plate", "penalty": "\u20b91,000"},
  {"offence": "Child up to 14 years age not provided appropriate child restraint", "fine": "\u20b91,000", "section": "Sec 194B(2) MVA", "category": "Safety", "severity": "medium", "description": "Details regarding Child up to 14 years age not provided appropriate child restraint", "penalty": "\u20b91,000"},
  {"offence": "Driving Without L Board", "fine": "\u20b9500", "section": "CMVR 3(C)/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Driving Without L Board", "penalty": "\u20b9500"},
  {"offence": "Registration Number/Letters Not Prescribed Measurement", "fine": "\u20b9500", "section": "CMVR 51/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Registration Number/Letters Not Prescribed Measurement", "penalty": "\u20b9500"},
  {"offence": "Without Light after sunset", "fine": "\u20b9500", "section": "CMVR 105/177 MVA", "category": "Safety", "severity": "high", "description": "Details regarding Without Light after sunset", "penalty": "\u20b9500"},
  {"offence": "Without Parking Light", "fine": "\u20b9500", "section": "CMVR 109/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Without Parking Light", "penalty": "\u20b9500"},
  {"offence": "Tyres not in good and sound condition", "fine": "\u20b9500", "section": "CMVR 94(3)/177 MVA", "category": "Safety", "severity": "high", "description": "Details regarding Tyres not in good and sound condition", "penalty": "\u20b9500"},
  {"offence": "Without Red Reflector", "fine": "\u20b91,000", "section": "CMVR 104(1)/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Without Red Reflector", "penalty": "\u20b91,000"},
  {"offence": "Driving Without indicator", "fine": "\u20b9500", "section": "CMVR 103/177 MVA", "category": "Safety", "severity": "medium", "description": "Details regarding Driving Without indicator", "penalty": "\u20b9500"},
  {"offence": "Visibility of number plate on front and rear", "fine": "\u20b9500", "section": "CMVR 50/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Visibility of number plate on front and rear", "penalty": "\u20b9500"},
  {"offence": "Without Side mirror", "fine": "\u20b9500", "section": "MMVR 161/177 MVA", "category": "Safety", "severity": "medium", "description": "Details regarding Without Side mirror", "penalty": "\u20b9500"},
  {"offence": "Without Mud guard", "fine": "\u20b9500", "section": "MMVR 165/177 MVA", "category": "Safety", "severity": "low", "description": "Details regarding Without Mud guard", "penalty": "\u20b9500"},
  {"offence": "Speed violating by driver (2-3 wheeler)", "fine": "\u20b91,000", "section": "Sec 112/183(1) MVA", "category": "Speeding", "severity": "medium", "description": "Details regarding Speed violating by driver (2-3 wheeler)", "penalty": "\u20b91,000"},
  {"offence": "Speed violating by driver (LMV)", "fine": "\u20b92,000", "section": "Sec 112/183(1) MVA", "category": "Speeding", "severity": "medium", "description": "Details regarding Speed violating by driver (LMV)", "penalty": "\u20b92,000"},
  {"offence": "Speed violating by driver (MMV - HMV)", "fine": "\u20b94,000", "section": "Sec 112/183(1) MVA", "category": "Speeding", "severity": "high", "description": "Details regarding Speed violating by driver (MMV - HMV)", "penalty": "\u20b94,000"},
  {"offence": "Racing / Speed test violation", "fine": "\u20b95,000", "section": "Sec 189 MVA", "category": "Speeding", "severity": "critical", "description": "Details regarding Racing / Speed test violation", "penalty": "\u20b95,000"},
  {"offence": "Speed violating by driver (Tractor)", "fine": "\u20b91,500", "section": "Sec 112/183(1) MVA", "category": "Speeding", "severity": "medium", "description": "Details regarding Speed violating by driver (Tractor)", "penalty": "\u20b91,500"},
  {"offence": "Jumping signal", "fine": "\u20b9500", "section": "MMVR 239/177 MVA", "category": "Signals", "severity": "high", "description": "Details regarding Jumping signal", "penalty": "\u20b9500"},
  {"offence": "Disobedience of Police order/direction", "fine": "\u20b9750", "section": "Sec 179(1) MVA", "category": "Signals", "severity": "medium", "description": "Details regarding Disobedience of Police order/direction", "penalty": "\u20b9750"},
  {"offence": "One way traffic sign not obeyed", "fine": "\u20b9500", "section": "Sec 119/177 MVA", "category": "Signals", "severity": "high", "description": "Details regarding One way traffic sign not obeyed", "penalty": "\u20b9500"},
  {"offence": "Overtaking from left", "fine": "Court", "section": "MVDR 14(2)/177A MVA", "category": "Signals", "severity": "high", "description": "Details regarding Overtaking from left", "penalty": "Court"},
  {"offence": "Wrong side driving", "fine": "Court", "section": "MVDR 4/122 177A MVA", "category": "Signals", "severity": "critical", "description": "Details regarding Wrong side driving", "penalty": "Court"},
  {"offence": "Police manual signal violation", "fine": "\u20b9500", "section": "MMVR 239/177 MVA", "category": "Signals", "severity": "high", "description": "Details regarding Police manual signal violation", "penalty": "\u20b9500"},
  {"offence": "Police stop violation", "fine": "\u20b9500", "section": "MMVR 239/177 MVA", "category": "Signals", "severity": "high", "description": "Details regarding Police stop violation", "penalty": "\u20b9500"},
  {"offence": "Overtaking on a bend/corner/turning", "fine": "Court", "section": "MVDR 14(5)(d)/177A MVA", "category": "Signals", "severity": "high", "description": "Details regarding Overtaking on a bend/corner/turning", "penalty": "Court"},
  {"offence": "Overtaking at junctions/intersections/zebra", "fine": "Court", "section": "MVDR 14(5)(e)/177A MVA", "category": "Signals", "severity": "high", "description": "Details regarding Overtaking at junctions/intersections/zebra", "penalty": "Court"},
  {"offence": "Turning left/right without hand signal", "fine": "Court", "section": "MVDR 11(1)/177A MVA", "category": "Signals", "severity": "low", "description": "Details regarding Turning left/right without hand signal", "penalty": "Court"},
  {"offence": "Mandatory traffic sign boards not obeyed", "fine": "\u20b9500", "section": "Sec 119/177 MVA.", "category": "Signals", "severity": "high", "description": "Details regarding Mandatory traffic sign boards not obeyed", "penalty": "\u20b9500"},
  {"offence": "U-turn at prohibited U turn place", "fine": "Court", "section": "Sec 99/117 MPA 1951", "category": "Signals", "severity": "medium", "description": "Details regarding U-turn at prohibited U turn place", "penalty": "Court"},
  {"offence": "No entry / One way Traffic Signs violated", "fine": "Court", "section": "Sec 99/117 MPA 1951", "category": "Signals", "severity": "high", "description": "Details regarding No entry / One way Traffic Signs violated", "penalty": "Court"},
  {"offence": "Drunk and Drive", "fine": "Court", "section": "Sec 185 MVA", "category": "Dangerous", "severity": "critical", "description": "Details regarding Drunk and Drive", "penalty": "Court"},
  {"offence": "Dangerous driving", "fine": "Court", "section": "Sec 184 MVA", "category": "Dangerous", "severity": "critical", "description": "Details regarding Dangerous driving", "penalty": "Court"},
  {"offence": "Not providing way for emergency vehicles", "fine": "\u20b910,000", "section": "Sec 194E MVA", "category": "Dangerous", "severity": "critical", "description": "Details regarding Not providing way for emergency vehicles", "penalty": "\u20b910,000"},
  {"offence": "Road safety standards violation (Driver)", "fine": "\u20b91,000", "section": "Sec 190(2) MVA", "category": "Dangerous", "severity": "high", "description": "Details regarding Road safety standards violation (Driver)", "penalty": "\u20b91,000"},
  {"offence": "Driving of defective motor vehicle", "fine": "Court", "section": "Sec 190(1) MVA", "category": "Dangerous", "severity": "high", "description": "Details regarding Driving of defective motor vehicle", "penalty": "Court"},
  {"offence": "Driving Without valid License Below 16 Years", "fine": "\u20b95,000", "section": "Sec 4(1)/181 MVA", "category": "Dangerous", "severity": "critical", "description": "Details regarding Driving Without valid License Below 16 Years", "penalty": "\u20b95,000"},
  {"offence": "Obstruction to Driver / Front seating", "fine": "\u20b9500", "section": "Sec 125/177 MVA", "category": "Dangerous", "severity": "medium", "description": "Details regarding Obstruction to Driver / Front seating", "penalty": "\u20b9500"},
  {"offence": "Unsafe-dangerous transportation Of goods", "fine": "\u20b9500", "section": "MMVR 202/177MVA", "category": "Dangerous", "severity": "high", "description": "Details regarding Unsafe-dangerous transportation Of goods", "penalty": "\u20b9500"},
  {"offence": "Unsafe Towing while towing another vehicle", "fine": "\u20b9500", "section": "MMVR 226/177 MVA", "category": "Dangerous", "severity": "high", "description": "Details regarding Unsafe Towing while towing another vehicle", "penalty": "\u20b9500"},
  {"offence": "Driving vehicle on Footpath/Cycle track", "fine": "\u20b9500", "section": "MMVR 228/177 MVA", "category": "Dangerous", "severity": "high", "description": "Details regarding Driving vehicle on Footpath/Cycle track", "penalty": "\u20b9500"},
  {"offence": "Driving backwards/reverse on road", "fine": "\u20b9500", "section": "MMVR 233/177 MVA", "category": "Dangerous", "severity": "high", "description": "Details regarding Driving backwards/reverse on road", "penalty": "\u20b9500"},
  {"offence": "Without Silencer", "fine": "\u20b9500", "section": "MMVR 232/177 MVA", "category": "Dangerous", "severity": "medium", "description": "Details regarding Without Silencer", "penalty": "\u20b9500"},
  {"offence": "Riding on Running Board Outside Vehicle", "fine": "\u20b9500", "section": "Sec 123/177 MVA", "category": "Dangerous", "severity": "critical", "description": "Details regarding Riding on Running Board Outside Vehicle", "penalty": "\u20b9500"},
  {"offence": "Lane cutting", "fine": "Court", "section": "MVDR 6(1)/177A MVA", "category": "Dangerous", "severity": "medium", "description": "Details regarding Lane cutting", "penalty": "Court"},
  {"offence": "Use of handheld communication devices (LMV)", "fine": "\u20b92,000", "section": "Sec 184C MVA", "category": "Distraction", "severity": "high", "description": "Details regarding Use of handheld communication devices (LMV)", "penalty": "\u20b92,000"},
  {"offence": "Driver watching digital videos while driving", "fine": "\u20b9500", "section": "MMVR 162/177 MVA", "category": "Distraction", "severity": "medium", "description": "Details regarding Driver watching digital videos while driving", "penalty": "\u20b9500"},
  {"offence": "Sounds the horn needlessly or continuously", "fine": "\u20b91,000", "section": "Sec 194F(a)(i) MVA", "category": "Distraction", "severity": "low", "description": "Details regarding Sounds the horn needlessly or continuously", "penalty": "\u20b91,000"},
  {"offence": "Sound horn in traffic sign prohibiting horn", "fine": "\u20b91,000", "section": "Sec 194F(a)(ii) MVA", "category": "Distraction", "severity": "medium", "description": "Details regarding Sound horn in traffic sign prohibiting horn", "penalty": "\u20b91,000"},
  {"offence": "Loud music played in vehicle", "fine": "\u20b9500", "section": "MMVR 231(1)/177 MVA", "category": "Distraction", "severity": "low", "description": "Details regarding Loud music played in vehicle", "penalty": "\u20b9500"},
  {"offence": "Dazzling Light", "fine": "\u20b9500", "section": "MMVR 235/177 MVA", "category": "Distraction", "severity": "high", "description": "Details regarding Dazzling Light", "penalty": "\u20b9500"},
  {"offence": "Driving Without valid License", "fine": "\u20b95,000", "section": "Sec 3(1)/181 MVA", "category": "Documents", "severity": "high", "description": "Details regarding Driving Without valid License", "penalty": "\u20b95,000"},
  {"offence": "Without valid Insurance (Driver)", "fine": "\u20b92,000", "section": "Sec 146/196 MVA", "category": "Documents", "severity": "high", "description": "Details regarding Without valid Insurance (Driver)", "penalty": "\u20b92,000"},
  {"offence": "Without valid Insurance (Owner)", "fine": "\u20b92,000", "section": "Sec 146/196 MVA", "category": "Documents", "severity": "high", "description": "Details regarding Without valid Insurance (Owner)", "penalty": "\u20b92,000"},
  {"offence": "Without valid Registration Any Vehicle", "fine": "\u20b92,000", "section": "Sec 39/192(1) MVA", "category": "Documents", "severity": "high", "description": "Details regarding Without valid Registration Any Vehicle", "penalty": "\u20b92,000"},
  {"offence": "Without valid fitness certificate", "fine": "\u20b92,000", "section": "Sec 56/39/192 MVA", "category": "Documents", "severity": "high", "description": "Details regarding Without valid fitness certificate", "penalty": "\u20b92,000"},
  {"offence": "Failed to produce valid PUCC", "fine": "\u20b9500", "section": "CMVR 115(7)/177 MVA", "category": "Documents", "severity": "medium", "description": "Details regarding Failed to produce valid PUCC", "penalty": "\u20b9500"},
  {"offence": "Without valid permit (Driver)", "fine": "\u20b910,000", "section": "Sec 66(I)/192(A) MVA", "category": "Documents", "severity": "critical", "description": "Details regarding Without valid permit (Driver)", "penalty": "\u20b910,000"},
  {"offence": "Failed to Produce Documents Within 15 Days", "fine": "\u20b9500", "section": "CMVR 139/177 MVA", "category": "Documents", "severity": "low", "description": "Details regarding Failed to Produce Documents Within 15 Days", "penalty": "\u20b9500"},
  {"offence": "License Disqualified Driver", "fine": "\u20b910,000", "section": "Sec 19 to 20/182 (1) MVA", "category": "Documents", "severity": "critical", "description": "Details regarding License Disqualified Driver", "penalty": "\u20b910,000"},
  {"offence": "Driver unfit (Physically/Mentally)", "fine": "\u20b91,000", "section": "Sec 186 MVA", "category": "Documents", "severity": "high", "description": "Details regarding Driver unfit (Physically/Mentally)", "penalty": "\u20b91,000"},
  {"offence": "Driver with two licenses in his name", "fine": "\u20b9750", "section": "Sec 6(1)/179 MVA", "category": "Documents", "severity": "medium", "description": "Details regarding Driver with two licenses in his name", "penalty": "\u20b9750"},
  {"offence": "Excess passenger 1 (Driver)", "fine": "\u20b9200", "section": "Sec 194A MVA", "category": "Overloading", "severity": "low", "description": "Details regarding Excess passenger 1 (Driver)", "penalty": "\u20b9200"},
  {"offence": "Excess passengers 2 (Driver)", "fine": "\u20b9400", "section": "Sec 194A MVA", "category": "Overloading", "severity": "low", "description": "Details regarding Excess passengers 2 (Driver)", "penalty": "\u20b9400"},
  {"offence": "Excess passengers 3 (Driver)", "fine": "\u20b9600", "section": "Sec 194A MVA", "category": "Overloading", "severity": "medium", "description": "Details regarding Excess passengers 3 (Driver)", "penalty": "\u20b9600"},
  {"offence": "Excess passengers 4 (Driver)", "fine": "\u20b9800", "section": "Sec 194A MVA", "category": "Overloading", "severity": "medium", "description": "Details regarding Excess passengers 4 (Driver)", "penalty": "\u20b9800"},
  {"offence": "Excess passengers 5 (Driver)", "fine": "\u20b91,000", "section": "Sec 194A MVA", "category": "Overloading", "severity": "medium", "description": "Details regarding Excess passengers 5 (Driver)", "penalty": "\u20b91,000"},
  {"offence": "Excess passengers 6 (Driver)", "fine": "\u20b91,200", "section": "Sec 194A MVA", "category": "Overloading", "severity": "high", "description": "Details regarding Excess passengers 6 (Driver)", "penalty": "\u20b91,200"},
  {"offence": "Excess passengers 10 (Driver)", "fine": "\u20b92,000", "section": "Sec 194A MVA", "category": "Overloading", "severity": "high", "description": "Details regarding Excess passengers 10 (Driver)", "penalty": "\u20b92,000"},
  {"offence": "Carriage of persons in goods vehicle", "fine": "\u20b9500", "section": "MMVR 108/177 MVA", "category": "Overloading", "severity": "medium", "description": "Details regarding Carriage of persons in goods vehicle", "penalty": "\u20b9500"},
  {"offence": "Unsafe goods beyond body", "fine": "\u20b9500", "section": "CMVR 93(8)/177 MVA", "category": "Overloading", "severity": "high", "description": "Details regarding Unsafe goods beyond body", "penalty": "\u20b9500"},
  {"offence": "Dangerous projection", "fine": "\u20b9500", "section": "MMVR 163/177 MVA", "category": "Overloading", "severity": "high", "description": "Details regarding Dangerous projection", "penalty": "\u20b9500"},
  {"offence": "Load extends to height beyond Limits (Transport)", "fine": "\u20b9500", "section": "CMVR 93(4)/177 MVA", "category": "Overloading", "severity": "high", "description": "Details regarding Load extends to height beyond Limits (Transport)", "penalty": "\u20b9500"},
  {"offence": "Double parking", "fine": "Court", "section": "MVDR 22(2)(n)/177A MVA", "category": "Parking", "severity": "medium", "description": "Details regarding Double parking", "penalty": "Court"},
  {"offence": "Parking on footpath / cycle track / zebra", "fine": "Court", "section": "MVDR 22(2)(c)/177A MVA", "category": "Parking", "severity": "high", "description": "Details regarding Parking on footpath / cycle track / zebra", "penalty": "Court"},
  {"offence": "Parking on road with >50KM speed limit", "fine": "Court", "section": "MVDR 22(2)(b)/177A MVA", "category": "Parking", "severity": "high", "description": "Details regarding Parking on road with >50KM speed limit", "penalty": "Court"},
  {"offence": "Parking in No Parking area", "fine": "Court", "section": "MVDR 22(2)(s)/177A MVA", "category": "Parking", "severity": "medium", "description": "Details regarding Parking in No Parking area", "penalty": "Court"},
  {"offence": "NO PARKING (Clamping)", "fine": "Court", "section": "MVDR 22(2)(s)/177A MVA", "category": "Parking", "severity": "high", "description": "Details regarding NO PARKING (Clamping)", "penalty": "Court"},
  {"offence": "Parking near bus stop/hospital/school entry", "fine": "Court", "section": "MVDR 22(2)(f)/177A MVA", "category": "Parking", "severity": "high", "description": "Details regarding Parking near bus stop/hospital/school entry", "penalty": "Court"},
  {"offence": "Parking vehicle in a tunnel", "fine": "Court", "section": "MVDR 22(2)(g)/177A MVA", "category": "Parking", "severity": "critical", "description": "Details regarding Parking vehicle in a tunnel", "penalty": "Court"},
  {"offence": "Obstructing other vehicle/inconvenience to person", "fine": "Court", "section": "MVDR 22(2)(m)/177A MVA", "category": "Parking", "severity": "medium", "description": "Details regarding Obstructing other vehicle/inconvenience to person", "penalty": "Court"},
  {"offence": "Stop out of stand (Motor Cab)", "fine": "\u20b9500", "section": "MMVR 21(5)/177 MVA", "category": "Public Transport", "severity": "low", "description": "Details regarding Stop out of stand (Motor Cab)", "penalty": "\u20b9500"},
  {"offence": "Insufficient fuel (Motor Cab)", "fine": "\u20b9500", "section": "MMVR 21(14)/177 MVA", "category": "Public Transport", "severity": "low", "description": "Details regarding Insufficient fuel (Motor Cab)", "penalty": "\u20b9500"},
  {"offence": "Meter flag down on stand (Motor Cab)", "fine": "\u20b9500", "section": "MMVR 21(7)/177 MVA", "category": "Public Transport", "severity": "low", "description": "Details regarding Meter flag down on stand (Motor Cab)", "penalty": "\u20b9500"},
  {"offence": "Faulty Meter (Motor Cab)", "fine": "\u20b9500", "section": "MMVR 146/177 MVA", "category": "Public Transport", "severity": "medium", "description": "Details regarding Faulty Meter (Motor Cab)", "penalty": "\u20b9500"},
  {"offence": "Driver without white Uniform (Motor Cab)", "fine": "\u20b9500", "section": "MMVR 21(18)/177 MVA", "category": "Public Transport", "severity": "low", "description": "Details regarding Driver without white Uniform (Motor Cab)", "penalty": "\u20b9500"},
  {"offence": "Without Cab Drivers I-Card", "fine": "\u20b9500", "section": "MMVR 21(18)/177 MVA", "category": "Public Transport", "severity": "low", "description": "Details regarding Without Cab Drivers I-Card", "penalty": "\u20b9500"},
  {"offence": "Shouting for passenger (Motor Cab)", "fine": "\u20b9500", "section": "MMVR 21(13)/177 MVA", "category": "Public Transport", "severity": "low", "description": "Details regarding Shouting for passenger (Motor Cab)", "penalty": "\u20b9500"},
  {"offence": "Refusal to ply auto Rickshaw/carry passenger", "fine": "\u20b950", "section": "Sec 178(3) MVA", "category": "Public Transport", "severity": "high", "description": "Details regarding Refusal to ply auto Rickshaw/carry passenger", "penalty": "\u20b950"},
  {"offence": "Refusal to ply taxi/bus/carry passenger", "fine": "\u20b9200", "section": "Sec 178(3) MVA", "category": "Public Transport", "severity": "high", "description": "Details regarding Refusal to ply taxi/bus/carry passenger", "penalty": "\u20b9200"},
  {"offence": "Demanding excess fare from the passenger", "fine": "\u20b9500", "section": "MMVR 21(12)/177", "category": "Public Transport", "severity": "high", "description": "Details regarding Demanding excess fare from the passenger", "penalty": "\u20b9500"},
  {"offence": "Misbehaviour towards passenger & others", "fine": "\u20b9500", "section": "MMVR 21(17)/177 MVA", "category": "Public Transport", "severity": "critical", "description": "Details regarding Misbehaviour towards passenger & others", "penalty": "\u20b9500"},
];

// ── Traffic Signs ──────────────────────────────────────────────
export const TRAFFIC_SIGNS = [
  {
    category: 'Mandatory Signs',
    color: '#DC2626',   // Red
    shape: 'circle',   // circle with red border
    description: 'Must be obeyed — circular with red border.',
    items: [
      { name: 'Stop', icon: 'hand-left', meaning: 'Bring vehicle to complete halt before stop line.', usage: 'Major intersections' },
      { name: 'No Entry', icon: 'close-circle', meaning: 'No vehicles allowed to enter this road.', usage: 'One-way streets, restricted zones' },
      { name: 'No Parking', icon: 'ban', meaning: 'Vehicles must not be parked here at any time.', usage: 'Busy roads, fire hydrant zones' },
      { name: 'No Horn', icon: 'volume-mute', meaning: 'Use of horn prohibited in this zone.', usage: 'Hospital zones, silence areas' },
      { name: 'Speed Limit 40', icon: 'speedometer', meaning: 'Maximum speed limit is 40 km/h.', usage: 'City roads, school zones' },
    ],
  },
  {
    category: 'Warning Signs',
    color: '#F59E0B',   // Amber
    shape: 'triangle', // triangular
    description: 'Alert you to hazards ahead — triangular, yellow.',
    items: [
      { name: 'Sharp Bend', icon: 'return-down-forward', meaning: 'Very sharp curve ahead, reduce speed.', usage: 'Hilly roads, blind turns' },
      { name: 'School Ahead', icon: 'school', meaning: 'Children crossing — drive slowly and carefully.', usage: 'Near schools & institutions' },
      { name: 'Speed Breaker', icon: 'trending-up', meaning: 'Road hump or speed breaker ahead.', usage: 'Residential zones, markets' },
      { name: 'Narrow Road', icon: 'git-merge-outline', meaning: 'Road narrows — merge carefully.', usage: 'Bridges, under construction zones' },
      { name: 'Slippery Road', icon: 'snow', meaning: 'Road surface may be slippery.', usage: 'Wet or oiled surfaces' },
    ],
  },
  {
    category: 'Informational Signs',
    color: '#1D4ED8',   // Blue
    shape: 'rectangle', // rectangular
    description: 'Provide guidance and directions — rectangular, blue.',
    items: [
      { name: 'Hospital', icon: 'medkit', meaning: 'Medical facility nearby — quiet zone.', usage: 'Near hospitals, clinics' },
      { name: 'Parking', icon: 'car', meaning: 'Parking area available ahead.', usage: 'Commercial zones, malls' },
      { name: 'Petrol Pump', icon: 'flash', meaning: 'Fuel station ahead.', usage: 'Highways, remote areas' },
      { name: 'First Aid', icon: 'bandage', meaning: 'First aid post or health facility nearby.', usage: 'Highways, accident-prone zones' },
    ],
  },
];

// ── Traffic Rules / Road Safety ────────────────────────────────
export const TRAFFIC_RULES = [
  {
    category: 'Signals & Right of Way',
    icon: 'traffic-cone',
    color: '#F59E0B',
    rules: [
      {
        title: 'Stop at Red Light',
        explanation: 'Bring your vehicle to a complete halt before the stop line when the signal is red.',
        whyItMatters: 'Prevents intersection collisions and protects pedestrians crossing.',
      },
      {
        title: 'Yield on Amber',
        explanation: 'Amber is a warning — prepare to stop, not an invitation to speed through.',
        whyItMatters: 'Amber-light rushing is a major cause of T-bone accidents.',
      },
      {
        title: 'Follow Traffic Officers',
        explanation: 'In absence of signals, obey the hand signals of on-duty traffic police.',
        whyItMatters: 'Maintains order during signal failures and emergency diversions.',
      },
    ],
  },
  {
    category: 'Speed & Safe Distance',
    icon: 'speedometer',
    color: '#002452',
    rules: [
      {
        title: 'Observe Zone Speed Limits',
        explanation: 'Maintain 20–30 km/h in schools, hospitals and residential colonies.',
        whyItMatters: 'Dramatically reduces collision severity near vulnerable road users.',
      },
      {
        title: 'Maintain 3-Second Gap',
        explanation: 'Keep a minimum 3-second following distance from the vehicle ahead.',
        whyItMatters: 'Gives enough reaction time under emergency braking.',
      },
    ],
  },
  {
    category: 'Safety Gear',
    icon: 'shield-checkmark',
    color: '#059669',
    rules: [
      {
        title: 'Wear ISI Helmets',
        explanation: 'Both rider and pillion must wear BIS/ISI certified helmets with chin strap fastened.',
        whyItMatters: 'Reduces fatal head injuries by over 70% in crashes.',
      },
      {
        title: 'Fasten All Seatbelts',
        explanation: 'All occupants including rear-seat passengers must wear seatbelts.',
        whyItMatters: 'Seatbelts prevent ejection during crashes — a leading cause of fatalities.',
      },
    ],
  },
  {
    category: 'Mobile & Distractions',
    icon: 'phone-portrait-outline',
    color: '#DC2626',
    rules: [
      {
        title: 'Zero Phone Tolerance',
        explanation: 'No hand-held mobile usage while driving — even at red lights.',
        whyItMatters: 'Distracted driving is a leading cause of avoidable road deaths.',
      },
      {
        title: 'No Eating or Grooming',
        explanation: 'Keep both hands on the wheel. Adjust music/GPS before moving.',
        whyItMatters: 'Any secondary task significantly delays your reaction time.',
      },
    ],
  },
];

// ── Safety Tips ────────────────────────────────────────────────
export const SAFETY_TIPS = [
  'Always wear a helmet, even for distances under 500 metres.',
  'Maintain a 3-second gap from the vehicle in front.',
  'Check mirrors every 15–20 seconds for blind spot awareness.',
  'Use indicators at least 30 metres before making a turn.',
  'Never overtake from the left on high-speed roads.',
  'Keep high beams off in well-lit city areas.',
  'Always yield to pedestrians at zebra crossings.',
  'Never drive under the influence of alcohol or medication.',
  'Keep your vehicle documents always accessible in the glove box.',
  'Check tyre pressure and brakes before long journeys.',
];

// ── Emergency Contacts ─────────────────────────────────────────
export const EMERGENCY_CONTACTS = [
  { name: 'Police Patrol', number: '100', icon: 'shield-sharp', desc: 'General police assistance', color: '#1D4ED8' },
  { name: 'Ambulance', number: '102', icon: 'medical', desc: 'Medical emergencies', color: '#DC2626' },
  { name: 'Trauma Care', number: '108', icon: 'pulse', desc: 'Accident & trauma response', color: '#DC2626' },
  { name: 'Highway Help', number: '1033', icon: 'car-sport', desc: 'Roadside assistance', color: '#F59E0B' },
  { name: 'Women Helpline', number: '1091', icon: 'person', desc: 'Women safety & assistance', color: '#7C3AED' },
  { name: 'Fire Brigade', number: '101', icon: 'flame', desc: 'Fire and rescue services', color: '#EA580C' },
];

// ── Speed Limits ───────────────────────────────────────────────
export const SPEED_LIMITS = [
  { zone: 'Expressways', limit: '120 km/h', desc: 'National & state expressways', icon: 'flash', color: '#002452' },
  { zone: 'National Highways', limit: '100 km/h', desc: 'NH for cars/light vehicles', icon: 'car', color: '#1D4ED8' },
  { zone: 'City Roads', limit: '50 km/h', desc: 'Urban internal roads', icon: 'business', color: '#059669' },
  { zone: 'School Zones', limit: '25 km/h', desc: 'Near schools, 8 AM – 4 PM', icon: 'school', color: '#F59E0B' },
  { zone: 'Residential', limit: '30 km/h', desc: 'Colonies and housing areas', icon: 'home', color: '#7C3AED' },
];
