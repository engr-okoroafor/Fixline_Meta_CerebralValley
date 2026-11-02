import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey, imageSchema } from "@/lib/security";
import { samBoxes, metaChat, live } from "@/lib/ai/meta-agent";
export const runtime = "nodejs"; export const maxDuration = 30;
const body = z.object({ image: imageSchema.unwrap(), prompt: z.string().min(2).max(80).default("machine part") });
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`vision:${who}`, u ? 40 : 20)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  if (!live()) return NextResponse.json({ mock: true, boxes: [], say: "Add Meta key in Settings to enable live vision." });
  const t0 = Date.now();
  const [boxes, say] = await Promise.all([samBoxes(p.data.image, p.data.prompt).catch(() => []), metaChat(`In one short spoken sentence, what ${p.data.prompt} do you see and is anything unsafe or damaged?`, "You are a concise maintenance vision assistant. Never invent measurements.", p.data.image).catch(() => "")]);
  return NextResponse.json({ mock: !boxes.length && !say, model: "sam-3.1 + muse-spark-1.3", boxes: boxes.slice(0, 8), say, ms: Date.now() - t0 });
}
