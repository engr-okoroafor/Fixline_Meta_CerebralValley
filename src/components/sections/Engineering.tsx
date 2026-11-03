"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, Field, Tip, Btn } from "../ui";
import { cableSize, pipe, PIPE } from "@/lib/calc";
import { EQUIPMENT, CATEGORIES, VENDORS, searchEquipment, domainOf, criticalityOf, tagPrefix, type Equipment } from "@/lib/equipment";
import { go } from "../next/DeepLinks";
import { pipingSpec, PRODUCTS, type Product } from "@/lib/piping";
import { findStandards } from "@/lib/standards";
import { prefs, savePrefs, post, fileToDataUrl } from "./shared";
import { RichAnswer, type Rich } from "./Copilot";
import { NeonSelect } from "../NeonSelect";
import dynamic from "next/dynamic";
import { Loader } from "../next/Loader";
const EngineeringLab = dynamic(() => import("../eng/EngineeringLab"), { ssr: false, loading: () => <Loader label="Loading engineering lab" /> });
/** Tool help: what it does · when to use it · how to fix the issue it finds. */
export const HELP: Record<string, [string, string, string]> = {
  machine: ["Pick the exact vendor model family from the offline catalogue (~180 families).", "Before any job — every tool below then uses this machine's failure modes, checks and standards.", "Read 'Likely failures' top-down; run each check in order; log readings; escalate if a check fails twice."],
  cable: ["Sizes copper conductor from load current with derating (IEC 60364-5-52).", "New motor feed, overheating cable, nuisance tripping, changing a load.", "If the existing cable is smaller than the result: reduce load or replace cable; re-check protective device rating and volt drop."],
  piping: ["Suggests pipe code, material, schedule, flange, gasket and hydrotest for a product and pressure.", "Replacing a spool, leak repair, tie-in, or checking a contractor's proposal.", "If the installed schedule is thinner than required: de-rate, clamp temporarily (engineered clamp), replace with the suggested schedule."],
  wps: ["Generates electrode, amps, polarity, angle, preheat, PWHT and NDT tied to the pipe material and wall.", "Before any pressure-retaining weld (repair or tie-in).", "Use a qualified welder (ASME IX) and an approved PQR; if NDT finds defects, grind out and re-weld per repair WPS."],
  schedule: ["Looks up OD, wall, ID and Class 150 bolts by NPS and schedule (ASME B36.10M/B16.5).", "Ordering pipe, reducers, gaskets and bolts.", "Mismatch at a flange? Check both ends' NPS/class; never mix RF and FF faces."],
  workflows: ["Step-by-step workflows for each repair type with standards.", "Any time a junior tech starts a job type for the first time.", "If a step fails, stop, make safe, and ask Ask AI with a photo."],
};
const H = ({ k }: { k: keyof typeof HELP }) => <Tip label={`What: ${HELP[k][0]} · When: ${HELP[k][1]} · Fix: ${HELP[k][2]}`}><span tabIndex={0} role="img" aria-label={`Help for ${k}`} className="pill" style={{ cursor: "help" }}>ⓘ how</span></Tip>;
/** Repair-type how-tos. Each step: "Title | detail · detail · detail" — rendered as numbered steps with bullets. */
const WORKFLOWS: [string, string, string[]][] = [
  ["Mechanical (pumps, compressors, gearboxes)", "ISO 14224, API 610/686, ISO 20816, OSHA 1910.147", [
    "Permit & isolation | Raise PTW and JSA; identify every energy source (electrical, pressure, thermal, stored spring/gravity) · Apply LOTO per OSHA 1910.147 / ISO 14118, one personal lock per worker · Close & lock suction/discharge valves, depressurise and drain to closed drain · Verify zero energy: try-start, gauge reads 0, live-dead-live test on motor terminals",
    "As-found record | Vibration H/V/A at each bearing (mm/s RMS) and bearing temperature · Photograph seal faces, coupling, baseplate, leaks · Note soft-foot (>0.05 mm) and pipe strain (dial indicator on coupling while unbolting flanges)",
    "Alignment | Laser align per API 686 Ch.7 · Tolerance @1500 rpm: offset ≤0.05 mm, angularity ≤0.05 mm/100 mm (tighter at 3000 rpm) · Correct vertical with stainless shims (max 4 per foot), then horizontal with jack bolts · Allow for thermal growth targets from OEM",
    "Bearings & seals | Measure shaft run-out (≤0.05 mm TIR) and end float · Replace bearings with induction heater (never flame), max 110 °C · Mechanical seal per API 682: check face flatness, set working length, clean flush plan · Replace wear rings if clearance > 1.5× OEM",
    "Reassembly | Torque bolts in star/cross pattern in 3 passes (30/70/100%) to OEM values · Lubricate to OEM grade & quantity; don't over-grease · Refit coupling guard before any rotation",
    "Run-in & handover | Remove LOTO per sequence, notify control room · Run 30 min minimum, monitor amps, ΔP, temps · Re-measure vibration: ISO 20816 zone A/B to accept · Update CMMS work order with as-left data and failure code (ISO 14224)"]],
  ["Electrical (motors, MCCs, switchgear)", "NFPA 70E, IEC 60364, IEEE 43, IEC 60034", [
    "Risk assessment | Read arc-flash label: incident energy (cal/cm²), PPE category, arc boundary · Shock approach boundaries (limited/restricted) per NFPA 70E Table 130.4 · Energised work only with justified EEWP",
    "Isolate & prove dead | Open breaker, rack out, apply lock & tag · Live-dead-live test with CAT III/IV rated tester · Apply temporary earths/grounds on all phases",
    "Insulation tests | IEEE 43: IR ≥ (kV + 1) MΩ at 40 °C corrected · Polarisation index PI ≥ 2.0 (class F/H) · Winding resistance balance within 2% between phases",
    "Terminations | Torque lugs to manufacturer values; check for heat discolouration · Verify earth continuity < 0.1 Ω · Gland and IP rating intact (Ex-rated in hazardous areas per IEC 60079-14)",
    "Protection | Verify overload/relay settings vs. motor FLA · RCD trip time ≤ 300 ms at IΔn (≤ 40 ms at 5×) · Check phase rotation before coupling load",
    "Re-energise | Remove earths, notify affected parties · Record no-load and loaded current, voltage balance (< 1%) · Thermographic (IR) scan after 1 h at load"]],
  ["Instrumentation (F&G, P/L/T, valves)", "IEC 61511, ISA 5.1, IEC 60079, ISA 84", [
    "Bypass control | Inhibit/bypass SIS or F&G loop only under permit · Define compensating measure (fire watch, manual monitoring) · Log bypass start time; max duration per site SIS procedure",
    "Isolate transmitter | Close root & manifold valves (3/5-valve: equalise first) · Vent impulse lines to safe location; check for H₂S · Disconnect loop with loop current verified at 0 mA",
    "Calibration | 5-point up/down: 0/25/50/75/100% · Accept within ±0.25% span (or loop spec); record as-found AND as-left · Check HART config: range, damping, units",
    "Fire & gas detectors | Bump test with certified calibration gas (in-date certificate) · Verify voting logic (1oo2/2oo3) and alarm/trip setpoints (typ. 20%/60% LEL) · Flame detectors: test lamp at rated distance",
    "Control / ESD valves | Full-stroke test; record stroke time vs. spec · Partial-stroke test for SIL valves · Check positioner calibration and fail-safe action (FC/FO) on air loss",
    "Return to service | Remove inhibit, confirm healthy at DCS/SIS · Record proof-test result in SIS log (IEC 61511-1 §16) · Update calibration certificate & next due date"]],
  ["Vibration analysis", "ISO 20816, ISO 13373, ISO 18436", [
    "Measure | Velocity mm/s RMS at H/V/A of each bearing, 10–1000 Hz · Accelerometer magnet-mounted, same points every survey · Note speed, load, process conditions",
    "Classify | ISO 20816 zones: A new, B unrestricted, C limited, D damage · Compare against baseline and trend (+25% step = investigate)",
    "Diagnose spectrum | 1× radial = unbalance · 2× axial/radial = misalignment · BPFO/BPFI/BSF = bearing defects; check envelope/demod · Sub-synchronous 0.4–0.48× = oil whirl",
    "Correct | Field balance to ISO 21940 G2.5/G6.3 · Re-align, fix soft-foot, tighten base · Replace bearings with root-cause (lubrication, contamination)",
    "Verify | Re-measure all points; confirm zone A/B · Update trend baseline in CMMS"]],
  ["Piping / leaks", "ASME B31.3, ASME PCC-1, ASME PCC-2, API 570", [
    "Make safe | Isolate with positive isolation (spade/blind) for hazardous fluids · Depressurise, drain, purge, gas test (O₂ 19.5–23.5%, LEL < 10%, H₂S < 1 ppm)",
    "Classify the leak | Flange (gasket/bolting), pinhole (corrosion), crack (fatigue/SCC) · Measure remaining wall thickness by UT around the defect",
    "Flange repair | New gasket per pipe class; clean faces, check flatness · PCC-1 legacy or star pattern, 4 passes, calibrated torque/tensioning · Record bolt load per joint (joint ID tag)",
    "Pinhole / wall loss | Temporary: engineered clamp or composite wrap per PCC-2 · Permanent: cut-out and replace spool with qualified welding · Fitness-for-service per API 579 if leaving in service",
    "Test | Hydrotest 1.5× design per B31.3 §345 (or pneumatic 1.1× with safety distance) · Hold, inspect all joints, record",
    "Reinstate | Remove blinds per isolation register · Leak check at operating pressure; update inspection records (API 570)"]],
  ["Welding", "ASME IX, AWS D1.1, ASME B31.3 Ch. V, ISO 17637", [
    "Qualify | Approved WPS + supporting PQR · Welder qualified (WPQ) for process, position, thickness · Hot-work permit, fire watch, gas test",
    "Fit-up | Bevel 37.5° ±2.5°, root gap & land per WPS · Preheat per WPS (e.g. 100 °C for CS > 25 mm), check with temp stick",
    "Weld | Root → hot pass → fill → cap · Interpass temperature control · Consumables stored/dried per AWS spec (low-H electrodes)",
    "Inspect | Visual per ISO 17637 · NDT: RT/UT per B31.3 category (normal 5%, severe cyclic 100%) · Repair & re-inspect any rejects",
    "Post-weld | PWHT if thickness/material requires · Hardness ≤ 250 HV10 for sour service (NACE MR0175) · Weld map & traceability recorded"]],
  ["Cable & motor feeds", "IEC 60364-5-52, IEC 60034, NEC 430", [
    "Size | Full-load current × 1.25 for motors (NEC 430.22) · Apply derating for grouping, ambient temp, burial",
    "Volt-drop | ≤ 5% at running, ≤ 15% at starting for motors · Check short-circuit withstand of cable",
    "Install | Gland type & Ex rating for zone · Earth continuity, armour bonded at both ends unless specified",
    "Test | IR test 1 kV for 1 min (≥ 100 MΩ new cable) · Phase rotation and correct direction (bump test uncoupled)",
    "Commission | Record currents, voltage, temps · Update cable schedule and as-builts"]],
  ["Material selection", "NACE MR0175/ISO 15156, API 571, ASME II", [
    "Define service | Fluid, temperature, pressure, H₂S/CO₂ partial pressure, chlorides, pH · Expected life and inspection access",
    "Select base material | Carbon steel + corrosion allowance (typ. 3 mm) vs. CRA (22Cr duplex, 316L) · Check API 571 damage mechanisms (CUI, SCC, MIC, erosion)",
    "Sour service check | NACE MR0175 limits by H₂S partial pressure & pH · Hardness limits and heat treatment",
    "Protection | Coating system, cathodic protection, CUI-resistant insulation · Inhibitor injection if CS selected",
    "Document | Update pipe class / material spec · Material certificates EN 10204 3.1"]],
];
type Asset = { tag: string; location: string; serial: string; lastService: string; interval: number; owner: string };
const CRIT_C: Record<string, string> = { Low: "#39FF14", Medium: "#fbbf24", High: "#ff8a3d", Critical: "#ff4d6d" };
/** Standard asset record (ISO 14224 / ISO 55000 style) for the selected machine; editable fields persist per machine. */
function AssetRecord({ m }: { m: Equipment }) {
  const [now] = useState(() => Date.now()); const key = `fixline.asset.${m.id}`; const def: Asset = { tag: `${tagPrefix(m)}-101A`, location: domainOf(m) === "home" ? "Residence · utility room" : domainOf(m) === "building" ? "Plant room · Level B1" : "Area 100 · Process unit", serial: "", lastService: new Date(now - 75 * 864e5).toISOString().slice(0, 10), interval: 180, owner: "" };
  const [a, setA] = useState<Asset>(def); const [edit, setEdit] = useState(false);
  useEffect(() => { try { const s = localStorage.getItem(key); setA(s ? { ...def, ...JSON.parse(s) } : def); } catch { setA(def); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id]);
  const save = (n: Asset) => { setA(n); localStorage.setItem(key, JSON.stringify(n)); };
  const due = new Date(new Date(a.lastService).getTime() + a.interval * 864e5); const days = Math.round((due.getTime() - now) / 864e5); const crit = criticalityOf(m)!;
  const rows: [string, React.ReactNode][] = [["Equipment type", m.name], ["Class / domain", `${m.category} · ${domainOf(m)}`], ["Make / model", m.vendor ? `${m.vendor} · ${m.family ?? m.name}` : "Generic (any make)"], ["Tag / asset ID", <b key="t" className="neon font-mono">{a.tag}</b>], ["Serial no.", a.serial || "—"], ["Location", a.location], ["Criticality", <span key="c" className="pill" style={{ borderColor: CRIT_C[crit], color: CRIT_C[crit] }}>{crit}</span>], ["Owner / area", a.owner || "Maintenance"], ["Last service", a.lastService], ["Next due", <span key="d" style={{ color: days < 0 ? "var(--danger)" : days < 30 ? "var(--warn)" : undefined }}>{due.toISOString().slice(0, 10)} ({days < 0 ? `${-days} d overdue` : `in ${days} d`})</span>], ["Live tags", m.tags.length ? m.tags.map((t) => `${t}-${a.tag.replace(/^\D+-?/, "")}`).join(" · ") : "—"], ["Standards", m.standards.join(", ")]];
  const I = (k: keyof Asset, l: string, type = "text") => <Field key={k} label={l}><input type={type} value={String(a[k])} onChange={(e) => setA({ ...a, [k]: type === "number" ? Number(e.target.value) : e.target.value })} /></Field>;
  return <section data-testid="asset-record" className="rounded-3xl p-4" style={{ background: "rgba(57,255,20,.04)", border: "1px solid rgba(57,255,20,.3)" }}>
    <div className="row" style={{ justifyContent: "space-between" }}><b className="neon">Asset record · {a.tag}</b><div className="row">
      <Btn tip="Ask AI about this exact machine" className="btn-sm" onClick={() => go("ask")}>✦ Ask AI</Btn><Btn tip="Open guided repair for this machine" className="btn-sm" onClick={() => go("repair")}>🔧 Repair</Btn><Btn tip="See this machine's tags on the SCADA P&ID" className="btn-sm" onClick={() => go("scada")}>📟 SCADA</Btn><Btn tip={edit ? "Save the asset record" : "Edit tag, location, serial and service dates"} className="btn-sm btn-primary" onClick={() => { if (edit) save(a); setEdit(!edit); }}>{edit ? "Save" : "Edit"}</Btn></div></div>
    {edit ? <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3">{I("tag", "Tag / asset ID")}{I("serial", "Serial no.")}{I("location", "Location")}{I("owner", "Owner / area")}{I("lastService", "Last service", "date")}{I("interval", "Service interval (days)", "number")}</div>
      : <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{rows.map(([k, v]) => <div key={k}><dt className="muted text-xs">{k}</dt><dd className="m-0">{v}</dd></div>)}</dl>}
  </section>;
}
export default function Engineering() {
  const [mid, setMid] = useState(""); const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [ven, setVen] = useState("");
  const [a, setA] = useState(40); const [d, setD] = useState(1); const [nps, setNps] = useState("4"); const [sch, setSch] = useState<"40" | "80">("40");
  const [product, setProduct] = useState<Product>("crude"); const [pbar, setPbar] = useState(40); const [tc, setTc] = useState(60); const [pnps, setPnps] = useState("6");
  const [photo, setPhoto] = useState<Rich | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => setMid(prefs().machine), []);
  const list = useMemo(() => (q.length > 2 ? searchEquipment(q) : EQUIPMENT).filter((e) => (!cat || e.category === cat) && (!ven || e.vendor === ven)).slice(0, 60), [q, cat, ven]);
  const m: Equipment | undefined = EQUIPMENT.find((e) => e.id === mid);
  const c = cableSize(a, d); const p = pipe(nps, sch); const spec = pipingSpec(product, pnps, pbar, tc);
  const choose = (id: string) => { setMid(id); savePrefs({ machine: id }); };
  async function photoGuide(f: File) { setBusy(true); setErr(""); try { const img = await fileToDataUrl(f); setPhoto(await post("/api/copilot", { session: `eng-${mid || "any"}-${Date.now()}`, question: `Inspect this photo of ${m?.name ?? "the equipment"} and give repair guidance.`, images: [img], machine: mid || undefined, lang: prefs().lang })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="How to use Engineering" sub="Work top to bottom. Each tool says what it does, when to use it, and what to do if the result is wrong." className="lg:col-span-2">
      <ol className="m-0 grid gap-2 pl-5 text-sm md:grid-cols-2">{Object.entries(HELP).map(([k, [what, when, fix]]) => <li key={k}><b className="neon capitalize">{k}</b> — {what} Use it {when.charAt(0).toLowerCase() + when.slice(1)} If it looks wrong: {fix}</li>)}</ol>
      <p className="m-0 text-xs muted">Then open the natural-language bar above: “size cable for 60 A”, “pipe 4 inch schedule 80”, or “shaft alignment”.</p>
    </Card>
    <Card title="Selected machine" sub="Standard asset record · linked to Ask AI, Repair and SCADA" right={<H k="machine" />} className="lg:col-span-2">
      <div className="grid gap-3 md:grid-cols-4"><Field label="Search" tip="Vendor, model, symptom — e.g. 'ABB ACS880 overcurrent'"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search catalogue…" /></Field>
        <Field label="Category"><NeonSelect value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</NeonSelect></Field>
        <Field label="Vendor"><NeonSelect value={ven} onChange={(e) => setVen(e.target.value)}><option value="">All</option>{VENDORS.map((x) => <option key={x}>{x}</option>)}</NeonSelect></Field>
        <Field label={`Machine (${list.length})`}><NeonSelect value={mid} onChange={(e) => choose(e.target.value)}><option value="">— choose —</option>{list.map((e) => <option key={e.id} value={e.id}>{e.vendor ? `${e.vendor} · ` : ""}{e.family ?? e.name}</option>)}</NeonSelect></Field></div>
      {!m && <p className="m-0 muted text-sm">Search {EQUIPMENT.length}+ industrial, building and home machine types (pumps, motors, compressors, turbines, conveyors, HVAC, boilers, generators, CNCs, elevators, appliances…) and vendor models.</p>}
      {m && <AssetRecord m={m} />}
      {m && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-3">
        <div><h3 className="neon m-0">{m.name}</h3><p className="m-0 muted text-sm">{m.category}{m.vendor ? ` · ${m.vendor}` : " · generic"}</p>
          <div className="row mt-2">{m.tags.map((t) => <Tip key={t} label={/^(PT|TT|FT|LT|VT|IT|ST)/.test(t) ? "Live/sim tag — open SCADA to see it trend (simulator unless a connector is configured)" : "Tag"}><span className="pill">{t} · sim</span></Tip>)}</div>
          {m.catalog && <Tip label="Opens the vendor's own catalogue/manual search in a new tab"><a className="btn mt-2" href={m.catalog} target="_blank" rel="noreferrer">Vendor catalogue ↗</a></Tip>}
          <p className="m-0 mt-2 text-xs muted">Standards: {m.standards.join(", ")}</p></div>
        <div><b className="text-sm">Likely failures</b><ul className="m-0 pl-5 text-sm">{m.failures.map((f) => <li key={f}>{f}</li>)}</ul><b className="text-sm">Checks</b><ul className="m-0 pl-5 text-sm">{m.checks.map((f) => <li key={f}>{f}</li>)}</ul></div>
        <div><b className="text-sm">Photo → guidance</b><Field label="Upload or snap a photo" tip="Camera on phones. The AI combines the photo with this machine's catalogue entry."><input type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) photoGuide(f); }} /></Field>{busy && <p className="muted m-0">Inspecting…</p>}{err && <p role="alert" style={{ color: "var(--danger)" }}>{err}</p>}</div>
      </motion.div>}
      {m?.howTo?.length ? <details><summary className="neon cursor-pointer">How-to for each check ({m.howTo.length})</summary><ol className="text-sm">{m.howTo.map((h) => <li key={h}>{h}</li>)}</ol></details> : null}
      {photo && <RichAnswer r={photo} />}
    </Card>
    <Card title="Piping by product (auto-suggest)" sub="Code, material, schedule, flange, gasket, hydrotest" right={<H k="piping" />}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Field label="Product"><NeonSelect value={product} onChange={(e) => setProduct(e.target.value as Product)}>{PRODUCTS.map((x) => <option key={x}>{x}</option>)}</NeonSelect></Field><Field label="NPS (in)"><NeonSelect value={pnps} onChange={(e) => setPnps(e.target.value)}>{Object.keys(PIPE).map((k) => <option key={k}>{k}</option>)}</NeonSelect></Field><Field label="Design P (bar)"><input type="number" value={pbar} onChange={(e) => setPbar(+e.target.value)} /></Field><Field label="Design T (°C)"><input type="number" value={tc} onChange={(e) => setTc(+e.target.value)} /></Field></div>
      {"code" in spec && <div className="grid gap-1 text-sm"><p className="m-0">Schedule <b className="neon">{spec.schedule}</b> · wall {spec.wallMm} mm (need {spec.requiredWithCaMillMm} mm incl. CA {spec.corrosionAllowanceMm} mm & mill tol.)</p><p className="m-0">Code: {spec.code}</p><p className="m-0">Material: {spec.material}</p><p className="m-0">Flange: {spec.flange} · Gasket: {spec.gasket}</p><p className="m-0">Hydrotest: {spec.hydrotest}</p>{spec.nace && <p className="m-0" style={{ color: "var(--warn)" }}>Sour service — NACE MR0175 hardness ≤ 248 HV10</p>}<p className="m-0 muted text-xs">{spec.note} Cites: {spec.standards!.join(", ")}. Preliminary — verify against the project pipe class.</p></div>}
    </Card>
    <Card title="Welding WPS (tied to pipe)" sub={"code" in spec ? `${(spec.material ?? "").split(" or ")[0]} · ${spec.wallMm} mm wall` : ""} right={<H k="wps" />}>
      {"weld" in spec && spec.weld && <><div style={{ overflowX: "auto" }}><table className="text-xs"><thead><tr><th>Pass</th><th>Electrode</th><th>Ø</th><th>Amps</th><th>Polarity</th><th>Angle</th><th>Travel</th></tr></thead><tbody>{spec.weld.passes.map((x) => <tr key={x.pass}><td>{x.pass}</td><td>{x.aws}</td><td>{x.dia}</td><td>{x.amps}</td><td>{x.polarity}</td><td>{x.angle}</td><td>{x.travel}</td></tr>)}</tbody></table></div>
        <ul className="m-0 pl-5 text-sm"><li>{spec.weld.process} · {spec.weld.pNo} · {spec.weld.fNo}</li><li>Preheat {spec.weld.preheat}; interpass {spec.weld.interpass}</li><li>PWHT: {spec.weld.pwht}</li><li>Bevel: {spec.weld.bevel}</li><li>{spec.weld.storage}</li><li>NDT: {spec.weld.ndt}</li></ul><p className="m-0 muted text-xs">{spec.weld.standards.join(" · ")}</p></>}
    </Card>
    <EngineeringLab />
    <Card title="Cable sizing (ampacity)" right={<H k="cable" />}><div className="grid grid-cols-2 gap-3"><Field label="Load current (A)"><input type="number" value={a} onChange={(e) => setA(+e.target.value)} /></Field><Field label="Derating factor" tip="Grouping × ambient × installation factors (0.3–1)"><input type="number" step={0.05} min={0.3} max={1} value={d} onChange={(e) => setD(+e.target.value)} /></Field></div>
      <p aria-live="polite">{"mm2" in c ? <><b className="neon">{c.mm2} mm²</b> Cu (table {c.ampacity} A, derated {c.derated} A)</> : c.error}</p><p className="muted text-xs">Source: {c.source}. {"note" in c && c.note}</p></Card>
    <Card title="Pipe schedule, wall & flange bolts" right={<H k="schedule" />}><div className="grid grid-cols-2 gap-3"><Field label="NPS (in)"><NeonSelect value={nps} onChange={(e) => setNps(e.target.value)}>{Object.keys(PIPE).map((k) => <option key={k}>{k}</option>)}</NeonSelect></Field><Field label="Schedule"><NeonSelect value={sch} onChange={(e) => setSch(e.target.value as "40")}><option>40</option><option>80</option></NeonSelect></Field></div>
      {"od" in p && <p>OD {p.od}″ · wall <b className="neon">{p.wall}″</b> · ID {p.id}″ · Class 150 bolts {p.bolts}</p>}<p className="muted text-xs">Source: {p.source}. Reducers: concentric for vertical, eccentric flat-on-top for pump suction.</p></Card>
    <Card title="Repair-type workflows" sub="Every repair type, step by step, with standards" right={<H k="workflows" />} className="lg:col-span-2">
      <div className="grid gap-3 md:grid-cols-2">{WORKFLOWS.map(([t, s, steps]) => <details key={t} className="glass rounded-3xl p-3"><summary className="cursor-pointer font-bold">{t} <span className="muted text-xs">· {s}</span></summary><ol className="text-sm space-y-2 pl-5">{steps.map((x) => { const [h, d = ""] = x.split(" | "); return <li key={x}><b className="text-[var(--neon,#39FF14)]">{h}</b>{d && <ul className="mt-1 list-disc pl-4 muted text-xs space-y-0.5">{d.split(" · ").map((b) => <li key={b}>{b}</li>)}</ul>}</li>; })}</ol><p className="m-0 text-xs muted">Related: {findStandards(t.split(" (")[0]).slice(0, 3).map((x) => x.code).join(", ") || s}</p></details>)}</div>
      <div className="row"><Btn tip="Clear the selected machine" onClick={() => choose("")}>Clear machine</Btn></div>
    </Card>
  </div>;
}
