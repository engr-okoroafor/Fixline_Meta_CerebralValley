import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { clientKey } from "@/lib/security";
import { sessions, shortTerm, forget, addFact } from "@/lib/memory";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id); const s = new URL(req.url).searchParams.get("session");
  if (s) { const all = await sessions(who); if (!all.some((x) => x.id === s)) return NextResponse.json({ messages: [] }); return NextResponse.json({ messages: await shortTerm(s, 50) }); }
  return NextResponse.json({ sessions: await sessions(who) });
}
export async function POST(req: Request) { const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id); const j = await req.json().catch(() => ({})); if (typeof j.fact !== "string" || j.fact.length > 1000) return NextResponse.json({ error: "fact required" }, { status: 400 }); await addFact(who, j.fact, "user-note"); return NextResponse.json({ ok: true }); }
export async function DELETE(req: Request) { const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id); const days = Number(new URL(req.url).searchParams.get("olderThanDays") ?? 0); await forget(who, Math.max(0, days)); return NextResponse.json({ ok: true }); }
