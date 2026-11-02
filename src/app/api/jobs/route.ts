import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { jobRequest, rateLimit, detectInjection, clientKey } from "@/lib/security";
import { enqueue, getJob, execute } from "@/lib/ai/nvidia-engine";
export const maxDuration = 60;
export const runtime = "nodejs";
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`job:${who}`, u ? 10 : 3)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const p = jobRequest.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  if (detectInjection(p.data.text)) return NextResponse.json({ error: "input rejected by prompt-injection filter" }, { status: 422 });
  // Serverless: in-memory queue can't persist across invocations, so run inline and return the result.
  if (process.env.VERCEL) { try { return NextResponse.json({ status: "done", result: await execute(p.data.kind, p.data) }); } catch { return NextResponse.json({ status: "error", error: "engine unavailable" }, { status: 502 }); } }
  return NextResponse.json({ id: enqueue(p.data.kind, p.data, who) }, { status: 202 });
}
export async function GET(req: Request) {
  const u = await currentUser().catch(() => null); const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const j = getJob(id, clientKey(req, u?.id)); return j ? NextResponse.json(j) : NextResponse.json({ error: "not found" }, { status: 404 });
}
