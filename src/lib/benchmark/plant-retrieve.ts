import { EQUIPMENT, getEquipment, type Equipment } from "../equipment";
import { rank } from "../retrieval";

/** Below this, the two-stage path abstains instead of guessing. Fixed before the run. */
export const ABSTAIN_BELOW = 0.5;
export const REVIEW = "needs technician review";

/** Generic catalog classes only. Household types (dryer, and anything tagged domain home) are not in this list. */
export function compactCatalog(): Equipment[] {
  return EQUIPMENT.filter((e) => !e.vendor && !e.domain);
}

/** Field paraphrases appended to the BM25 query. They reorder the compact list; they do not add household equipment. */
const EXPANSIONS: [RegExp, string][] = [
  [/\b(driver|kilowatt|\d+\s*kw)\b/i, "induction motor"],
  [/\b(air[ -]?end|surge|intercooler|cooler fins)\b/i, "compressor"],
  [/\b(troughed|stringer|idler|rubber band)\b/i, "belt conveyor"],
  [/\b(globe|positioner|pneumatic)\b/i, "control valve"],
  [/\b(cubicle|\blug\b|starter)\b/i, "mcc panel breaker"],
  [/\b(steam raiser|feed set|firing)\b/i, "boiler"],
  [/\b(bundle|approach)\b/i, "heat exchanger"],
  [/\b(shaft end|skid|weep|glazed faces)\b/i, "centrifugal pump"],
  [/\b(tooth-?pass|mesh howl)\b/i, "gearbox"],
];

export function expandSymptom(symptom: string) {
  const extra = EXPANSIONS.filter(([re]) => re.test(symptom)).map(([, words]) => words);
  return [symptom, ...extra].join(" \n ");
}

/** Full compact catalog, BM25 order first, every class still included. */
export function stageOneCatalog(symptom: string) {
  const items = compactCatalog();
  const docs = items.map((e) => ({ e, text: `${e.name} ${e.id} ${e.category} ${e.failures.join(" ")} ${e.checks.join(" ")}` }));
  const ranked = rank(expandSymptom(symptom), docs, docs.length);
  const seen = new Set(ranked.map((d) => d.e.id));
  const rest = items.filter((e) => !seen.has(e.id));
  return [...ranked.map((d) => d.e), ...rest];
}

export function stageOnePrompt(symptom: string) {
  const list = stageOneCatalog(symptom);
  const lines = list.map((e) => `${e.id} | ${e.name}`);
  return { ids: list.map((e) => e.id), prompt: `<catalog>\n${lines.join("\n")}\n</catalog>\n<q>${symptom}</q>` };
}

export function stageTwoPrompt(equipment: Equipment, symptom: string) {
  return `<equipment id="${equipment.id}" name="${equipment.name}">\nfailures: ${equipment.failures.join(" | ")}\ncheck: ${(equipment.checks[0] ?? "").slice(0, 160)}\nmanual: ${(equipment.howTo?.[0] ?? "").slice(0, 220)}\n</equipment>\n<q>${symptom}</q>`;
}

export function catalogEntry(id: string) {
  const all = compactCatalog();
  return all.find((e) => e.id === id) ?? getEquipment(id) ?? null;
}

export function failureAllowed(equipment: Equipment, failure: string) {
  const n = failure.trim().toLowerCase();
  return equipment.failures.some((f) => f.toLowerCase() === n);
}
