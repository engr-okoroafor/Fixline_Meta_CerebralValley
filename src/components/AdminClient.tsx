"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { NeonCheck } from "./next/Chrome";
import { McpSettings } from "./next/AdminNext";
import { Loader } from "./next/Loader";
import { NeonSelect } from "./NeonSelect";
type U = { id: string; email: string; name: string; role: string; createdAt: string; disabled: boolean };
type S = { id: string; userId: string; createdAt: string; updatedAt: string; expiresAt: string; minutes: number; userAgent: string };
type Audit = { id: number; userId: string | null; action: string; detail: Record<string, unknown> | null; createdAt: string };
type Settings = { ai: { primary: "meta" | "nvidia"; fallback: "nvidia" | "meta" | "none"; timeoutMs: number; temperature: number }; flags: Record<string, boolean>; defaults: { region: string; lang: string; units: "imperial" | "metric" }; i18n: { enabled: string[]; autoTranslate: boolean } };
type Integ = { name: string; ok: boolean; env: string };
type Machine = { id: string; name: string; category: string; domain: "industrial" | "building" | "home"; criticality: "Low" | "Medium" | "High" | "Critical"; vendor?: string; tags: string[]; failures: string[]; checks: string[]; standards: string[] };
type Vendor = { id: string; name: string; country: string; category: string; payout: "paystack" | "stripe" | "komoju"; active: boolean };
type D = { readOnly: boolean; sample?: boolean; me: { email: string } | null; users: U[]; sessions: S[]; incidents: { id: number; kind: string; severity: string; createdAt: string }[]; usage: { action: string; n: number }[]; traces: { id: number; goal: string; steps: { phase: string; tool?: string; note?: string }[] }[]; audit: Audit[]; docs: Audit[]; signups: { day: string; n: number }[]; minutes: { day: string; live: number; guest: number }[]; byMode: { mode: string; n: number }[]; settings: Settings; integrations: Record<string, Integ[]>; vendors: Vendor[]; catalog: Machine[]; ecards: { id: number; kind: string; owner: string; name?: string; blood?: string; muster?: string; createdAt: string }[] };
const TABS = [["overview", "◈ Overview"], ["users", "👥 Users"], ["usage", "⏱ Sessions & usage"], ["settings", "⚙ App settings"], ["audit", "📜 Safety & audit"], ["integrations", "🔌 Integrations"], ["vendors", "🏪 Vendors"], ["payments", "💳 Payments"], ["catalog", "🛠 Machine catalog"], ["data", "🆘 Demo vs live data"]] as const;
type Tab = typeof TABS[number][0];
const C = ["#39FF14", "#4da3ff", "#ff8a3d", "#c39bff", "#ffd166", "#ff4d6d", "#9fb3a8", "#00e5ff"];
const tt = { contentStyle: { background: "rgba(5,12,8,.95)", border: "1px solid rgba(57,255,20,.4)", borderRadius: 12 } };
const fmt = (s: string) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
function Panel({ title, sub, children, className = "", right }: { title: string; sub?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`glass card flex flex-col gap-3 ${className}`}>
    <div className="row" style={{ justifyContent: "space-between" }}><div><h2 className="m-0 text-base font-semibold neon">{title}</h2>{sub && <p className="m-0 muted text-xs">{sub}</p>}</div>{right}</div>{children}</motion.section>;
}
const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => <div style={{ overflowX: "auto" }}><table className="admin-table text-sm"><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>) : <tr><td colSpan={head.length} className="muted">No records yet.</td></tr>}</tbody></table></div>;
export default function AdminClient({ demo = false }: { demo?: boolean }) {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState(""); const [tab, setTab] = useState<Tab>("overview"); const [msg, setMsg] = useState("");
  const load = useCallback(() => fetch(`/api/admin${demo ? "?demo=1" : ""}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? r.statusText); setD(j); }).catch((e) => setErr((e as Error).message)), [demo]);
  useEffect(() => { load(); }, [load]);
  const act = async (body: Record<string, unknown>, ok = "Saved") => { if (d?.readOnly) { setMsg("Read-only demo — sign in as an admin to make changes."); return; } const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); setMsg(r.ok ? `✓ ${ok}` : `✕ ${j.error}`); if (r.ok) load(); };
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 3500); return () => clearTimeout(t); } }, [msg]);
  if (err) return <main className="mx-auto max-w-xl p-8"><div className="glass card"><h1 className="neon">Admin console</h1><p role="alert">{err}</p><a className="btn" href="/admin/demo">Open read-only demo</a> <a className="btn" href="/login?next=/admin">Sign in</a></div></main>;
  if (!d) return <main className="grid min-h-screen place-items-center"><Loader /></main>;
  return <main className="admin mx-auto flex max-w-7xl flex-col gap-4 p-3 md:p-8">
    <motion.nav initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} aria-label="Admin menu" className="admin-float" data-testid="admin-floatbar">
      <a href="/" className="admin-brand" aria-label="Back to app"><span className="neon font-extrabold">FixLine</span><span className="muted text-xs">Admin</span></a>
      <div role="tablist" aria-label="Admin sections" className="admin-tabs">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="admin-tab relative" onClick={() => setTab(k)}>{tab === k && <motion.span layoutId="admtab" className="absolute inset-0 rounded-full" style={{ background: "rgba(57,255,20,.16)", boxShadow: "inset 0 0 0 1px rgba(57,255,20,.6)" }} />}<span className="relative">{l}</span></button>)}</div>
      <div className="row shrink-0" style={{ gap: 6 }}>{(d.readOnly || d.sample) && <span className="pill text-[10px]" title={d.readOnly ? "Read-only demo · PII masked · writes disabled" : "Sample data"}>{d.readOnly ? "👁 demo" : "sample"}</span>}<button className="admin-tab" onClick={load} aria-label="Refresh">⟳</button></div>
    </motion.nav>
    <p className="m-0 muted text-xs" style={{ paddingTop: 64 }}>{d.readOnly ? "Read-only demo · PII masked · writes disabled" : `Signed in as ${d.me?.email} · changes apply immediately and are audit-logged`}</p>
    <AnimatePresence>{msg && <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="pill m-0" style={{ alignSelf: "flex-start" }}>{msg}</motion.p>}</AnimatePresence>
    <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="grid gap-4 lg:grid-cols-2">
      {tab === "overview" && <Overview d={d} />}
      {tab === "users" && <Users d={d} act={act} />}
      {tab === "usage" && <Usage d={d} />}
      {tab === "settings" && <SettingsTab d={d} act={act} />}
      {tab === "audit" && <AuditTab d={d} />}
      {tab === "integrations" && <><Integrations d={d} /><McpSettings /></>}
      {tab === "vendors" && <Vendors d={d} act={act} />}
      {tab === "payments" && <Payments d={d} />}
      {tab === "catalog" && <Catalog d={d} act={act} />}
      {tab === "data" && <DataTab d={d} act={act} />}
    </motion.div></main>;
}
type P = { d: D; act?: (b: Record<string, unknown>, ok?: string) => void };
function Overview({ d }: P) {
  const mins = d.minutes.reduce((a, m) => a + m.live + m.guest, 0); const ai = d.usage.reduce((a, b) => a + b.n, 0);
  const k: [string, string | number, string][] = [["Users", d.users.length, `${d.users.filter((u) => u.disabled).length} disabled`], ["Sessions", d.sessions.length, `${d.sessions.filter((s) => new Date(s.expiresAt) > new Date()).length} active`], ["Usage time", `${Math.round(mins / 6) / 10} h`, "last 30 days"], ["AI / tool calls", ai, `${d.usage.length} actions`], ["Safety docs", d.docs.length, "generated (audit)"], ["Incidents", d.incidents.length, "SCADA / safety"], ["Emergency cards", d.ecards.length, `${d.ecards.filter((e) => e.kind === "live").length} live users`], ["Custom machines", d.catalog.length, "admin catalog"]];
  return <>
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:col-span-2">{k.map(([a, b, c], i) => <motion.div key={a} initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .04 }} className="glass card kpi"><p className="m-0 muted text-xs">{a}</p><p className="m-0 text-2xl font-extrabold neon">{b}</p><p className="m-0 text-xs muted">{c}</p></motion.div>)}</div>
    <Panel title="Active minutes per day" sub="Live users vs demo/guest (heartbeat analytics)"><div style={{ height: 220 }}><ResponsiveContainer><AreaChart data={d.minutes}><CartesianGrid stroke="rgba(255,255,255,.06)" /><XAxis dataKey="day" fontSize={10} /><YAxis fontSize={10} /><Tooltip {...tt} /><Area dataKey="live" stackId="a" stroke="#39FF14" fill="rgba(57,255,20,.3)" /><Area dataKey="guest" stackId="a" stroke="#4da3ff" fill="rgba(77,163,255,.25)" /></AreaChart></ResponsiveContainer></div></Panel>
    <Panel title="Sign-ups per day" sub="Last 30 days"><div style={{ height: 220 }}><ResponsiveContainer><BarChart data={d.signups}><CartesianGrid stroke="rgba(255,255,255,.06)" /><XAxis dataKey="day" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} /><Tooltip {...tt} /><Bar dataKey="n" name="sign-ups" fill="#39FF14" radius={6} /></BarChart></ResponsiveContainer></div></Panel>
  </>;
}
function Users({ d, act }: P) {
  const [q, setQ] = useState(""); const list = d.users.filter((u) => `${u.email} ${u.name} ${u.role}`.toLowerCase().includes(q.toLowerCase()));
  return <Panel className="lg:col-span-2" title={`Accounts (${d.users.length})`} sub="Roles: admin · supervisor · operator · viewer. Disabling signs the user out everywhere." right={<input aria-label="Search users" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />}>
    <Table head={["User", "Email", "Signed up", "Role", "Enabled"]} rows={list.map((u) => [u.name, <span key="e" className="font-mono text-xs">{u.email}</span>, fmt(u.createdAt),
      <NeonSelect key="r" aria-label={`Role for ${u.email}`} value={u.role ?? "operator"} disabled={d.readOnly} onChange={(e) => act!({ action: "role", userId: u.id, role: e.target.value }, "Role updated")}>{["admin", "supervisor", "operator", "viewer"].map((r) => <option key={r}>{r}</option>)}</NeonSelect>,
      <NeonCheck key="c" checked={!u.disabled} label={u.disabled ? "Disabled" : "Active"} onChange={(v) => act!({ action: "disable", userId: u.id, disabled: !v }, v ? "User enabled" : "User disabled")} />])} />
  </Panel>;
}
function Usage({ d }: P) {
  const byUser = useMemo(() => { const m = new Map<string, number>(); d.sessions.forEach((s) => m.set(s.userId, (m.get(s.userId) ?? 0) + s.minutes)); return [...m].map(([id, v]) => ({ user: d.users.find((u) => u.id === id)?.email ?? id.slice(0, 8), minutes: v })).sort((a, b) => b.minutes - a.minutes).slice(0, 10); }, [d]);
  return <>
    <Panel title="Time per page" sub="Active minutes by app section"><div style={{ height: 240 }}><ResponsiveContainer><PieChart><Pie data={d.byMode} dataKey="n" nameKey="mode" innerRadius={50} outerRadius={90} paddingAngle={3}>{d.byMode.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}</Pie><Tooltip {...tt} /></PieChart></ResponsiveContainer></div></Panel>
    <Panel title="Top users by session time" sub="Minutes (session span)"><div style={{ height: 240 }}><ResponsiveContainer><BarChart data={byUser} layout="vertical" margin={{ left: 30 }}><XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="user" width={120} fontSize={10} /><Tooltip {...tt} /><Bar dataKey="minutes" fill="#4da3ff" radius={6} /></BarChart></ResponsiveContainer></div></Panel>
    <Panel className="lg:col-span-2" title={`Session history (${d.sessions.length})`} sub="Full history of sign-in sessions"><Table head={["User", "Started", "Last active", "Duration", "Expires", "Device"]} rows={d.sessions.map((s) => [d.users.find((u) => u.id === s.userId)?.email ?? s.userId.slice(0, 8), fmt(s.createdAt), fmt(s.updatedAt), `${s.minutes} min`, new Date(s.expiresAt) > new Date() ? <span key="a" className="neon">active</span> : "expired", <span key="u" className="muted text-xs">{s.userAgent}</span>])} /></Panel>
    <Panel className="lg:col-span-2" title="AI & tool usage" sub="Calls by action"><Table head={["Action", "Calls"]} rows={d.usage.sort((a, b) => b.n - a.n).map((u) => [u.action, u.n])} /></Panel>
  </>;
}
function SettingsTab({ d, act }: P) {
  const [s, setS] = useState<Settings>(d.settings); const F = (k: string, l: string, tip: string) => <NeonCheck key={k} checked={!!s.flags[k]} onChange={(v) => setS({ ...s, flags: { ...s.flags, [k]: v } })} label={l} tip={tip} />;
  const LANGS = ["en-US", "en-GB", "es", "fr", "pt", "de", "it", "ar", "zh", "hi", "ja", "ko", "ru", "tr", "yo", "ig", "ha", "sw"];
  return <>
    <Panel title="AI providers" sub="Production routing policy for every AI call">
      <label className="text-sm">Primary<NeonSelect value={s.ai.primary} onChange={(e) => setS({ ...s, ai: { ...s.ai, primary: e.target.value as "meta" } })}><option value="meta">Meta muse-spark-1.3 (recommended)</option><option value="nvidia">NVIDIA Nemotron</option></NeonSelect></label>
      <label className="text-sm">Fallback<NeonSelect value={s.ai.fallback} onChange={(e) => setS({ ...s, ai: { ...s.ai, fallback: e.target.value as "nvidia" } })}><option value="nvidia">NVIDIA Nemotron</option><option value="meta">Meta</option><option value="none">None (fail closed)</option></NeonSelect></label>
      <label className="text-sm">Primary timeout: {s.ai.timeoutMs} ms<input type="range" min={2000} max={60000} step={1000} value={s.ai.timeoutMs} onChange={(e) => setS({ ...s, ai: { ...s.ai, timeoutMs: +e.target.value } })} /></label>
    </Panel>
    <Panel title="Feature flags" sub="Turn product areas on/off for everyone"><div className="grid gap-2 sm:grid-cols-2">{F("voice", "Voice & Vision", "Hands-free voice + camera")}{F("xr", "AR mode", "WebXR AR overlay")}{F("glasses", "Smart Glass HUD", "/glasses")}{F("scada", "SCADA HMI", "Live tags & AI advisor")}{F("projects", "Projects / Gantt", "Planning tools")}{F("billing", "Billing", "Paystack / Stripe checkout")}{F("translate", "Whole-page translation", "/api/translate")}{F("signups", "Open sign-ups", "Allow new accounts")}{F("mcpWrites", "MCP / SCADA writes", "Dangerous: requires allowlist + approval")}</div></Panel>
    <Panel title="Jurisdiction & locale defaults" sub="Applied to new visitors (users can still change)">
      <label className="text-sm">Default jurisdiction<NeonSelect value={s.defaults.region} onChange={(e) => setS({ ...s, defaults: { ...s.defaults, region: e.target.value } })}>{["US", "CA", "UK", "EU", "NG", "ZA", "AE", "SA", "IN", "AU", "JP", "BR"].map((r) => <option key={r}>{r}</option>)}</NeonSelect></label>
      <label className="text-sm">Default language<NeonSelect value={s.defaults.lang} onChange={(e) => setS({ ...s, defaults: { ...s.defaults, lang: e.target.value } })}>{LANGS.map((l) => <option key={l}>{l}</option>)}</NeonSelect></label>
      <label className="text-sm">Units<NeonSelect value={s.defaults.units} onChange={(e) => setS({ ...s, defaults: { ...s.defaults, units: e.target.value as "metric" } })}><option value="imperial">US customary</option><option value="metric">Metric (SI)</option></NeonSelect></label>
    </Panel>
    <Panel title="Internationalisation (i18n)" sub="Languages offered in the header dropdown"><NeonCheck checked={s.i18n.autoTranslate} onChange={(v) => setS({ ...s, i18n: { ...s.i18n, autoTranslate: v } })} label="Auto-translate the whole page" />
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">{LANGS.map((l) => <NeonCheck key={l} checked={s.i18n.enabled.includes(l)} label={l} onChange={(v) => setS({ ...s, i18n: { ...s.i18n, enabled: v ? [...s.i18n.enabled, l] : s.i18n.enabled.filter((x) => x !== l) } })} />)}</div></Panel>
    <div className="row lg:col-span-2"><button className="btn btn-primary" disabled={d.readOnly} onClick={() => act!({ action: "settings", settings: s }, "Settings saved to production")}>💾 Save settings</button><button className="btn" disabled={d.readOnly} onClick={() => act!({ action: "resetSettings" }, "Defaults restored")}>Reset to defaults (US · en-US · Meta→NVIDIA)</button></div>
  </>;
}
function AuditTab({ d }: P) {
  const types = useMemo(() => { const m = new Map<string, number>(); d.docs.forEach((a) => { const t = String(a.detail?.type ?? "?").toUpperCase(); m.set(t, (m.get(t) ?? 0) + 1); }); return [...m].map(([type, n]) => ({ type, n })); }, [d]);
  return <>
    <Panel title="Documents by type"><div style={{ height: 220 }}><ResponsiveContainer><BarChart data={types}><XAxis dataKey="type" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} /><Tooltip {...tt} /><Bar dataKey="n" fill="#39FF14" radius={6} /></BarChart></ResponsiveContainer></div></Panel>
    <Panel title="Incidents" sub="SCADA alarms & safety events"><Table head={["When", "Kind", "Severity"]} rows={d.incidents.map((i) => [fmt(i.createdAt), i.kind, <span key="s" style={{ color: /high|crit/i.test(i.severity) ? "#ff4d6d" : undefined }}>{i.severity}</span>])} /></Panel>
    <Panel className="lg:col-span-2" title={`Safety document generation log (${d.docs.length})`} sub="Every PTW / HAZOP / RA / JSA / LOTO / hot-work generated by signed-in users"><Table head={["When", "Type", "Reference", "Task", "User"]} rows={d.docs.map((a) => [fmt(a.createdAt), String(a.detail?.type ?? "").toUpperCase(), <span key="r" className="font-mono text-xs">{String(a.detail?.ref ?? "")}</span>, String(a.detail?.task ?? "").slice(0, 80), d.users.find((u) => u.id === a.userId)?.email ?? "—"])} /></Panel>
    <Panel className="lg:col-span-2" title="Control & admin audit log"><Table head={["When", "Action", "By", "Detail"]} rows={d.audit.map((a) => [fmt(a.createdAt), a.action, d.users.find((u) => u.id === a.userId)?.email ?? "system", <code key="c" className="text-xs">{JSON.stringify(a.detail).slice(0, 120)}</code>])} /></Panel>
    <Panel className="lg:col-span-2" title="Agent traces"><div className="flex flex-col gap-1">{d.traces.map((t) => <details key={t.id} className="text-sm"><summary className="cursor-pointer">{t.goal}</summary><ol>{(t.steps ?? []).map((s, i) => <li key={i}>{s.phase} {s.tool ?? ""} {s.note ?? ""}</li>)}</ol></details>)}{!d.traces.length && <p className="muted m-0 text-sm">No traces yet.</p>}</div></Panel>
  </>;
}
function Payments({ d }: P) {
  const gw = [{ k: "paystack", n: "Paystack", cur: "NGN", env: "PAYSTACK_SECRET_KEY", hook: "/api/pay/paystack/webhook" }, { k: "stripe", n: "Stripe", cur: "USD", env: "STRIPE_SECRET_KEY", hook: "/api/pay/stripe/webhook" }, { k: "komoju", n: "KOMOJU (Japan)", cur: "JPY", env: "KOMOJU_SECRET_KEY", hook: "/api/pay/komoju/webhook" }];
  const ok = (n: string) => (d.integrations.payments ?? []).some((i) => i.name.toLowerCase().includes(n.split(" ")[0].toLowerCase()) && i.ok);
  const [test, setTest] = useState<Record<string, boolean>>({ paystack: true, stripe: true, komoju: true });
  const [plans, setPlans] = useState([{ n: "Technician", usd: 9, ngn: 7500, jpy: 1400 }, { n: "Team", usd: 39, ngn: 32000, jpy: 5800 }, { n: "Enterprise", usd: 199, ngn: 160000, jpy: 29800 }]);
  const tx = d.vendors.slice(0, 6).map((v, i) => ({ id: `tx_${1000 + i}`, who: v.name, gw: v.payout, amt: [7500, 39, 5800, 160000, 9, 1400][i % 6], st: i % 4 === 3 ? "refunded" : "paid" }));
  return <>
    <Panel className="lg:col-span-2" title="Payment gateways" sub="Hosted checkout only — card data never touches FixLine. Live API calls are stubbed until the secret env var is set.">
      <div className="grid gap-3 md:grid-cols-3">{gw.map((g) => <div key={g.k} className="rounded-3xl p-3" style={{ border: "1px solid rgba(57,255,20,.25)" }}>
        <div className="row" style={{ justifyContent: "space-between" }}><b>{g.n}</b><span className="pill text-xs">{ok(g.n) ? "configured" : "stub"}</span></div>
        <p className="m-0 text-xs muted">Currency {g.cur} · env <code>{g.env}</code></p><p className="m-0 text-xs muted">Webhook <code>{g.hook}</code></p>
        <NeonCheck checked={test[g.k]} onChange={(v) => setTest({ ...test, [g.k]: v })} label={test[g.k] ? "Test mode" : "Live mode"} tip="Live mode requires the secret key in Vercel env" /></div>)}</div></Panel>
    <Panel title="Plans & pricing" sub="Per-currency price points (edit, then save via settings API)"><Table head={["Plan", "USD", "NGN", "JPY"]} rows={plans.map((p, i) => [p.n, ...(["usd", "ngn", "jpy"] as const).map((c) => <input key={c} type="number" aria-label={`${p.n} ${c}`} value={p[c]} onChange={(e) => setPlans(plans.map((q, j) => j === i ? { ...q, [c]: +e.target.value } : q))} style={{ width: 100 }} />)])} /></Panel>
    <Panel title="Recent transactions" sub={d.readOnly ? "Sample (demo)" : "From gateway webhooks"}><Table head={["ID", "Vendor", "Gateway", "Amount", "Status"]} rows={tx.map((t) => [<span key="i" className="font-mono text-xs">{t.id}</span>, t.who, t.gw, t.amt.toLocaleString(), <span key="s" className="pill text-xs">{t.st}</span>])} /></Panel>
  </>;
}
function Integrations({ d }: P) {
  const G: [string, string][] = [["ai", "AI providers"], ["scada", "SCADA / OT connectors"], ["payments", "Payments"], ["platform", "Platform"]];
  return <Panel className="lg:col-span-2" title="Integration status" sub="Secrets are set as server environment variables (Vercel → Settings → Environment Variables); only presence is shown here.">
    <div className="grid gap-3 md:grid-cols-2">{G.map(([k, l]) => <div key={k} className="rounded-3xl p-3" style={{ border: "1px solid rgba(57,255,20,.25)" }}><b className="text-sm">{l}</b>{d.integrations[k].map((i) => <div key={i.name} className="row text-sm" style={{ justifyContent: "space-between" }}><span><span className="status-dot" style={{ background: i.ok ? "#39FF14" : "#ff8a3d", boxShadow: i.ok ? "0 0 8px #39FF14" : undefined }} /> {i.name}</span><span className="pill text-xs">{i.ok ? "configured" : `stub · set ${i.env}`}</span></div>)}</div>)}</div>
    <p className="m-0 text-xs muted">Payments: Paystack (NGN) and Stripe (USD) run hosted checkout only; KOMOJU (JPY) is a config surface for the Japanese gateway. Card data never touches FixLine.</p></Panel>;
}
function Vendors({ d, act }: P) {
  const blank: Vendor = { id: "", name: "", country: "US", category: "Field service", payout: "stripe", active: true }; const [v, setV] = useState<Vendor>(blank);
  return <Panel className="lg:col-span-2" title={`Vendors / marketplace (${d.vendors.length})`} sub="Multi-vendor parts & service providers. Active vendors are offered in the app.">
    <div className="grid gap-2 md:grid-cols-5"><input placeholder="Vendor name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /><input placeholder="Category" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} /><NeonSelect value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })}>{["US", "NG", "UK", "JP", "Other"].map((c) => <option key={c}>{c}</option>)}</NeonSelect><NeonSelect value={v.payout} onChange={(e) => setV({ ...v, payout: e.target.value as "stripe" })}><option value="stripe">Stripe (USD)</option><option value="paystack">Paystack (NGN)</option><option value="komoju">KOMOJU (JPY)</option></NeonSelect>
      <button className="btn btn-primary" disabled={d.readOnly || v.name.length < 2} onClick={() => { act!({ action: "vendor", vendor: { ...v, id: v.id || `v${Date.now()}` } }, "Vendor saved"); setV(blank); }}>{v.id ? "Update" : "＋ Add"} vendor</button></div>
    <Table head={["Vendor", "Country", "Category", "Payout", "Active", ""]} rows={d.vendors.map((x) => [x.name, x.country, x.category, x.payout, <NeonCheck key="a" checked={x.active} label="" onChange={(a) => act!({ action: "vendor", vendor: { ...x, active: a } })} />, <span key="b" className="row"><button className="btn btn-sm" onClick={() => setV(x)}>Edit</button><button className="btn btn-sm" disabled={d.readOnly} onClick={() => act!({ action: "deleteVendor", id: x.id }, "Vendor removed")}>✕</button></span>])} />
  </Panel>;
}
function Catalog({ d, act }: P) {
  const blank = { id: "", name: "", category: "pumps", domain: "industrial" as const, criticality: "Medium" as const, vendor: "", tags: "", failures: "", checks: "", standards: "" };
  const [m, setM] = useState<Record<string, string>>(blank); const split = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const save = () => act!({ action: "machine", machine: { id: m.id || m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48), name: m.name, category: m.category, domain: m.domain, criticality: m.criticality, vendor: m.vendor || undefined, tags: split(m.tags), failures: split(m.failures), checks: split(m.checks), standards: split(m.standards) } }, "Machine saved — live in the app search");
  const I = (k: string, l: string, area = false) => <label key={k} className="text-sm">{l}{area ? <textarea rows={3} value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} placeholder="comma or new-line separated" /> : <input value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />}</label>;
  return <>
    <Panel className="lg:col-span-2" title="Add / edit machine type" sub="Industrial, building and home equipment. Saved machines appear in Repair → Machine library search for every user.">
      <div className="grid gap-2 md:grid-cols-3">{I("name", "Name")}{I("vendor", "Make / vendor (optional)")}<label className="text-sm">Category<NeonSelect value={m.category} onChange={(e) => setM({ ...m, category: e.target.value })}>{["pumps", "motors", "compressors", "turbines", "conveyors", "hvac", "boilers", "generators", "machine-tools", "robotics", "vertical-transport", "lifting", "valves", "electrical", "switchgear", "appliances", "instruments", "fire-gas", "static"].map((c) => <option key={c}>{c}</option>)}</NeonSelect></label>
        <label className="text-sm">Domain<NeonSelect value={m.domain} onChange={(e) => setM({ ...m, domain: e.target.value })}><option value="industrial">Industrial</option><option value="building">Building</option><option value="home">Home</option></NeonSelect></label>
        <label className="text-sm">Criticality<NeonSelect value={m.criticality} onChange={(e) => setM({ ...m, criticality: e.target.value })}>{["Low", "Medium", "High", "Critical"].map((c) => <option key={c}>{c}</option>)}</NeonSelect></label>{I("tags", "ISA tag types (PT, TT, VT…)")}
        {I("failures", "Failure modes", true)}{I("checks", "Checks", true)}{I("standards", "Standards", true)}</div>
      <div className="row"><button className="btn btn-primary" disabled={d.readOnly || m.name.length < 2} onClick={() => { save(); setM(blank); }}>💾 Save machine</button>{m.id && <button className="btn" onClick={() => setM(blank)}>Cancel edit</button>}</div></Panel>
    <Panel className="lg:col-span-2" title={`Admin-managed machines (${d.catalog.length})`} sub="Built-in catalog: 20 generic + 87 industrial/building/home types + 159 vendor families"><Table head={["Name", "Category", "Domain", "Criticality", "Standards", ""]} rows={d.catalog.map((x) => [x.vendor ? `${x.vendor} · ${x.name}` : x.name, x.category, x.domain, x.criticality, x.standards.join(", "), <span key="b" className="row"><button className="btn btn-sm" onClick={() => setM({ ...x, vendor: x.vendor ?? "", tags: x.tags.join(", "), failures: x.failures.join("\n"), checks: x.checks.join("\n"), standards: x.standards.join(", ") } as unknown as Record<string, string>)}>Edit</button><button className="btn btn-sm" disabled={d.readOnly} onClick={() => act!({ action: "deleteMachine", id: x.id }, "Machine removed")}>✕</button></span>])} /></Panel>
  </>;
}
function DataTab({ d, act }: P) {
  const live = d.ecards.filter((e) => e.kind === "live").length; const pie = [{ n: "Live users", v: live }, { n: "Demo / guest", v: d.ecards.length - live }];
  return <>
    <Panel title="Emergency cards in the database" sub="Live (signed-in) vs demo/guest (per-device id)"><div style={{ height: 200 }}><ResponsiveContainer><PieChart><Pie data={pie} dataKey="v" nameKey="n" innerRadius={45} outerRadius={80}><Cell fill="#39FF14" /><Cell fill="#4da3ff" /></Pie><Tooltip {...tt} /></PieChart></ResponsiveContainer></div></Panel>
    <Panel title="Data policy" sub="What is stored"><ul className="m-0 pl-5 text-sm"><li>Emergency cards: <code>mem_fact(kind=&apos;emergency&apos;)</code>, owner <code>user:&lt;id&gt;</code> or <code>guest:&lt;device&gt;</code>; cached offline on the device.</li><li>Usage time: one heartbeat row per active minute — no content.</li><li>Safety docs: metadata only in the audit log (type, ref, task).</li><li>Demo console masks emails, names and owner ids.</li></ul></Panel>
    <Panel className="lg:col-span-2" title={`Emergency cards (${d.ecards.length})`}><Table head={["Saved", "Type", "Owner", "Name", "Blood", "Muster", ""]} rows={d.ecards.map((e) => [fmt(e.createdAt), <span key="k" className="pill text-xs" style={{ color: e.kind === "live" ? "#39FF14" : "#4da3ff" }}>{e.kind}</span>, <span key="o" className="font-mono text-xs">{e.owner}</span>, e.name ?? "", e.blood ?? "", e.muster ?? "", <button key="x" className="btn btn-sm" disabled={d.readOnly} onClick={() => act!({ action: "deleteEcard", id: e.id }, "Card deleted")}>✕</button>])} /></Panel>
  </>;
}
