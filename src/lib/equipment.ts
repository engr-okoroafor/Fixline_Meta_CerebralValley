import catalog from "../../data/equipment/catalog.json";
import vendors from "../../data/equipment/vendors.json";
import types from "../../data/equipment/types.json";
export type Equipment = { id: string; name: string; category: string; tags: string[]; failures: string[]; checks: string[]; howTo?: string[]; standards: string[]; vendor?: string; family?: string; catalog?: string; domain?: "industrial" | "building" | "home"; criticality?: "Low" | "Medium" | "High" | "Critical" };
/** Generic types (20) + multi-vendor model families (ABB, Siemens, Schneider, Rockwell, Emerson, Honeywell, Yokogawa, GE, Mitsubishi, Omron, Danfoss, SKF, Flowserve, Sulzer, Grundfos, Atlas Copco …). */
export const EQUIPMENT = [...(catalog as Equipment[]), ...(types as Equipment[]), ...(vendors as Equipment[])];
export const DOMAINS = ["industrial", "building", "home"] as const;
export const domainOf = (e: Equipment) => e.domain ?? "industrial";
const CRIT: Record<string, Equipment["criticality"]> = { turbines: "Critical", boilers: "Critical", "fire-gas": "Critical", compressors: "High", pumps: "High", motors: "High", switchgear: "High", generators: "High", valves: "High", dcs: "High", plc: "High", vfds: "High" };
export const criticalityOf = (e: Equipment) => e.criticality ?? CRIT[e.category] ?? "Medium";
/** ISO 14224-style equipment class → ISA-like tag prefix. */
export const tagPrefix = (e: Equipment) => ({ pumps: "P", motors: "M", compressors: "K", turbines: "T", conveyors: "CV", hvac: "AHU", boilers: "B", generators: "G", "machine-tools": "MT", "vertical-transport": "EL", lifting: "CR", valves: "V", "heat-exchangers": "E", static: "D", appliances: "HA", electrical: "EQ", switchgear: "SW", robotics: "R", vfds: "VFD", plc: "PLC" } as Record<string, string>)[e.category] ?? "EQ";
export const VENDORS = [...new Set(EQUIPMENT.map((e) => e.vendor).filter(Boolean))].sort() as string[];
export const CATEGORIES = [...new Set(EQUIPMENT.map((e) => e.category))].sort();
export const getEquipment = (id: string) => EQUIPMENT.find((e) => e.id === id);
export function searchEquipment(q: string) { const w = q.toLowerCase().split(/\W+/).filter((x) => x.length > 2); return EQUIPMENT.map((e) => { const blob = `${e.name} ${e.vendor ?? ""} ${e.family ?? ""} ${e.category}`.toLowerCase(); const full = JSON.stringify(e).toLowerCase(); return { e, s: w.reduce((a, x) => a + (blob.includes(x) ? 3 : full.includes(x) ? 1 : 0), 0) }; }).filter((x) => x.s).sort((a, b) => b.s - a.s).map((x) => x.e); }
export function diagnose(id: string, symptom: string) { const e = getEquipment(id); if (!e) return null; const s = symptom.toLowerCase(); const hit = e.failures.filter((f) => f.toLowerCase().split(/\W+/).some((w) => w.length > 3 && s.includes(w))); return { equipment: e.name, likely: hit.length ? hit : e.failures, checks: e.checks, howTo: e.howTo ?? [], standards: e.standards, source: e.vendor ? `${e.vendor} family profile + ISO 14224 taxonomy` : "FixLine generic catalog (ISO 14224 taxonomy)" }; }
