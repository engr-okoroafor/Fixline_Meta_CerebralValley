import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey, detectInjection, imageSchema } from "@/lib/security";
import { copilot } from "@/lib/ai/copilot";
export const runtime = "nodejs"; export const maxDuration = 60;
const body = z.object({ session: z.string().min(4).max(128), question: z.string().min(2).max(1500), images: z.array(imageSchema.unwrap()).max(3).optional(), machine: z.string().max(80).optional(), lang: z.string().max(40).optional(), prefer: z.enum(["meta", "nvidia"]).optional(), region: z.string().regex(/^[A-Z]{2,6}$/).optional() });
/** Follow-up Q&A with memory: uses the session's short-term history and the owner's long-term memory + uploaded docs. */
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`cop:${who}`, u ? 30 : 12)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  if (detectInjection(p.data.question)) return NextResponse.json({ error: "input rejected by prompt-injection filter" }, { status: 422 });
  return NextResponse.json(await copilot({ owner: who, ...p.data }));
}
