import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { and, desc, eq, gte, like, sql } from "drizzle-orm";
import { appSettings, getSetting, setSetting, DEFAULT_SETTINGS } from "@/lib/settings";
import { rateLimit, clientKey } from "@/lib/security";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const demoAllowed = () => process.env.ADMIN_DEMO !== "off";
const mask = (e: string) => e.replace(/^(.).*?(.)?@(.).*?(\.[^.]+)$/, (_, a, b, c, t) => `${a}${"•".repeat(4)}${b ?? ""}@${c}•••${t}`);
const has = (k: string) => !!process.env[k];
function integrations() {
  return {
    ai: [{ name: "Meta muse-spark-1.3 (primary)", ok: has("MODEL_API_KEY"), env: "MODEL_API_KEY" }, { name: "NVIDIA Nemotron (fallback)", ok: has("NVIDIA_API_KEY"), env: "NVIDIA_API_KEY" }, { name: "Speech ASR/TTS", ok: has("SPEECH_API_KEY"), env: "SPEECH_API_KEY" }],
    scada: [{ name: "OPC UA gateway", ok: has("OPCUA_GATEWAY_URL"), env: "OPCUA_GATEWAY_URL" }, { name: "Modbus TCP", ok: has("MODBUS_HOST"), env: "MODBUS_HOST" }, { name: "MQTT / Sparkplug B", ok: has("MQTT_URL"), env: "MQTT_URL" }, { name: "SCADA writes", ok: process.env.SCADA_ALLOW_WRITES === "1", env: "SCADA_ALLOW_WRITES" }],
    payments: [{ name: "Paystack (NGN)", ok: has("PAYSTACK_SECRET_KEY"), env: "PAYSTACK_SECRET_KEY" }, { name: "Stripe (USD)", ok: has("STRIPE_SECRET_KEY"), env: "STRIPE_SECRET_KEY" }, { name: "KOMOJU (JPY, Japan)", ok: has("KOMOJU_SECRET_KEY"), env: "KOMOJU_SECRET_KEY" }],
    platform: [{ name: "Postgres (DATABASE_URL)", ok: has("DATABASE_URL"), env: "DATABASE_URL" }, { name: "Better Auth secret", ok: has("BETTER_AUTH_SECRET"), env: "BETTER_AUTH_SECRET" }, { name: "Admin allowlist", ok: has("ADMIN_EMAILS"), env: "ADMIN_EMAILS" }],
  };
}
export async function GET(req: Request) {
  const demo = new URL(req.url).searchParams.get("demo") === "1";
  const u = await currentUser().catch(() => null); const isAdmin = u?.role === "admin";
  if (!isAdmin && !(demo && demoAllowed())) return NextResponse.json({ error: u ? "forbidden" : "unauthorized" }, { status: u ? 403 : 401 });
  const ro = !isAdmin; const db = await getDb(); const since = new Date(Date.now() - 30 * 864e5);
  const [users, sessions, incidents, usage, traces, audit, signups, minutes, byMode, ecards, disabled, custom, vendors, settings] = await Promise.all([
    db.select({ id: schema.user.id, email: schema.user.email, name: schema.user.name, role: schema.user.role, createdAt: schema.user.createdAt }).from(schema.user).orderBy(desc(schema.user.createdAt)).limit(500),
    db.select({ id: schema.session.id, userId: schema.session.userId, createdAt: schema.session.createdAt, updatedAt: schema.session.updatedAt, expiresAt: schema.session.expiresAt, userAgent: schema.session.userAgent }).from(schema.session).orderBy(desc(schema.session.createdAt)).limit(300),
    db.select().from(schema.incident).orderBy(desc(schema.incident.createdAt)).limit(100),
    db.select({ action: schema.usage.action, n: sql<number>`count(*)::int` }).from(schema.usage).groupBy(schema.usage.action),
    db.select().from(schema.agentTrace).orderBy(desc(schema.agentTrace.createdAt)).limit(30),
    db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(300),
    db.select({ day: sql<string>`to_char(${schema.user.createdAt}, 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` }).from(schema.user).where(gte(schema.user.createdAt, since)).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ day: sql<string>`to_char(${schema.usage.createdAt}, 'YYYY-MM-DD')`, live: sql<number>`sum(case when ${schema.usage.mock} then 0 else 1 end)::int`, guest: sql<number>`sum(case when ${schema.usage.mock} then 1 else 0 end)::int` }).from(schema.usage).where(and(gte(schema.usage.createdAt, since), like(schema.usage.action, "time:%"))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ mode: sql<string>`substr(${schema.usage.action}, 6)`, n: sql<number>`count(*)::int` }).from(schema.usage).where(like(schema.usage.action, "time:%")).groupBy(sql`1`),
    db.select({ id: schema.memFact.id, owner: schema.memFact.owner, content: schema.memFact.content, createdAt: schema.memFact.createdAt }).from(schema.memFact).where(eq(schema.memFact.kind, "emergency")).orderBy(desc(schema.memFact.createdAt)).limit(200),
    getSetting<string[]>("disabled_users", []), getSetting<unknown[]>("catalog_custom", []), getSetting<unknown[]>("vendors", []), appSettings(),
  ]);
  const docs = audit.filter((a) => a.action === "safety-doc");
  const out = {
    readOnly: ro, demo: ro, me: u ? { email: u.email, role: u.role } : null,
    users: users.map((x) => ({ ...x, email: ro ? mask(x.email) : x.email, name: ro ? x.name.slice(0, 1) + "•••" : x.name, disabled: disabled.includes(x.id) })),
    sessions: sessions.map((s) => ({ ...s, minutes: Math.max(1, Math.round((new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime()) / 6e4)), userAgent: s.userAgent?.slice(0, 80) ?? "" })),
    incidents, usage: usage.filter((x) => !x.action.startsWith("time:")), traces: ro ? traces.map((t) => ({ ...t, userId: "•••" })) : traces, audit: audit.filter((a) => a.action !== "safety-doc").slice(0, 100).map((a) => ro ? { ...a, userId: "•••" } : a), docs,
    signups, minutes, byMode, settings, integrations: integrations(), vendors, catalog: custom,
    ecards: ecards.map((e) => { let c: Record<string, string> = {}; try { c = JSON.parse(e.content); } catch { /* ignore */ } const live = e.owner.startsWith("user:"); return { id: e.id, kind: live ? "live" : "demo/guest", owner: ro ? e.owner.slice(0, 10) + "…" : e.owner, name: ro ? (c.name ?? "").slice(0, 1) + "•••" : c.name, blood: c.blood, muster: c.muster, createdAt: e.createdAt }; }),
  };
  return NextResponse.json(ro && !users.length ? withSample(out) : out);
}
const Machine = z.object({ id: z.string().regex(/^[a-z0-9-]{2,48}$/), name: z.string().min(2).max(120), category: z.string().min(2).max(40), domain: z.enum(["industrial", "building", "home"]), criticality: z.enum(["Low", "Medium", "High", "Critical"]), vendor: z.string().max(60).optional(), tags: z.array(z.string().max(8)).max(10), failures: z.array(z.string().max(160)).max(20), checks: z.array(z.string().max(200)).max(20), standards: z.array(z.string().max(60)).max(20) });
const Vendor = z.object({ id: z.string().max(40), name: z.string().min(2).max(80), country: z.string().max(20), category: z.string().max(60), payout: z.enum(["paystack", "stripe", "komoju"]), active: z.boolean() });
const Act = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), userId: z.string(), role: z.enum(["admin", "supervisor", "operator", "viewer"]) }),
  z.object({ action: z.literal("disable"), userId: z.string(), disabled: z.boolean() }),
  z.object({ action: z.literal("settings"), settings: z.object({ ai: z.object({ primary: z.enum(["meta", "nvidia"]), fallback: z.enum(["nvidia", "meta", "none"]), timeoutMs: z.number().int().min(2000).max(60000), temperature: z.number().min(0).max(1) }), flags: z.record(z.string(), z.boolean()), defaults: z.object({ region: z.string().max(8), lang: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/), units: z.enum(["imperial", "metric"]) }), i18n: z.object({ enabled: z.array(z.string().max(8)).max(80), autoTranslate: z.boolean() }) }) }),
  z.object({ action: z.literal("resetSettings") }),
  z.object({ action: z.literal("machine"), machine: Machine }), z.object({ action: z.literal("deleteMachine"), id: z.string() }),
  z.object({ action: z.literal("vendor"), vendor: Vendor }), z.object({ action: z.literal("deleteVendor"), id: z.string() }),
  z.object({ action: z.literal("deleteEcard"), id: z.number().int() }),
]);
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null);
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 }); if (u.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!rateLimit(`adm:${clientKey(req, u.id)}`, 60)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const p = Act.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid input", issues: p.error.issues.slice(0, 3) }, { status: 400 });
  const a = p.data; const db = await getDb();
  switch (a.action) {
    case "role": if (a.userId === u.id && a.role !== "admin") return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 }); await db.update(schema.user).set({ role: a.role }).where(eq(schema.user.id, a.userId)); break;
    case "disable": { if (a.userId === u.id) return NextResponse.json({ error: "You cannot disable yourself" }, { status: 400 }); const d = new Set(await getSetting<string[]>("disabled_users", [])); if (a.disabled) { d.add(a.userId); await db.delete(schema.session).where(eq(schema.session.userId, a.userId)); } else d.delete(a.userId); await setSetting("disabled_users", [...d], u.id); break; }
    case "settings": await setSetting("app", a.settings, u.id); break;
    case "resetSettings": await setSetting("app", DEFAULT_SETTINGS, u.id); break;
    case "machine": { const l = (await getSetting<z.infer<typeof Machine>[]>("catalog_custom", [])).filter((m) => m.id !== a.machine.id); await setSetting("catalog_custom", [a.machine, ...l].slice(0, 500), u.id); break; }
    case "deleteMachine": await setSetting("catalog_custom", (await getSetting<{ id: string }[]>("catalog_custom", [])).filter((m) => m.id !== a.id), u.id); break;
    case "vendor": { const l = (await getSetting<z.infer<typeof Vendor>[]>("vendors", [])).filter((v) => v.id !== a.vendor.id); await setSetting("vendors", [...l, a.vendor].slice(0, 500), u.id); break; }
    case "deleteVendor": await setSetting("vendors", (await getSetting<{ id: string }[]>("vendors", [])).filter((v) => v.id !== a.id), u.id); break;
    case "deleteEcard": await db.delete(schema.memFact).where(and(eq(schema.memFact.id, a.id), eq(schema.memFact.kind, "emergency"))); break;
  }
  await db.insert(schema.auditLog).values({ userId: u.id, action: `admin:${a.action}`, detail: { ...a, settings: undefined } });
  return NextResponse.json({ ok: true });
}

