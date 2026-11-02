import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
export const runtime = "nodejs";
const Body = z.object({ provider: z.enum(["paystack", "stripe"]), plan: z.enum(["pro", "team", "enterprise"]), vendorId: z.string().max(64).optional() });
const PRICES = { paystack: { currency: "NGN", pro: 15000, team: 60000, enterprise: 250000 }, stripe: { currency: "USD", pro: 19, team: 79, enterprise: 299 } } as const;
/** Checkout stub: Paystack (NGN) / Stripe (USD). Returns a hosted-checkout URL only when real keys are configured; never handles card data. */
export async function POST(req: Request) {
  const u = await currentUser(); if (!u) return Response.json({ error: "Sign in required" }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"; if (!rateLimit(`billing:${ip}`, 10, 60_000)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const b = Body.safeParse(await req.json().catch(() => ({}))); if (!b.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const p = PRICES[b.data.provider]; const amount = p[b.data.plan];
  const key = b.data.provider === "paystack" ? process.env.PAYSTACK_SECRET_KEY : process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ mode: "stub", provider: b.data.provider, currency: p.currency, amount, message: `Set ${b.data.provider === "paystack" ? "PAYSTACK_SECRET_KEY" : "STRIPE_SECRET_KEY"} to enable live checkout.` });
  // Live wiring intentionally deferred: initialise a hosted checkout server-side and return only its URL.
  return Response.json({ mode: "configured", provider: b.data.provider, currency: p.currency, amount, message: "Keys detected — hosted checkout integration pending." });
}
