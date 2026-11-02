import { NextResponse } from "next/server";
import { EQUIPMENT, getEquipment, diagnose, searchEquipment } from "@/lib/equipment";
import { TAGS } from "@/lib/scada/model";
import { connectorStatus } from "@/lib/scada/connectors";
import { advise } from "@/lib/scada/advisor";
import { initSim, stepSim, type TagId } from "@/lib/scada/model";
import { findStandards } from "@/lib/standards";
import { pipingSpec, PRODUCTS, type Product } from "@/lib/piping";
export const runtime = "nodejs";
// Minimal MCP (JSON-RPC 2.0, streamable-HTTP style, stateless, read-only) tool server.
const TOOLS: { name: string; description: string; inputSchema: Record<string, unknown> }[] = [
  { name: "list_equipment", description: "List generic equipment types (optionally filter by query)", inputSchema: { type: "object", properties: { query: { type: "string" } } } },
  { name: "get_equipment", description: "Get one equipment type with failure modes and checks", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "read_tags", description: "Read SCADA tags from the simulator (connector stubs: MQTT/OPC UA/Modbus)", inputSchema: { type: "object", properties: {} } },
  { name: "diagnose", description: "Match a symptom to likely failure modes for an equipment id", inputSchema: { type: "object", properties: { id: { type: "string" }, symptom: { type: "string" } }, required: ["id", "symptom"] } },
];
TOOLS.push(
  { name: "sim_step", description: "Run the flow-station simulator N steps (optionally with fault gas-valve-stuck|level-sensor-drift|pump-degraded) and return tag values", inputSchema: { type: "object", properties: { steps: { type: "number" }, fault: { type: "string" } } } },
  { name: "scada_advise", description: "Alarm → diagnosis → next step for tag values (JSON string of {TAG:value}). Advisory only, never writes.", inputSchema: { type: "object", properties: { values: { type: "string" } } } },
  { name: "find_standards", description: "Find relevant industrial standards (OSHA, IEC, API, ASME, NFPA, ISO)", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "piping_spec", description: "Pipe schedule, material, WPS and hydrotest for a product (crude, gas, sour-gas, water, steam…) citing ASME B31", inputSchema: { type: "object", properties: { product: { type: "string" }, nps: { type: "string" }, pressureBar: { type: "number" }, tempC: { type: "number" } }, required: ["product"] } },
);
function call(name: string, a: Record<string, string>) {
  switch (name) {
    case "list_equipment": return (a.query ? searchEquipment(a.query) : EQUIPMENT).map((e) => ({ id: e.id, name: e.name, category: e.category }));
    case "get_equipment": return getEquipment(a.id) ?? { error: "not found" };
    case "read_tags": return { source: "simulator", connectors: connectorStatus(), tags: TAGS.map((t) => ({ id: t.id, desc: t.desc, value: t.value, unit: t.unit })) };
    case "sim_step": { let st = initSim(); if (a.fault) st = { ...st, fault: a.fault as never }; const n = Math.min(600, Number(a.steps ?? 60)); for (let k = 0; k < n; k++) st = stepSim(st); return { t: st.t, values: st.v, valves: st.valves }; }
    case "scada_advise": { const v = { ...initSim().v, ...(a.values ? JSON.parse(String(a.values)) : {}) } as Record<TagId, number>; return { ...advise(v), note: "Advisory only. Proposals require operator approval in the FixLine SCADA page; this server exposes no write tool." }; }
    case "find_standards": return findStandards(String(a.query ?? "")).slice(0, 8);
    case "piping_spec": return PRODUCTS.includes(a.product as Product) ? pipingSpec(a.product as Product, String(a.nps ?? "4"), Number(a.pressureBar ?? 10), Number(a.tempC ?? 40)) : { error: `product must be one of ${PRODUCTS.join(", ")}` };
    case "diagnose": return diagnose(a.id, String(a.symptom ?? "").slice(0, 300)) ?? { error: "not found" };
  }
  return null;
}
export function GET() { return NextResponse.json({ name: "fixline-equipment", protocol: "MCP JSON-RPC 2.0", tools: TOOLS.map((t) => t.name) }); }
export async function POST(req: Request) {
  const m = await req.json().catch(() => null); const id = m?.id ?? null; const ok = (result: unknown) => NextResponse.json({ jsonrpc: "2.0", id, result });
  if (m?.method === "initialize") return ok({ protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "fixline-equipment", version: "1.0.0" } });
  if (m?.method === "tools/list") return ok({ tools: TOOLS });
  if (m?.method === "tools/call") { const r = call(m.params?.name, m.params?.arguments ?? {}); if (r === null) return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32602, message: "unknown tool" } }); return ok({ content: [{ type: "text", text: JSON.stringify(r) }] }); }
  if (m?.method?.startsWith("notifications/")) return new NextResponse(null, { status: 202 });
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "method not found" } });
}
