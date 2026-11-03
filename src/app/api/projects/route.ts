import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/security";
export const runtime = "nodejs";
const idOk = z.string().regex(/^[a-zA-Z0-9_-]{2,80}$/);
async function owner(req: Request) {
  const u = await currentUser().catch(() => null); if (u) return `user:${u.id}`;
  const d = new URL(req.url).searchParams.get("device") ?? req.headers.get("x-device-id") ?? "";
  return /^[a-zA-Z0-9-]{8,64}$/.test(d) ? `guest:${d}` : null;
}
/** Multi-project store. Guests pass a device id; signed-in users are keyed by account. Payloads are the planner JSON. */
export async function GET(req: Request) {
  const o = await owner(req); if (!o) return NextResponse.json({ projects: [] });
  const db = await getDb();
  const rows = await db.select().from(schema.plantProject).where(eq(schema.plantProject.owner, o)).orderBy(desc(schema.plantProject.updatedAt)).limit(30);
  return NextResponse.json({ projects: rows.map((r) => ({ id: r.id.startsWith(o + ":") ? r.id.slice(o.length + 1) : r.id, name: r.name, payload: r.payload, updatedAt: r.updatedAt })) });
}
export async function POST(req: Request) {
  if (!rateLimit(`prj:${clientKey(req)}`, 40)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const o = await owner(req); if (!o) return NextResponse.json({ error: "device id required" }, { status: 400 });
  const body = z.object({ id: idOk, name: z.string().min(1).max(180), payload: z.record(z.string(), z.unknown()) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const raw = JSON.stringify(body.data.payload);
  if (raw.length > 500_000) return NextResponse.json({ error: "project is too large to store" }, { status: 413 });
  const db = await getDb();
  await db.insert(schema.plantProject).values({ id: `${o}:${body.data.id}`, owner: o, name: body.data.name, payload: body.data.payload }).onConflictDoUpdate({ target: schema.plantProject.id, set: { name: body.data.name, payload: body.data.payload, updatedAt: new Date() } });
  return NextResponse.json({ ok: true, id: body.data.id });
}
export async function DELETE(req: Request) {
  const o = await owner(req); if (!o) return NextResponse.json({ error: "device id required" }, { status: 400 });
  const id = idOk.safeParse(new URL(req.url).searchParams.get("id")); if (!id.success) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const db = await getDb(); await db.delete(schema.plantProject).where(and(eq(schema.plantProject.owner, o), eq(schema.plantProject.id, `${o}:${id.data}`)));
  return NextResponse.json({ ok: true });
}
