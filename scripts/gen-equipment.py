# Generates the multi-vendor equipment knowledge base (data/equipment/vendors.json).
import json
CAT = {
 "pumps": dict(tags=["FT","PT","VT","TT"], failures=["Cavitation (low NPSHa)","Mechanical seal leak","Bearing failure / high vibration","Impeller wear / low flow","Misalignment"], checks=["Measure suction & discharge pressure vs curve","Check seal flush plan & leakage","Vibration spectrum at bearings (ISO 10816-3)","Laser-align coupling"], standards=["API 610","API 682 (seals)","ISO 10816-3","ISO 14224"], tools="pressure gauges, vibration pen, laser alignment kit, torque wrench"),
 "compressors": dict(tags=["PT","TT","VT","FT"], failures=["Surge / anti-surge valve fault","High discharge temperature","Valve plate breakage (recip)","Oil carry-over","Rotor/bearing wear"], checks=["Trend anti-surge margin","Check intercooler ΔT","Inspect valves & unloaders","Oil analysis"], standards=["API 617/618/619","ISO 8573-1 (air quality)","ISO 10816-3"], tools="IR thermometer, oil sample kit, stroboscope, valve plate gauge"),
 "motors": dict(tags=["IT","TT","VT"], failures=["Insulation breakdown","Bearing failure (EDM fluting on VFD)","Rotor bar cracking","Overheating / blocked cooling","Phase imbalance"], checks=["Megger + PI (IEEE 43)","Phase current balance <10%","Bearing temperature & vibration","Clean fan cowl"], standards=["IEC 60034","IEEE 43-2013","NEMA MG-1","IEC 60079 (Ex)"], tools="insulation tester, clamp meter, IR camera, grease gun"),
 "vfds": dict(tags=["IT","TT"], failures=["DC bus over-voltage trip","IGBT failure","Cooling fan failure / overtemperature","Ground fault","Parameter / comms loss"], checks=["Read fault log & last trip code","Measure DC bus voltage (after 5-min discharge)","Check fan and heatsink","Verify motor cable insulation"], standards=["IEC 61800-5-1","IEC 61800-3 (EMC)","NFPA 70E"], tools="CAT III multimeter, laptop with drive tool, insulated screwdrivers"),
 "plc": dict(tags=["DI","DO","AI","AO"], failures=["CPU in STOP / fault","I/O module failure","Network/comms loss","Battery / memory loss","Firmware mismatch"], checks=["Read diagnostic buffer","Check 24 VDC supply & grounding","Verify network LEDs & cables","Back up program before change"], standards=["IEC 61131-3","IEC 62443 (cybersecurity)","IEC 61131-2"], tools="programming laptop, multimeter, spare I/O card, ESD strap"),
 "dcs": dict(tags=["AI","AO","DI","DO"], failures=["Controller redundancy failover","I/O card fault","Network storm / switch failure","HMI freeze","Loop tuning drift"], checks=["Check redundancy status & diagnostics","Review system event journal","Verify time sync & network health","Compare loop performance KPIs"], standards=["IEC 61131-3","ISA-18.2 (alarms)","ISA-101 (HMI)","IEC 62443"], tools="engineering station, loop calibrator, network tester"),
 "turbines": dict(tags=["ST","TT","VT","PT"], failures=["High vibration / rotor imbalance","Blade fouling or erosion","Lube oil contamination","Overspeed trip","Combustion dynamics / hot spots"], checks=["Review vibration & proximity probe orbits","Borescope inspection","Lube oil particle count & varnish","Overspeed trip test per OEM"], standards=["API 612/616 (steam/gas turbines)","API 670 (machinery protection)","ISO 20816-2/-4","NFPA 85"], tools="borescope, oil sampling kit, proximity probe analyser"),
 "boilers": dict(tags=["PT","LT","TT","FT"], failures=["Low drum water level","Tube leak","Flame failure / burner trip","Scale and corrosion","Safety valve passing"], checks=["Test low-water cut-off","Check flame scanner signal","Water chemistry (TDS, pH, O2)","Safety valve lift test"], standards=["ASME Section I & IV","NFPA 85","API 573"], tools="water test kit, flue gas analyser, sight-glass blow-down"),
 "heat-exchangers": dict(tags=["TT","PT","FT"], failures=["Fouling (low U-value)","Tube leak / cross-contamination","Gasket leak (plate HX)","Vibration-induced tube damage"], checks=["Trend approach temperature & ΔP","Pressure / dye test for leaks","Inspect gaskets & plates","Eddy-current tube inspection"], standards=["TEMA","ASME Section VIII","API 660/661"], tools="IR thermometer, hydrotest pump, eddy current probe"),
 "conveyors": dict(tags=["ST","ZS"], failures=["Belt mistracking","Idler / pulley bearing failure","Belt slip","Pull-cord / e-stop fault","Splice failure"], checks=["Check tracking & training idlers","Listen/IR-scan idlers","Test pull-cord e-stops","Inspect splice & tension"], standards=["ISO 5048","CEMA","ISO 13850 (e-stop)","OSHA 1910.212 (guarding)"], tools="IR thermometer, tension meter, belt splice kit"),
 "fire-gas": dict(tags=["GD","FD","HD"], failures=["Detector drift / poisoned catalytic bead","Optical window dirty","Beam misalignment (open path)","Logic solver fault","Bypass left on"], checks=["Bump test & calibrate with certified gas","Clean optics","Verify voting logic & cause-and-effect","Audit bypass register"], standards=["IEC 61511","IEC 60079-29","NFPA 72","EN 54"], tools="calibration gas & regulator, magnet/handheld tool, bypass permit"),
 "transmitters": dict(tags=["PT","LT","FT","TT"], failures=["Zero/span drift","Plugged impulse line","Wet leg / dry leg error","Loop wiring fault (4–20 mA)","HART comms failure"], checks=["5-point calibration","Blow down impulse lines","Measure loop mA & loop resistance","Check HART device status"], standards=["IEC 61298","ISA-51.1","IEC 60770","IEC 61511 (if SIF)"], tools="HART communicator, loop calibrator, hand pump"),
 "valves": dict(tags=["ZT","ZS","PT"], failures=["Stiction / deadband","Seat leakage","Packing leak","Positioner fault","Actuator air leak"], checks=["Run step test & partial stroke","Seat leak test (ANSI/FCI 70-2)","Adjust/replace packing","Positioner diagnostics"], standards=["ANSI/FCI 70-2","API 598","IEC 60534","API 6D"], tools="positioner software, packing tools, soap solution"),
 "bearings": dict(tags=["VT","TT"], failures=["Inadequate lubrication","Contamination","Misalignment / overload","Electrical erosion (fluting)","Fatigue spalling"], checks=["Envelope / acceleration enveloping","Grease quantity & interval","Mount with induction heater","Shaft grounding on VFD motors"], standards=["ISO 15243 (bearing damage)","ISO 281 (L10 life)","ISO 10816"], tools="induction heater, bearing puller, ultrasonic grease gun"),
 "generators": dict(tags=["IT","TT","VT"], failures=["AVR fault","Winding insulation failure","Governor hunting","Cooling/radiator failure","Battery / start failure"], checks=["Load bank test","Megger windings","Check AVR & exciter","Coolant & battery checks"], standards=["ISO 8528","IEC 60034","NFPA 110"], tools="load bank, insulation tester, battery tester"),
 "switchgear": dict(tags=["IT","TT"], failures=["Breaker fails to trip","Hot joints","Partial discharge","Protection relay mis-setting","Arc flash risk"], checks=["Primary/secondary injection test","IR thermography under load","PD survey","Relay settings review"], standards=["IEC 62271","IEEE C37","NFPA 70E","IEC 61439"], tools="IR camera, secondary injection set, arc-rated PPE"),
 "instruments": dict(tags=["AT","PT"], failures=["Sensor drift","Sample system blockage","Calibration overdue","Comms failure"], checks=["Validate against standard","Check sample conditioning","Calibrate","Check diagnostics"], standards=["IEC 61298","ISO 17025 (cal labs)"], tools="calibrator, reference standard"),
}
V = [
 # vendor, category, family list
 ("ABB","motors",["M3BP / M3KP process performance motors","AMI 5800 high-voltage motors"]),
 ("ABB","vfds",["ACS880 industrial drives","ACS580 general purpose drives","ACS6080 MV drives"]),
 ("ABB","plc",["AC500 PLC"]),("ABB","dcs",["System 800xA (AC 800M)","Symphony Plus"]),
 ("ABB","switchgear",["UniGear ZS1 MV switchgear","Emax 2 ACB"]),("ABB","transmitters",["266 pressure transmitters","ProcessMaster FEP630 flowmeter"]),
 ("ABB","turbines",["Turbocharger A100/A200 series"]),
 ("Siemens","plc",["SIMATIC S7-1500","SIMATIC S7-1200","SIMATIC S7-300/400 (legacy)"]),
 ("Siemens","dcs",["SIMATIC PCS 7","SIMATIC PCS neo"]),("Siemens","vfds",["SINAMICS G120","SINAMICS S120","SINAMICS Perfect Harmony GH180"]),
 ("Siemens","motors",["SIMOTICS SD / GP low-voltage motors","SIMOTICS HV"]),("Siemens","turbines",["SGT-400 / SGT-800 gas turbines","SST-300/600 steam turbines","SGT-A35 aeroderivative"]),
 ("Siemens","transmitters",["SITRANS P DS III","SITRANS F M MAG 5000","SITRANS LR560 radar"]),("Siemens","compressors",["STC-SV single-shaft compressors"]),
 ("Schneider Electric","plc",["Modicon M580 ePAC","Modicon M340","Modicon M221"]),("Schneider Electric","dcs",["EcoStruxure Foxboro DCS","Triconex safety system"]),
 ("Schneider Electric","vfds",["Altivar Process ATV900","Altivar ATV320"]),("Schneider Electric","switchgear",["Masterpact MTZ","PremSet MV"]),
 ("Rockwell Automation","plc",["Allen-Bradley ControlLogix 5580","CompactLogix 5380","GuardLogix safety"]),("Rockwell Automation","dcs",["PlantPAx"]),
 ("Rockwell Automation","vfds",["PowerFlex 755T","PowerFlex 525","PowerFlex 6000T MV"]),("Rockwell Automation","motors",["Allen-Bradley Kinetix servo motors"]),
 ("Emerson","dcs",["DeltaV DCS","Ovation (power)","DeltaV SIS"]),("Emerson","transmitters",["Rosemount 3051 pressure","Rosemount 5408 radar level","Micro Motion Coriolis ELITE","Rosemount 644 temperature"]),
 ("Emerson","valves",["Fisher GX / easy-e control valves","Fisher FIELDVUE DVC6200 positioner","Bettis actuators","Crosby pressure relief valves"]),
 ("Honeywell","dcs",["Experion PKS (C300)","Safety Manager SC"]),("Honeywell","transmitters",["SmartLine ST700/ST800","VersaFlow"]),
 ("Honeywell","fire-gas",["Searchpoint Optima Plus","Searchline Excel open-path","Sensepoint XCD"]),
 ("Yokogawa","dcs",["CENTUM VP","ProSafe-RS SIS"]),("Yokogawa","transmitters",["EJA-E / EJX-A DP transmitters","ROTAMASS Coriolis","ADMAG AXG magflow"]),("Yokogawa","instruments",["TDLS8000 laser gas analyser"]),
 ("GE Vernova","turbines",["7HA / 9HA heavy-duty gas turbines","LM2500 / LM6000 aeroderivative","Frame 6B/7E","Steam turbines D/STF series"]),
 ("GE Vernova","generators",["W/H series generators"]),("GE Vernova","plc",["Mark VIe turbine control","PACSystems RX3i"]),("Baker Hughes","compressors",["Centrifugal BCL compressors","Bently Nevada 3500 protection"]),
 ("Mitsubishi","plc",["MELSEC iQ-R","MELSEC iQ-F (FX5U)"]),("Mitsubishi","vfds",["FR-A800 inverters"]),("Mitsubishi Power","turbines",["M501J / M701JAC gas turbines"]),
 ("Omron","plc",["NX/NJ machine controllers","CP1/CP2 compact PLC"]),("Omron","vfds",["MX2 / RX2 inverters"]),
 ("Danfoss","vfds",["VLT AutomationDrive FC 302","VACON NXP"]),("Danfoss","valves",["ICM motorized refrigeration valves"]),("Danfoss","compressors",["Turbocor oil-free centrifugal"]),
 ("SKF","bearings",["Explorer spherical roller bearings","Deep groove ball bearings 62/63 series","SKF Enlight / IMx condition monitoring"]),
 ("Timken","bearings",["Tapered roller bearings"]),("Schaeffler (FAG)","bearings",["FAG cylindrical roller bearings","OPTIME sensors"]),
 ("Flowserve","pumps",["Durco Mark 3 ANSI pumps","HPX/HDX API 610 OH2/BB2","Worthington multistage"]),("Flowserve","valves",["Valtek MaxFlo / Mark One","Logix 3800 positioner"]),
 ("Sulzer","pumps",["AHLSTAR process pumps","MSD/HSB API multistage","XFP submersible"]),
 ("Grundfos","pumps",["CR / CRN multistage","NB / NK end-suction","SE/SL wastewater","Hydro MPC boosters"]),
 ("KSB","pumps",["Etanorm / Etaline","RPH API 610 OH2","Amarex KRT"]),("Xylem (Goulds)","pumps",["Goulds 3196 ANSI","Flygt submersible"]),
 ("Atlas Copco","compressors",["GA VSD+ oil-injected screw","ZR/ZT oil-free screw","ZH turbo compressors"]),("Ingersoll Rand","compressors",["R-Series rotary screw","Centac centrifugal"]),
 ("Kaeser","compressors",["SFC / BSD rotary screw"]),("Gardner Denver","compressors",["Reciprocating compressors"]),
 ("WEG","motors",["W22 IE3/IE4 motors","W22Xd Ex motors"]),("Nidec / TECO-Westinghouse","motors",["MAX-E1 / Max-PE motors"]),
 ("Alfa Laval","heat-exchangers",["T-series plate HX","Packinox / Compabloc"]),("Kelvion","heat-exchangers",["Shell & tube / plate HX"]),
 ("Cleaver-Brooks","boilers",["CBEX fire-tube boilers"]),("Babcock & Wilcox","boilers",["FM water-tube package boilers"]),("Thermax","boilers",["Combipac / utility boilers"]),
 ("Continental / Fenner","conveyors",["Steel cord & fabric belts"]),("FLSmidth","conveyors",["Belt conveyors & idlers"]),("Interroll","conveyors",["RollerDrive / crossbelt sorters"]),
 ("Dräger","fire-gas",["Polytron 8000","PIR 7000 IR gas detector","X-am 5000 portable"]),("MSA","fire-gas",["Ultima X5000","FlameGard 5 flame detector","ALTAIR 4XR portable"]),("Det-Tronics","fire-gas",["X3301 multispectrum IR flame"]),
 ("Endress+Hauser","transmitters",["Cerabar PMP71","Promag / Promass flowmeters","Micropilot FMR radar","iTEMP TMT"]),("VEGA","transmitters",["VEGAPULS 6X radar"]),("KROHNE","transmitters",["OPTIFLUX magflow","OPTIWAVE radar"]),
 ("Cameron / SLB","valves",["Grove ball valves","Orbit rising stem","WKM gate valves"]),("Metso / Valmet","valves",["Neles control valves","Jamesbury ball valves"]),
 ("Caterpillar","generators",["C175 / 3500 gensets"]),("Cummins","generators",["QSK60 gensets"]),("Wärtsilä","generators",["34SG gas engines"]),
 ("Eaton","switchgear",["Power Xpert MV switchgear"]),("Hitachi Energy","switchgear",["GIS ELK series","Power transformers"]),
 ("Bently Nevada","instruments",["3500 / Orbit 60 machinery protection"]),
]
out=[]
def slug(s): return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-").replace("--","-")
for vendor,cat,fams in V:
  c=CAT[cat]
  for fam in fams:
    howto=[]
    for chk in c["checks"]:
      howto.append(f"{chk} — What: confirm this on the {fam}. How: isolate & lock out (OSHA 1910.147) where the check needs access, follow the {vendor} manual sequence, record readings. Tools: {c['tools']}. Done when: reading is within {vendor} / standard limits and logged in the CMMS.")
    out.append(dict(id=slug(f"{vendor}-{fam}")[:80], name=f"{vendor} {fam}", vendor=vendor, family=fam, category=cat, tags=c["tags"], failures=c["failures"], checks=c["checks"], howTo=howto, standards=c["standards"], catalog=f"https://www.google.com/search?q={vendor.replace(' ','+')}+{fam.split('(')[0].strip().replace(' ','+')}+manual+pdf"))
json.dump(out,open("data/equipment/vendors.json","w"),indent=0)
print(len(out))
