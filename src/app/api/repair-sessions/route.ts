import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/security";
export const runtime = "nodejs";
async function owner(req: Request) {
  const u = await currentUser().catch(() => null); if (u) return `user:${u.id}`;
  const d = new URL(req.url).searchParams.get("device") ?? req.headers.get("x-device-id") ?? "";
  return /^[a-zA-Z0-9-]{8,64}$/.test(d) ? `guest:${d}` : null;
}
const body = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{2,80}$/), machine: z.string().min(1).max(200), fault: z.string().max(300).optional(), steps: z.array(z.string().max(800)).max(16).optional(), stepIndex: z.number().int().min(0).max(20).optional(), confirmed: z.array(z.boolean()).max(16).optional() });
export async function GET(req: Request) {
  const o = await owner(req); if (!o) return NextResponse.json({ sessions: [] });
  const db = await getDb();
  const rows = await db.select().from(schema.repairSession).where(eq(schema.repairSession.owner, o)).orderBy(desc(schema.repairSession.updatedAt)).limit(20);
  return NextResponse.json({ sessions: rows.map((r) => ({ id: r.id.startsWith(o + ":") ? r.id.slice(o.length + 1) : r.id, machine: r.machine, fault: r.fault, steps: r.steps, stepIndex: r.stepIndex, confirmed: r.confirmed, updatedAt: r.updatedAt })) });
}
export async function POST(req: Request) {
  if (!rateLimit(`rs:${clientKey(req)}`, 40)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const o = await owner(req); if (!o) return NextResponse.json({ error: "device id required" }, { status: 400 });
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const db = await getDb();
  await db.insert(schema.repairSession).values({ id: `${o}:${p.data.id}`, owner: o, machine: p.data.machine, fault: p.data.fault, steps: p.data.steps, stepIndex: p.data.stepIndex ?? 0, confirmed: p.data.confirmed }).onConflictDoUpdate({ target: schema.repairSession.id, set: { machine: p.data.machine, fault: p.data.fault, steps: p.data.steps, stepIndex: p.data.stepIndex ?? 0, confirmed: p.data.confirmed, updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
