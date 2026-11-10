"use client";
import { useEffect, useState } from "react";
import type { BenchPayload, BenchRow } from "@/lib/benchmark/score";

const usd = (n: number | null) => (n == null ? "—" : n === 0 ? "$0.00" : `$${n < 0.01 ? n.toFixed(6) : n.toFixed(4)}`);
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

function Table({ rows }: { rows: BenchRow[] }) {
  return <div style={{ overflowX: "auto" }}><table className="text-sm">
    <thead><tr><th>Case</th><th>Expected</th><th>Report said</th><th>Match</th><th>Provider</th><th>ms</th><th>Tokens</th><th>Est. cost</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.id}>
      <td><b>{r.asset}</b><div className="muted">{r.id}</div></td>
      <td>{r.expectedEquipment}<div className="muted">{r.expectedFailure}</div></td>
      <td>{r.equipment || "—"}<div className="muted">{r.diagnosis}</div></td>
      <td style={{ color: r.correct ? "var(--neon)" : r.nearMiss ? "var(--warn)" : "var(--danger)" }}>{r.abstained ? "Review" : r.correct ? "Exact" : r.nearMiss ? "Near" : "Miss"}<div className="muted">{r.heldOut ? "held-out · " : ""}{r.abstained ? "abstained · " : ""}{r.equipmentHit ? "equipment" : "equipment miss"} · {r.failureHit ? "failure" : "failure miss"}</div></td>
      <td>{r.provider}<div className="muted">{r.model}{r.fallback ? " · fallback" : ""}</div></td>
      <td>{Math.round(r.ms)}</td>
      <td>{r.usage ? `${r.usage.promptTokens}+${r.usage.completionTokens}` : "—"}</td>
      <td>{usd(r.estimatedUsd)}</td>
    </tr>)}</tbody>
  </table></div>;
}

function Stats({ title, s }: { title: string; s: BenchPayload["summary"] }) {
  const cards: [string, string][] = [
    ["Exact accuracy", `${s.correct}/${s.n} (${pct(s.accuracy)})`],
    ["Near-miss (includes exact)", `${s.nearMisses}/${s.n} (${pct(s.nearMissAccuracy)})`],
    ["Held-out exact", `${s.heldOutCorrect}/${s.heldOut}`],
    ["Abstained", `${s.abstained}/${s.n}`],
    ["Mean time to report", `${Math.round(s.meanMs)} ms`],
    ["Median time", `${Math.round(s.medianMs)} ms`],
    ["Cost per report", usd(s.costPerReportUsd)],
    ["Token usage", `${s.totalPromptTokens} in / ${s.totalCompletionTokens} out`],
    ["Usage returned", `${s.reportsWithUsage}/${s.n}`],
  ];
  return <section className="glass card"><h2 className="m-0 text-lg">{title}</h2>
    <div className="grid-auto">{cards.map(([k, v]) => <div key={k}><div className="text-xs muted">{k}</div><div className="neon text-2xl font-extrabold">{v}</div></div>)}</div>
  </section>;
}

export default function BenchmarkClient() {
  const [data, setData] = useState<BenchPayload | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fresh: boolean) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/benchmark", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fresh }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => { void run(false); }, []);
  const rate = data?.rows.find((r) => r.provider !== "catalog")?.rateNote ?? data?.rows[0]?.rateNote;
  return <main className="mx-auto flex max-w-[1100px] flex-col gap-4 p-4 md:p-6">
    <header className="topbar"><div className="row"><a className="btn btn-sm" href="/">← FixLine</a><b className="neon">Benchmark</b></div><a className="btn btn-sm" href="/xr?job=shaft">Laser alignment in AR</a></header>
    <section className="glass card">
      <p className="pill m-0" style={{ alignSelf: "flex-start" }}>Sample data · not a plant trial</p>
      <h1 className="m-0 text-3xl font-extrabold">Twenty seeded faults. Four paths.</h1>
      <p className="m-0">Model-only asks <b>muse-spark-1.3</b> with no catalog. Hybrid retrieves a short mixed list. Two-stage shows the full compact plant catalog, then the failures of the chosen class only. Confidence under 0.5, or a citation that is not on the list, becomes “needs technician review” and counts as not exact. NVIDIA NIM answers only if Meta does not. Catalog-only makes no model call.</p>
      <p className="m-0 text-sm muted">Exact means every word of the expected equipment name and every word of the expected failure appear in the answer. Near-miss means at least half of those words appear on both labels. Exact is never replaced by near-miss. Held-out symptoms were written so the catalog word-match misses, and the labels were not edited after the model run.</p>
      <div className="row"><button className="btn btn-primary" disabled={busy} onClick={() => run(true)}>{busy ? "Running…" : "Run again"}</button>{data?.cached && <span className="pill">Showing the last measured run · {data.ranAt}</span>}</div>
      {busy && <p role="status" className="m-0">Calling the model twice per sample case. This can take a few minutes.</p>}
      {err && <p role="alert" className="m-0" style={{ color: "var(--danger)" }}>{err}</p>}
    </section>
    {data && <>
      <Stats title="Model-only — no catalog in the prompt" s={data.summary} />
      <Stats title="Catalog-only — no model call" s={data.catalogSummary} />
      <Stats title="Hybrid — short retrieved list" s={data.hybridSummary} />
      <Stats title="Two-stage — plant catalog, then that class’s failures" s={data.twoStageSummary} />
      <section className="glass card"><h2 className="m-0 text-lg">Model-only reports</h2><Table rows={data.rows} /></section>
      <section className="glass card"><h2 className="m-0 text-lg">Hybrid reports</h2><Table rows={data.hybridRows} /></section>
      <section className="glass card"><h2 className="m-0 text-lg">Two-stage reports</h2><Table rows={data.twoStageRows} /></section>
      <section className="glass card"><h2 className="m-0 text-lg">Catalog reports</h2><Table rows={data.catalogRows} />
        <p className="m-0 text-xs muted">{data.sampleLabel} Stamped {data.ranAt}. {rate}</p>
      </section>
    </>}
  </main>;
}
