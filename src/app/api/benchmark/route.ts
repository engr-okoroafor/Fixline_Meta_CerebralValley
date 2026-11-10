import { NextResponse } from "next/server";
import { cachedBenchmark, rememberBenchmark, runBenchmark } from "@/lib/benchmark/run";
import { clientKey, rateLimit } from "@/lib/security";
export const runtime = "nodejs";
export const maxDuration = 300;

const freshBuckets = new Map<string, { n: number; t: number }>();
function allowFresh(key: string) {
  const now = Date.now();
  const b = freshBuckets.get(key);
  if (!b || now - b.t > 10 * 60_000) { freshBuckets.set(key, { n: 1, t: now }); return true; }
  b.n++;
  return b.n <= 2;
}

/** Runs the seeded fault set through Meta muse-spark, then NVIDIA NIM if Meta does not answer. */
export async function POST(req: Request) {
  if (!rateLimit(`bench:${clientKey(req)}`, 12, 60_000)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { fresh?: boolean };
  if (!body.fresh) {
    const hit = cachedBenchmark();
    if (hit) return NextResponse.json(hit);
  } else if (!allowFresh(clientKey(req))) {
    const hit = cachedBenchmark();
    if (hit) return NextResponse.json({ ...hit, note: "Fresh runs are limited to 2 every 10 minutes on this instance. Showing the last measured run." });
    return NextResponse.json({ error: "Fresh runs are limited to 2 every 10 minutes. Wait and try again." }, { status: 429 });
  }
  const payload = await runBenchmark();
  rememberBenchmark(payload);
  return NextResponse.json(payload);
}

export async function GET() {
  const hit = cachedBenchmark();
  if (hit) return NextResponse.json(hit);
  return NextResponse.json({ cached: false, sample: true, needsRun: true });
}
