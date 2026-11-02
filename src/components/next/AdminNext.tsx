"use client";
import { useEffect, useState } from "react";
import { NeonCheck } from "./Chrome";
import { NeonSelect } from "../NeonSelect";
type Vendor = { id: string; name: string; country: "NG" | "US" | "Other"; category: string; payout: "paystack" | "stripe"; active: boolean };
const VKEY = "fixline.vendors.v1";
const SEED: Vendor[] = [{ id: "v1", name: "Lagos Industrial Spares", country: "NG", category: "Bearings & seals", payout: "paystack", active: true }, { id: "v2", name: "Houston Pump Services", country: "US", category: "Field service", payout: "stripe", active: true }];
/** Multi-vendor marketplace + payments (Paystack NGN / Stripe USD stubs). */
export function VendorsPayments() {
  const [vs, setVs] = useState<Vendor[]>(SEED); const [n, setN] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { try { const s = localStorage.getItem(VKEY); if (s) setVs(JSON.parse(s)); } catch { /* ignore */ } }, []);
  useEffect(() => { localStorage.setItem(VKEY, JSON.stringify(vs)); }, [vs]);
  async function checkout(provider: "paystack" | "stripe", plan: "pro" | "team") { const r = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, plan }) }); const j = await r.json(); setMsg(j.error ?? `${j.provider} · ${j.currency} ${j.amount} · ${j.message}`); }
  return <section className="glass card lg:col-span-2"><h2 className="font-semibold">Vendors & payments</h2>
    <table className="text-sm"><thead><tr><th>Vendor</th><th>Country</th><th>Category</th><th>Payout</th><th>Active</th></tr></thead><tbody>{vs.map((v) => <tr key={v.id}><td>{v.name}</td><td>{v.country}</td><td>{v.category}</td><td>{v.payout === "paystack" ? "Paystack (NGN)" : "Stripe (USD)"}</td><td><NeonCheck checked={v.active} label="" onChange={(a) => setVs(vs.map((x) => (x.id === v.id ? { ...x, active: a } : x)))} /></td></tr>)}</tbody></table>
    <form className="row" onSubmit={(e) => { e.preventDefault(); if (n.trim()) { setVs([...vs, { id: `v${Date.now()}`, name: n.trim().slice(0, 80), country: "NG", category: "General", payout: "paystack", active: false }]); setN(""); } }}><input className="field" value={n} onChange={(e) => setN(e.target.value)} placeholder="Onboard vendor name" /><button className="btn">＋ Vendor</button></form>
    <div className="row"><button className="btn btn-primary" onClick={() => checkout("paystack", "pro")}>Paystack · Pro (NGN)</button><button className="btn btn-primary" onClick={() => checkout("stripe", "pro")}>Stripe · Pro (USD)</button></div>
    {msg && <p className="neon text-sm">{msg}</p>}<p className="muted text-xs">Card data never touches FixLine — hosted checkout only. Secrets live in server env vars.</p></section>;
}
type Conn = { name: string; url: string; auth: "oauth" | "token" | "mtls"; readOnly: boolean; allowWrite: string[]; approval: boolean; allowlist: string };
const CKEY = "fixline.mcp.conns.v1";
/** Secure MCP / plant-connection settings (defensive configuration only; secrets are never stored in the browser). */
export function McpSettings() {
  const [cs, setCs] = useState<Conn[]>([]); const [d, setD] = useState<Conn>({ name: "", url: "", auth: "oauth", readOnly: true, allowWrite: [], approval: true, allowlist: "" }); const [err, setErr] = useState("");
  useEffect(() => { try { setCs(JSON.parse(localStorage.getItem(CKEY) ?? "[]")); } catch { /* ignore */ } }, []);
  const save = (n: Conn[]) => { setCs(n); localStorage.setItem(CKEY, JSON.stringify(n)); };
  function add() { try { const u = new URL(d.url); if (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname)) throw new Error("HTTPS required for remote MCP servers"); if (!d.name.trim()) throw new Error("Name required"); setErr(""); save([...cs, d]); setD({ ...d, name: "", url: "" }); } catch (e) { setErr((e as Error).message); } }
  return <section className="glass card flex flex-col gap-3"><h2 className="m-0 font-semibold">🔐 Plant connections (MCP)</h2><p className="muted m-0 text-xs">Read-only by default. Writes require an explicit tag allowlist + human approval and are audit-logged. Tokens are entered server-side (env/secret manager), never here.</p>
    <div className="grid gap-2 md:grid-cols-2"><input className="field" placeholder="Name (e.g. Plant A historian)" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /><input className="field" placeholder="https://mcp.plant.example/sse" value={d.url} onChange={(e) => setD({ ...d, url: e.target.value })} />
      <NeonSelect className="field" value={d.auth} onChange={(e) => setD({ ...d, auth: e.target.value as Conn["auth"] })}><option value="oauth">OAuth 2.1 (PKCE)</option><option value="token">Bearer token (server env)</option><option value="mtls">mTLS client cert</option></NeonSelect>
      <input className="field" placeholder="Write allowlist tags (comma) e.g. FIC-101.SP" value={d.allowlist} onChange={(e) => setD({ ...d, allowlist: e.target.value })} disabled={d.readOnly} /></div>
    <div className="row"><NeonCheck checked={d.readOnly} onChange={(v) => setD({ ...d, readOnly: v })} label="Read-only" tip="Recommended" /><NeonCheck checked={d.approval} onChange={(v) => setD({ ...d, approval: v })} label="Require human approval for writes" /></div>
    {err && <p className="m-0 text-sm" style={{ color: "#ff4d6d" }}>{err}</p>}<button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={add}>Add connection</button>
    {cs.map((c, i) => <div key={i} className="row text-sm"><b>{c.name}</b><span className="muted">{c.url}</span><span className="pill">{c.auth}</span><span className="pill">{c.readOnly ? "read-only" : `writes: ${c.allowlist || "none"}`}</span><button className="btn" onClick={() => save(cs.filter((_, j) => j !== i))}>Remove</button></div>)}</section>;
}
