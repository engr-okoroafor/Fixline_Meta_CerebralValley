import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/security";
export const runtime = "nodejs";
const card = z.object({ name: z.string().max(120), blood: z.string().max(12), allergies: z.string().max(300), meds: z.string().max(300), contact: z.string().max(40), site: z.string().max(40), muster: z.string().max(120) });
const dev = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/);
/** Owner = signed-in user id, otherwise a per-device guest id (demo users get a persistent card too). */
async function owner(req: Request) { const u = await currentUser().catch(() => null); if (u) return `user:${u.id}`; const d = dev.safeParse(new URL(req.url).searchParams.get("device") ?? req.headers.get("x-device-id")); return d.success ? `guest:${d.data}` : null; }
export async function GET(req: Request) {
  const o = await owner(req); if (!o) return NextResponse.json({ card: null });
  const db = await getDb(); const r = await db.select().from(schema.memFact).where(and(eq(schema.memFact.owner, o), eq(schema.memFact.kind, "emergency"))).orderBy(desc(schema.memFact.id)).limit(1);
  try { return NextResponse.json({ card: r[0] ? JSON.parse(r[0].content) : null, saved: !!r[0] }); } catch { return NextResponse.json({ card: null }); }
}
export async function PUT(req: Request) {
  if (!rateLimit(`ec:${clientKey(req)}`, 20)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const o = await owner(req); if (!o) return NextResponse.json({ error: "device id required" }, { status: 400 });
  const p = card.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const db = await getDb(); await db.delete(schema.memFact).where(and(eq(schema.memFact.owner, o), eq(schema.memFact.kind, "emergency")));
  await db.insert(schema.memFact).values({ owner: o, kind: "emergency", content: JSON.stringify(p.data), source: "emergency-card" });
  return NextResponse.json({ ok: true, owner: o.startsWith("user:") ? "account" : "device" });
}
