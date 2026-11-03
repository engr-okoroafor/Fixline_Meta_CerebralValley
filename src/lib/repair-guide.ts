/** Hands-free repair guides. Catalog answers are labeled mocks; the API swaps in Muse Spark when a key is set. */
export type GuideStep = { what: string; how: string; tools: string; done: string; verify: string };
export type RepairGuide = { machine: string; modelHint: string; fault: string; steps: GuideStep[]; source: "catalog" };
const STEP = (what: string, how: string, tools: string, done: string, verify: string): GuideStep => ({ what, how, tools, done, verify });
type Entry = { re: RegExp; machine: string; modelHint: string; fault: string; steps: GuideStep[] };
const LOTO = (what: string) => STEP(what, "Notify affected people, shut down, isolate, apply YOUR personal lock and tag, release stored energy, then try-start and prove zero energy.", "Lock, tag, hasp, proving unit / multimeter", "Try-start does nothing and your lock is the only one you will remove.", "Camera shows your lock on the isolator and a zero-energy reading.");
const ENTRIES: Entry[] = [
  { re: /seal|centrifugal pump|pump/, machine: "Centrifugal pump", modelHint: "Overhung process pump (API 610 style)", fault: "Mechanical seal leak or bearing noise", steps: [
    LOTO("Lock out the pump driver"),
    STEP("Confirm the fault", "Look for product at the seal weep hole, measure vibration (ISO 10816) and compare bearing temperature with the twin pump.", "Torch, vibration pen, IR thermometer", "You can say leak vs noise vs both.", "Camera on the seal or bearing housing."),
    STEP("Drop the coupling and seal", "Match-mark coupling hubs, remove the spacer, then the seal gland nuts evenly. Do not pry the faces.", "Puller, hex keys, seal kit per OEM", "Old seal is out without damaged faces.", "Camera shows the removed seal and the clean sleeve."),
    STEP("Fit the new seal and laser-align", "Install the cartridge seal per the OEM setting clips, then shim and move feet until offset and angularity are inside tolerance for the rpm.", "Cartridge seal, shims, laser alignment kit", "Alignment is inside tolerance and clips are removed.", "Camera shows the alignment result screen or the tightened feet."),
    STEP("Return to service", "Remove your lock, vent and prime, start against a closed discharge, then open the valve slowly. Watch seal and vibration for 30 minutes.", "Radio, vibration pen", "No leak, vibration in zone A/B.", "Camera on the running seal area, dry."),
  ] },
  { re: /robot|fanuc|abb|kuka|servo|cobot/, machine: "Industrial robot", modelHint: "6-axis articulated arm", fault: "Servo fault, collision or axis following error", steps: [
    LOTO("Lock out the robot cell"),
    STEP("Read the fault code", "On the teach pendant, open the alarm history and note the axis and code before you reset anything.", "Teach pendant", "Code, axis and time are written down.", "Camera on the pendant alarm screen."),
    STEP("Check the mechanical side", "With power proved dead, jog is NOT allowed: inspect the named axis for a crash, loose payload, or cable whip.", "Torch, payload drawing", "No crash damage, payload bolts torqued.", "Camera on the affected axis and payload."),
    STEP("Recover the master", "After a qualified person restores power in teach mode at low speed, master the axis only if the OEM procedure says the encoder was lost.", "OEM manual, teach pendant", "Axis masters and moves in teach without the fault.", "Camera shows teach mode and a clear alarm list."),
    STEP("Prove the cell", "Single-step the program with the safety gate closed and reduced speed, then return to auto.", "Safety gate, reduced-speed key", "One dry cycle completes.", "Camera shows the gate closed and the cycle end."),
  ] },
  { re: /cnc|spindle|machine tool/, machine: "CNC machine tool", modelHint: "Vertical machining centre", fault: "Spindle noise, tool-changer fault or axis alarm", steps: [
    LOTO("Lock out the CNC at the main disconnect"),
    STEP("Capture the alarm and the tool", "Photograph the control alarm and the tool in the spindle before you change anything.", "Phone or glasses camera", "Alarm text and tool number recorded.", "Camera on the control screen."),
    STEP("Inspect the spindle taper and drawbar", "Clean the taper, check the pull-stud, and listen for roughness by hand-rotating only if the OEM allows it with power off.", "Taper wiper, pull-stud gauge", "Taper is clean and the pull-stud is the right length.", "Camera inside the taper."),
    STEP("Replace the worn part", "Change the tool, the drawbar spring pack, or the axis way cover — only the part the alarm points at — to the OEM torque.", "OEM parts, torque wrench", "New part fitted and torque recorded.", "Camera on the new part and the torque wrench setting."),
    STEP("Reference and cut air", "Power up, reference axes, warm the spindle, then run the program above the part.", "Control panel", "Air cut finishes with no alarm.", "Camera on the control showing no alarm."),
  ] },
  { re: /compressor|screw/, machine: "Screw compressor", modelHint: "Oil-flooded rotary screw", fault: "High temperature, trip or oil carry-over", steps: [
    LOTO("Lock out and depressurise the compressor"),
    STEP("Prove zero pressure", "Open the vent and read the pressure gauge at zero before you crack any fitting. Hot oil can still be stored.", "Gauge, gloves, face shield", "Gauge reads zero and the vent is open.", "Camera on the zeroed gauge."),
    STEP("Clean coolers and check oil", "Blow the coolers out in the right direction, check oil level and the separator element ΔP.", "Air lance, oil sight glass", "Coolers clear, oil in range, separator not collapsed.", "Camera on the cooler face and sight glass."),
    STEP("Replace the failed element", "Change the oil filter or separator to the OEM part. Do not mix oil grades.", "OEM filter, catch pan", "New element installed, no leaks at idle.", "Camera on the new element nameplate."),
    STEP("Start unloaded", "Start unloaded, confirm temperature falls, then load and watch for 20 minutes.", "Control panel", "Temperature stable below the alarm.", "Camera on the temperature reading."),
  ] },
  { re: /conveyor|belt|idler/, machine: "Belt conveyor", modelHint: "Troughed belt conveyor", fault: "Belt tracking, idler seizure or drive bearing", steps: [
    LOTO("Lock out the conveyor drive"),
    STEP("Walk the belt", "Look for a seized idler, a lumpy splice, or product under the belt. Pull the lanyard and test it before you rely on it.", "Torch, lanyard", "Fault location marked.", "Camera on the bad idler or splice."),
    STEP("Change the idler or bearing", "Lift the belt only with the designed tool, swap the idler, and grease to the OEM schedule.", "Idler, belt lifter, grease gun", "New idler spins freely.", "Camera on the new idler spinning by hand."),
    STEP("Track the belt", "Start at jog with guards on and adjust tracking idlers a little at a time from the tail toward the head.", "Tracking spanner", "Belt stays on the drums for 10 minutes.", "Camera showing the belt centred."),
  ] },
  { re: /motor|winding|vfd|drive/, machine: "Electric motor", modelHint: "LV induction motor", fault: "Overload, bearing noise or insulation failure", steps: [
    LOTO("Lock out the motor starter"),
    STEP("Prove dead", "Test the meter on a live source, test the terminals, then test the meter again (live-dead-live).", "Proving unit, meter, PPE", "All phases dead.", "Camera on the meter reading zero at the terminals."),
    STEP("Megger the windings", "Disconnect the motor leads, test IR and PI to IEEE 43, and correct to 40 °C.", "Insulation tester", "IR above the minimum and PI acceptable, or a rewind is required.", "Camera on the megger result."),
    STEP("Change the bearing or the motor", "If IR is good and the noise is mechanical, replace the bearing. If IR failed, change the motor and laser-align.", "Bearing kit or replacement motor, alignment kit", "New part fitted and aligned.", "Camera on the nameplate of the fitted motor or bearing."),
    STEP("Bump and run", "Remove locks, bump for rotation, then run and record current and vibration.", "Clamp meter, vibration pen", "Current balanced, vibration zone A/B.", "Camera on the running current."),
  ] },
  { re: /turbine|gt |gas turbine|hrsg/, machine: "Gas turbine", modelHint: "Industrial gas turbine", fault: "Start fail, high vibration or exhaust spread", steps: [
    LOTO("Lock out fuel, starter and electrics"),
    STEP("Read the trip first-out", "Do not reset the trip until the first-out, exhaust spread and vibration channels are written down.", "Control HMI", "First-out recorded.", "Camera on the trip log."),
    STEP("Inspect the inlet and fuel", "With fuel isolated and proved, inspect the inlet filter ΔP and the fuel valve command vs feedback.", "Filter gauge, OEM checklist", "Filter in limits and valve tracks.", "Camera on filter ΔP and the fuel valve."),
    STEP("Follow the OEM start permissive", "Clear permissives one by one. Do not bypass a vibration or flame trip.", "OEM start procedure", "All permissives green with no bypass.", "Camera on the permissive list."),
    STEP("Supervised start", "A qualified operator starts, watches spread and vibration, and aborts on any trip recurrence.", "Control room", "Machine at FSNL or the trip is captured again.", "Camera on speed and spread."),
  ] },
  { re: /valve|actuator|positioner/, machine: "Control valve", modelHint: "Globe valve with pneumatic actuator", fault: "Stuck, passing or positioner fault", steps: [
    LOTO("Isolate, depressurise and drain the valve"),
    STEP("Compare command and position", "Stroke the valve from the DCS and watch the positioner gauge. A stuck stem with a moving positioner is mechanical.", "Radio to the board, gauges", "You know if it is air, positioner or stem.", "Camera on the positioner gauges."),
    STEP("Repair the failed part", "Replace the positioner, the air set, or lap/replace the trim — one fault at a time.", "Positioner or trim kit, air set", "Valve strokes 0–100% smoothly.", "Camera on a full stroke."),
    STEP("Return the line-up", "Remove locks in the isolation procedure order and leak-test the packing.", "PTW, leak spray", "No packing leak at line pressure.", "Camera on the packing gland, dry."),
  ] },
];
const GENERIC = (q: string): Entry => ({ re: /.*/, machine: "Industrial machine", modelHint: q.slice(0, 80) || "Unspecified equipment", fault: "Reported fault", steps: [
  LOTO("Lock out every energy source"),
  STEP("Describe and photograph the fault", "Note what changed: noise, heat, leak, alarm code, and when it started.", "Camera, notebook", "Symptoms are written down.", "Camera on the fault."),
  STEP("Compare with the manual", "Find the troubleshooting table for this symptom and do the first safe check it lists.", "OEM manual", "One manual check is done and recorded.", "Camera on the manual step or the component."),
  STEP("Replace only the failed part", "Fit the OEM part, torque to the manual, and keep the old part for inspection.", "OEM part, torque wrench", "New part fitted, fasteners marked.", "Camera on the fitted part."),
  STEP("Test and record", "Remove locks, test-run, and record the reading that proves the fault is gone.", "Meter or gauge", "The reading is back in the normal band.", "Camera on that reading."),
] });
export function guideFor(query: string): RepairGuide {
  const q = query.toLowerCase();
  const hit = ENTRIES.find((e) => e.re.test(q)) ?? GENERIC(query);
  return { machine: hit.machine, modelHint: hit.modelHint, fault: hit.fault, steps: hit.steps, source: "catalog" };
}
export function formatStepLine(s: GuideStep) { return `${s.what} — How: ${s.how} Tools: ${s.tools} Done when: ${s.done}`; }
/** SAM confirm gate. A low-confidence box does not unlock the next step until the technician confirms the highlight. */
export function gateAllowsNext(o: { hasFrame: boolean; confidence: number; userConfirmsView: boolean; minConfidence?: number }) {
  const min = o.minConfidence ?? 0.55;
  if (!o.hasFrame) return { ok: false, reason: "Point the camera at the part, then re-check this step." };
  if (o.confidence < min && !o.userConfirmsView) return { ok: false, reason: `Segmentation confidence ${Math.round(o.confidence * 100)}% is below ${Math.round(min * 100)}%. Confirm the highlighted part, or show it again.` };
  if (o.confidence <= 0 && o.userConfirmsView) return { ok: true, reason: "Accepted on technician confirmation (vision fallback).", confirmedBy: "technician" as const };
  return { ok: true, reason: o.confidence >= min ? "SAM confirm-gate passed." : "Confirmed by the technician after a low-confidence box.", confirmedBy: o.confidence >= min ? "sam" as const : "technician" as const };
}
export function speakable(s: GuideStep, i: number, n: number) { return `Step ${i + 1} of ${n}. ${s.what}. ${s.how} Done when ${s.done}`; }
