import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { aiRequest, rateLimit, detectInjection, sanitize } from "@/lib/security";
import { runAi, live } from "@/lib/ai/meta-agent";
import { askSafety } from "@/lib/ai/grounded";
import { askAnything } from "@/lib/ai/vision";
export const maxDuration = 60;
import { clientKey } from "@/lib/security";
import { getDb, schema } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null);
  // Public judge demo: anonymous allowed with a stricter per-IP limit; admin APIs stay authenticated.
  const who = clientKey(req, u?.id);
  if (!rateLimit(`ai:${who}`, u ? 30 : 12)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > 5_000_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const parsed = aiRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const d = parsed.data;
  const texts = d.mode === "repair" ? [d.part, d.manual ?? "", d.history ?? ""] : d.mode === "translate" ? [d.text] : d.mode === "ask" || d.mode === "anything" ? [d.question] : [];
  if (texts.some(detectInjection)) return NextResponse.json({ error: "input rejected by prompt-injection filter" }, { status: 422 });
  if (d.mode === "repair") { d.part = sanitize(d.part, 200); d.manual = d.manual && sanitize(d.manual, 20000); }
  const out = d.mode === "ask" ? await askSafety(d.question) : d.mode === "anything" ? await askAnything(d.question, d.image).catch(() => ({ error: "AI engine unavailable" })) : await runAi(d);
  const db = await getDb();
  await db.insert(schema.usage).values({ userId: u?.id ?? who, action: d.mode, mock: !live() });
  if (d.mode === "safety" && out && "hazard" in out && out.hazard) await db.insert(schema.incident).values({ userId: u?.id ?? who, kind: out.hazard.id, severity: out.hazard.emergency ? "emergency" : "advisory", detail: { context: d.context } });
  return NextResponse.json(out);
}
