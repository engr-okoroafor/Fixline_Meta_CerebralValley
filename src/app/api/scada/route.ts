import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey, imageSchema } from "@/lib/security";
import { guardWrite, TAGS, type TagId } from "@/lib/scada/model";
import { extractScada } from "@/lib/ai/vision";
import { getDb, schema } from "@/lib/db";
import { advise } from "@/lib/scada/advisor";
import { CONNECTORS, connectorStatus } from "@/lib/scada/connectors";
const TAGIDS = TAGS.map((t) => t.id) as [TagId, ...TagId[]];
const adv = z.object({ op: z.literal("advise"), values: z.record(z.string(), z.number().finite()), history: z.record(z.string(), z.array(z.number().finite()).max(120)).optional() });
const live = z.object({ op: z.literal("live"), source: z.enum(["mqtt", "opcua", "modbus"]) });
export const runtime = "nodejs"; export const maxDuration = 60;
const write = z.object({ op: z.literal("write"), tag: z.enum(TAGS.map((t) => t.id) as [TagId, ...TagId[]]), sp: z.number().finite(), target: z.enum(["sim", "real"]), confirmed: z.boolean(), estop: z.boolean(), fromProposal: z.boolean().optional() });
const extract = z.object({ op: z.literal("extract"), image: imageSchema.unwrap() });
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  const p = z.discriminatedUnion("op", [write, extract, adv, live]).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  if (p.data.op === "extract") { if (!rateLimit(`ex:${who}`, u ? 6 : 2)) return NextResponse.json({ error: "rate limited" }, { status: 429 }); return NextResponse.json(await extractScada(p.data.image)); }
  if (p.data.op === "advise") { const d = p.data; const v = Object.fromEntries(TAGIDS.map((t) => [t, Number(d.values[t] ?? TAGS.find((x) => x.id === t)!.value)])) as Record<TagId, number>; return NextResponse.json({ ...advise(v, d.history as Partial<Record<TagId, number[]>>), approvalRequired: true }); }
  if (p.data.op === "live") { const src = p.data.source; if (!rateLimit(`live:${who}`, 20)) return NextResponse.json({ error: "rate limited" }, { status: 429 }); try { return NextResponse.json({ source: src, values: await CONNECTORS[src]().read(TAGIDS) }); } catch (e) { return NextResponse.json({ source: src, error: (e as Error).message, status: connectorStatus() }, { status: 503 }); } }
  if (!u) return NextResponse.json({ error: "login required for control writes" }, { status: 401 }); // viewing stays public
  if (!rateLimit(`w:${u.id}`, 20)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const g = guardWrite({ ...p.data, actor: "operator" });
  const db = await getDb(); await db.insert(schema.auditLog).values({ userId: u.id, action: (p.data.fromProposal ? "ai-proposal-" : "") + (g.ok ? "setpoint" : "setpoint-denied"), detail: { ...p.data, reason: g.reason } });
  return NextResponse.json(g, { status: g.ok ? 200 : 409 });
}

export function GET() { return NextResponse.json({ connectors: connectorStatus(), policy: "AI advises and proposes; every write needs a logged-in operator confirmation; real-plant writes also need SCADA_ALLOW_WRITES=1 and the SIS remains authority (IEC 61511)." }); }
