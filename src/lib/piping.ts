// Piping & welding spec advisor. Rule-based from ASME B31.3/B31.4/B31.8/B31.1, API 5L, NACE MR0175, ASME IX / AWS A5.1/A5.5.
// Output is a preliminary engineering suggestion; a qualified piping engineer must verify against the project pipe class.
import { PIPE } from "./calc";
export const PRODUCTS = ["crude", "gas", "sour-gas", "kerosene", "diesel", "petrol", "water", "steam", "lpg"] as const;
export type Product = (typeof PRODUCTS)[number];
type Spec = { code: string; material: string; flange: string; gasket: string; ca: number; nace: boolean; minSch: "40" | "80"; note: string };
const SPEC: Record<Product, Spec> = {
  crude: { code: "ASME B31.4 (pipeline) / B31.3 (plant)", material: "API 5L Gr. B / X52 PSL2 or ASTM A106 Gr. B seamless", flange: "ASME B16.5 Class 300 RF WN", gasket: "Spiral wound SS316/graphite (ASME B16.20)", ca: 3, nace: false, minSch: "40", note: "Check H2S partial pressure; if > 0.3 kPa switch to sour-service rules (NACE MR0175)." },
  gas: { code: "ASME B31.8 / B31.3", material: "API 5L X52/X60 PSL2 or ASTM A106 Gr. B", flange: "ASME B16.5 Class 600 RF WN", gasket: "Spiral wound SS316/graphite", ca: 1.5, nace: false, minSch: "80", note: "Location class sets the design factor (0.4–0.8)." },
  "sour-gas": { code: "ASME B31.3 + NACE MR0175/ISO 15156", material: "ASTM A106 Gr. B / API 5L X52 PSL2 sour (HIC tested)", flange: "ASME B16.5 Class 600 RTJ", gasket: "Octagonal ring joint, soft iron / SS316", ca: 3, nace: true, minSch: "80", note: "Weld & HAZ hardness ≤ 248 HV10; PWHT likely; H2S gas detection & SCBA for work." },
  kerosene: { code: "ASME B31.3 / B31.4", material: "ASTM A106 Gr. B seamless", flange: "ASME B16.5 Class 150 RF WN", gasket: "Spiral wound SS304/graphite", ca: 1.5, nace: false, minSch: "40", note: "Static electricity: bond & earth; limit velocity < 7 m/s (< 1 m/s initial fill)." },
  diesel: { code: "ASME B31.3 / B31.4", material: "ASTM A106 Gr. B / A53 Gr. B", flange: "ASME B16.5 Class 150 RF WN", gasket: "Spiral wound SS304/graphite", ca: 1.5, nace: false, minSch: "40", note: "Bond & earth; flash point > 52 °C but treat as flammable." },
  petrol: { code: "ASME B31.3 / B31.4", material: "ASTM A106 Gr. B seamless", flange: "ASME B16.5 Class 150 RF WN", gasket: "Spiral wound SS316/graphite (fuel-resistant)", ca: 1.5, nace: false, minSch: "40", note: "Highly flammable (Class IB): bonding, vapour control, Ex-rated equipment (IEC 60079)." },
  lpg: { code: "ASME B31.3 / NFPA 58", material: "ASTM A333 Gr. 6 (low-temp) or A106 Gr. B", flange: "ASME B16.5 Class 300 RF WN", gasket: "Spiral wound SS316/graphite", ca: 1.5, nace: false, minSch: "80", note: "Auto-refrigeration risk: impact-tested material; thermal relief between block valves." },
  water: { code: "ASME B31.3 Cat. D / AWWA", material: "ASTM A53 Gr. B galvanised, or HDPE PE100 (buried)", flange: "ASME B16.5 Class 150 FF/RF", gasket: "EPDM / compressed non-asbestos", ca: 1.5, nace: false, minSch: "40", note: "Potable: WRAS/NSF-61 approved linings." },
  steam: { code: "ASME B31.1", material: "ASTM A106 Gr. B (≤ 425 °C) / A335 P11/P22 (higher)", flange: "ASME B16.5 Class 300 RF WN", gasket: "Spiral wound SS316/graphite", ca: 1.5, nace: false, minSch: "80", note: "Provide drip legs & traps; expansion loops; PWHT on Cr-Mo." },
};
/** ASME B31.3 Eq. 3a: t = P·D / (2(S·E·W + P·Y)). P MPa, D mm, S MPa (A106-B ≈ 138 MPa ≤ 200 °C). */
export function wallRequired(pMPa: number, odMm: number, s = 138, e = 1, w = 1, y = 0.4) { return +(pMPa * odMm / (2 * (s * e * w + pMPa * y))).toFixed(2); }
export type Electrode = { pass: string; aws: string; dia: string; amps: string; polarity: string; angle: string; travel: string };
export function wps(material: string, wallMm: number, nace = false) {
  const crmo = /P11|P22|A335/.test(material); const lowT = /A333/.test(material);
  const root: Electrode = { pass: "Root", aws: crmo ? "E8010-P1 / GTAW ER80S-B2" : "E6010 (or GTAW ER70S-2)", dia: "3.2 mm (1/8\")", amps: "75–110 A", polarity: "DCEP", angle: "Drag 5–15°, work angle 90° to joint", travel: "Vertical-down (pipeline) or up (plant), keyhole 1–2 mm" };
  const hot: Electrode = { pass: "Hot pass", aws: crmo ? "E8018-B2" : lowT ? "E7018-1 (impact-tested)" : "E7018 / E7018-1 H4R", dia: "3.2 mm", amps: "90–130 A", polarity: "DCEP", angle: "Drag 5–15°, slight weave", travel: "Vertical-up, ≤ 2.5× electrode dia weave" };
  const fill: Electrode = { pass: "Fill & cap", aws: hot.aws, dia: wallMm > 10 ? "4.0 mm (5/32\")" : "3.2 mm", amps: wallMm > 10 ? "130–170 A" : "100–135 A", polarity: "DCEP", angle: "Push/drag 0–10°, side-to-side 70–90°", travel: "Cap 1.5–3 mm max reinforcement, overlap toes ~1.5 mm" };
  const preheat = crmo ? "150–200 °C" : wallMm > 25 ? "≥ 80 °C (P-No.1 > 25 mm)" : "10 °C min; 50–80 °C to drive off moisture";
  const pwht = crmo ? "Required: 675–760 °C, 1 h/25 mm" : wallMm > 19 ? "Required for P-No.1 > 19 mm (ASME B31.3 Table 331.1.1)" : nace ? "Recommended to meet 248 HV10 (NACE)" : "Not required";
  return { process: "SMAW (GTAW root optional)", pNo: crmo ? "P-No. 4/5A" : "P-No. 1", fNo: "F-No. 3 (cellulosic root) / F-No. 4 (low-hydrogen)", passes: [root, hot, fill], preheat, interpass: crmo ? "≤ 315 °C" : "≤ 250 °C", pwht, bevel: "V-bevel 37.5° ±2.5°, root face 1.6 mm, root gap 2.4–3.2 mm (ASME B16.25)", storage: "Keep E7018 in rod oven 120–150 °C after opening; re-bake per AWS A5.1", ndt: nace ? "100% RT/UT + hardness survey" : "VT 100% + RT per fluid category (5–100%)", standards: ["ASME Section IX", "ASME B31.3 Ch. V", "AWS A5.1/A5.5", ...(nace ? ["NACE MR0175/ISO 15156"] : [])] };
}
export function pipingSpec(product: Product, nps: string, pressureBar: number, tempC = 40) {
  const s = SPEC[product]; const p = PIPE[nps]; if (!s || !p) return { error: "unknown product or NPS" };
  const odMm = p.od * 25.4; const tPress = wallRequired(pressureBar / 10, odMm, tempC > 200 ? 130 : 138); const tMin = +((tPress + s.ca) / 0.875).toFixed(2);
  const s40 = p.s40 * 25.4, s80 = p.s80 * 25.4; const sch = tMin <= s40 && s.minSch === "40" ? "40" : tMin <= s80 ? "80" : "160 / XXS (engineer review)";
  const wallMm = sch === "40" ? s40 : s80;
  return { product, code: s.code, material: s.material, flange: s.flange, gasket: s.gasket, corrosionAllowanceMm: s.ca, pressureThicknessMm: tPress, requiredWithCaMillMm: tMin, schedule: sch, wallMm: +wallMm.toFixed(2), nace: s.nace, note: s.note, weld: wps(s.material, wallMm, s.nace), hydrotest: `${(pressureBar * 1.5).toFixed(1)} bar (ASME B31.3 345.4, 1.5 × design)`, standards: [s.code, "ASME B36.10M (dimensions)", "ASME B16.5 (flanges)", "ASME B16.9 (fittings)", ...(s.nace ? ["NACE MR0175"] : [])] };
}
