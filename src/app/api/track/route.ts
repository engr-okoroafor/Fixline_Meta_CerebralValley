import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { rateLimit } from "@/lib/security";
export const runtime = "nodejs";
const B = z.object({ mode: z.string().regex(/^[a-z-]{2,20}$/), device: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/) });
/** Usage-time heartbeat: one row per active minute per page (feeds Admin → Sessions & usage). No content is stored. */
export async function POST(req: Request) {
  const b = B.safeParse(await req.json().catch(() => null)); if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  const u = await currentUser().catch(() => null); const who = u ? u.id : `guest:${b.data.device}`;
  if (!rateLimit(`hb:${who}`, 3)) return Response.json({ ok: false }, { status: 429 });
  const db = await getDb(); await db.insert(schema.usage).values({ userId: who, action: `time:${b.data.mode}`, mock: !u });
  return Response.json({ ok: true });
}
