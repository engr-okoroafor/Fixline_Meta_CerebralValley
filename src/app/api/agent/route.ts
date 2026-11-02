import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey, detectInjection } from "@/lib/security";
import { runAgent } from "@/lib/ai/agent";
import { getDb, schema } from "@/lib/db";
import { TAGS } from "@/lib/scada/model";
export const runtime = "nodejs"; export const maxDuration = 60;
const num = z.number().finite();
const body = z.object({ goal: z.string().min(3).max(500), target: z.enum(["sim", "real"]).default("sim"), estop: z.boolean().default(false),
  values: z.object(Object.fromEntries(TAGS.map((t) => [t.id, num]))), history: z.record(z.string(), z.array(num).max(300)).default({}) });
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`agent:${who}`, u ? 10 : 4)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  if (detectInjection(p.data.goal)) return NextResponse.json({ error: "input rejected by prompt-injection filter" }, { status: 422 });
  const out = await runAgent(p.data.goal, { values: p.data.values as never, history: p.data.history, target: p.data.target, estop: p.data.estop });
  try { const db = await getDb(); await db.insert(schema.agentTrace).values({ userId: u?.id ?? who, goal: p.data.goal, steps: out.steps }); } catch { /* best-effort */ }
  return NextResponse.json(out);
}