/** Judges' demo on a fresh deployment: clearly-labelled sample rows so every chart renders. */
function withSample<T extends Record<string, unknown>>(o: T) {
  const d = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
  const day = (n: number) => d(n).slice(0, 10);
  const roles = ["admin", "engineer", "technician", "technician", "viewer", "engineer"];
  return { ...o, sample: true,
    users: roles.map((r, i) => ({ id: `sample-${i}`, email: `${"aeiou"[i % 5]}••••@plant${i}.com`, name: "ABCDEF"[i] + "•••", role: r, createdAt: d(i * 2), disabled: i === 4 })),
    sessions: Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, userId: `sample-${i % 6}`, createdAt: d(i * 0.7), updatedAt: d(i * 0.7 - 0.02 - i * 0.004), expiresAt: d(-7), userAgent: i % 2 ? "Mobile Safari" : "Chrome 140 / Windows", minutes: 12 + i * 7 })),
    signups: [6, 5, 4, 2, 1, 0].map((n) => ({ day: day(n), n: 1 + (n % 3) })),
    minutes: [6, 5, 4, 3, 2, 1, 0].map((n) => ({ day: day(n), live: 30 + n * 9, guest: 12 + (n % 3) * 8 })),
    byMode: [["repair", 64], ["safety", 41], ["scada", 33], ["projects", 28], ["ask", 25], ["eng", 18], ["quality", 12]].map(([mode, n]) => ({ mode, n })),
    usage: [["chat", 120], ["safety-doc", 46], ["translate", 38], ["quality", 17], ["project-plan", 9]].map(([action, n]) => ({ action, n })),
    docs: ["PTW", "JSA", "LOTO", "HOTWORK", "CONFINED"].map((t, i) => ({ id: i + 1, userId: "•••", action: "safety-doc", detail: `${t}-${day(i).replace(/-/g, "")}-P-101`, createdAt: d(i) })),
    ecards: [{ id: 1, kind: "live", owner: "user:•••", name: "A•••", updatedAt: d(1) }, { id: 2, kind: "demo/guest", owner: "guest:•••", name: "J•••", updatedAt: d(0) }, { id: 3, kind: "demo/guest", owner: "guest:•••", name: "M•••", updatedAt: d(2) }],
  };
}
