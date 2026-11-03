import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/security";
export const runtime = "nodejs";
async function owner(req: Request) {
  const u = await currentUser().catch(() => null); if (u) return `user:${u.id}`;
  const d = new URL(req.url).searchParams.get("device") ?? req.headers.get("x-device-id") ?? "";
  return /^[a-zA-Z0-9-]{8,64}$/.test(d) ? `guest:${d}` : null;
}
const body = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{2,80}$/),
  kind: z.enum(["mqtt", "opcua", "modbus", "mcp", "demo"]),
  label: z.string().min(1).max(80),
  industry: z.enum(["oil-gas", "electrical", "manufacturing", "factory"]),
  endpoint: z.string().max(200).optional(),
  notes: z.string().max(300).optional(),
}).strict();
/** Saved connection profiles. Endpoints are references only — credentials stay in server environment variables. */
export async function GET(req: Request) {
  const o = await owner(req); if (!o) return NextResponse.json({ connections: [] });
  const db = await getDb();
  const rows = await db.select().from(schema.scadaConnection).where(eq(schema.scadaConnection.owner, o)).limit(20);
  return NextResponse.json({ connections: rows.map((r) => ({ id: r.id.startsWith(o + ":") ? r.id.slice(o.length + 1) : r.id, kind: r.kind, label: r.label, industry: r.industry, endpoint: r.endpoint, notes: r.notes })) });
}
export async function POST(req: Request) {
  if (!rateLimit(`cn:${clientKey(req)}`, 20)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const o = await owner(req); if (!o) return NextResponse.json({ error: "device id required" }, { status: 400 });
  const raw = await req.json().catch(() => null);
  if (raw && typeof raw === "object" && Object.keys(raw as object).some((k) => /pass|secret|token|key/i.test(k))) return NextResponse.json({ error: "do not store secrets here" }, { status: 400 });
  const p = body.safeParse(raw); if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const db = await getDb();
  await db.insert(schema.scadaConnection).values({ id: `${o}:${p.data.id}`, owner: o, kind: p.data.kind, label: p.data.label, industry: p.data.industry, endpoint: p.data.endpoint, notes: p.data.notes }).onConflictDoUpdate({ target: schema.scadaConnection.id, set: { kind: p.data.kind, label: p.data.label, industry: p.data.industry, endpoint: p.data.endpoint, notes: p.data.notes } });
  return NextResponse.json({ ok: true, demo: p.data.kind === "demo" });
}
export async function DELETE(req: Request) {
  const o = await owner(req); if (!o) return NextResponse.json({ error: "device id required" }, { status: 400 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const db = await getDb(); await db.delete(schema.scadaConnection).where(and(eq(schema.scadaConnection.owner, o), eq(schema.scadaConnection.id, `${o}:${id}`)));
  return NextResponse.json({ ok: true });
}
