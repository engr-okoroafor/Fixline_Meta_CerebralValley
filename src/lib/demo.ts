export const ASSET = {
  id: "P-101", name: "Centrifugal Pump P-101 + 15 kW Motor M-101", site: "Lagos Bottling Plant, Line 2",
  manual: [
    { id: "M-4.2", title: "Mechanical seal leak", text: "Visible drip at seal gland > 10 drops/min indicates seal face wear. Isolate (LOTO), drain casing, replace seal kit SK-101, torque gland bolts to 25 N·m in cross pattern." },
    { id: "M-5.1", title: "Coupling misalignment", text: "Vibration > 7.1 mm/s RMS at 1x RPM with axial component suggests misalignment. Laser-align to ≤0.05 mm offset, ≤0.05 mm/100 mm angularity." },
    { id: "M-6.3", title: "Bearing overheating", text: "Motor DE bearing > 85 °C: check grease (SKF LGHP 2, 12 g), verify no over-greasing. Replace bearing 6309-2Z if noise persists." },
  ],
  history: [
    { date: "2026-09-14", note: "Seal kit SK-101 replaced, gland torque 25 N·m. Tech: A. Bello" },
    { date: "2026-10-21", note: "Vibration alarm 6.8 mm/s cleared after re-tightening base bolts. Tech: K. Musa" },
  ],
};
export const TELEMETRY = Array.from({ length: 24 }, (_, i) => ({
  t: `${String(i).padStart(2, "0")}:00`,
  vib: +(3.2 + i * 0.22 + (i > 18 ? 1.4 : 0)).toFixed(2),
  temp: +(62 + i * 0.9 + (i > 18 ? 6 : 0)).toFixed(1),
  flow: +(48 - (i > 18 ? 6 : i * 0.1)).toFixed(1),
  defects: i > 18 ? 4 + (i % 3) : i % 5 === 0 ? 1 : 0,
}));
export type Step = { id: number; say: string; confirm: string; target: string };
export const REPAIR_STEPS: Step[] = [
  { id: 1, say: "Apply lockout-tagout on breaker MCC-2/B7. Verify zero energy with the start button.", confirm: "Show the lock and tag on the breaker.", target: "breaker lock" },
  { id: 2, say: "Close suction and discharge valves, drain the casing into the tray.", confirm: "Show both valve handles in closed position.", target: "valve handle" },
  { id: 3, say: "Remove the seal gland and replace with seal kit SK-101.", confirm: "Show the new seal seated in the gland.", target: "mechanical seal" },
  { id: 4, say: "Torque gland bolts to 25 N·m in a cross pattern.", confirm: "Show the torque wrench reading on the last bolt.", target: "gland bolt" },
  { id: 5, say: "Remove LOTO, restart, and watch the seal for 60 seconds.", confirm: "Point at the seal — no drip should be visible.", target: "mechanical seal" },
];
export const LOTO = ["Notify affected operators", "Identify all energy sources (electrical, hydraulic, pressure)", "Shut down the pump at local control", "Isolate breaker MCC-2/B7", "Apply personal lock and tag", "Bleed residual pressure", "Verify zero energy (try-start)"];
export const QUALITY = ["Gland bolt torque recorded (25 N·m ±2)", "No leakage after 60 s run", "Vibration ≤ 4.5 mm/s RMS", "Bearing temp ≤ 80 °C", "Area cleaned, tools accounted for"];
export const LANGS = [
  { code: "en", name: "English" }, { code: "pcm", name: "Nigerian Pidgin" }, { code: "yo", name: "Yorùbá" },
  { code: "ig", name: "Igbo" }, { code: "ha", name: "Hausa" }, { code: "fr", name: "Français" },
];
