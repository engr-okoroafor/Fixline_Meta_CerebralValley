"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, Field, Btn } from "../ui";
import { DOC_TYPES, type DocType, type SafetyDoc } from "@/lib/safetydocs";
import { post, prefs, savePrefs } from "./shared";
import { usePrefs } from "../next/useLocale";
import { regionOf } from "@/lib/regions";
import { NeonCheck } from "../next/Chrome";
import { NeonSelect } from "../NeonSelect";
const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const tagOf = (d: SafetyDoc) => (d.meta.find(([k]) => /equipment|tag/i.test(k))?.[1] ?? "").match(/[A-Z]{1,4}-?\d{2,4}[A-Z]?/)?.[0] ?? "GEN";
/** Professional file name, e.g. PTW-20261031-P-101A.pdf */
export const fname = (d: SafetyDoc, ext: string) => `${d.type.toUpperCase()}-${stamp()}-${tagOf(d).replace(/[^A-Za-z0-9-]/g, "")}.${ext}`;
function save(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
const pairs = (m: [string, string][]) => Array.from({ length: Math.ceil(m.length / 2) }, (_, i) => [...(m[i * 2] ?? ["", ""]), ...(m[i * 2 + 1] ?? ["", ""])]);
export async function toPdf(d: SafetyDoc) {
  const { jsPDF } = await import("jspdf"); const pdf = new jsPDF({ unit: "pt", format: "a4" }); const L = 40, W = 515; let y = 0;
  const header = () => { pdf.setFillColor(5, 12, 8); pdf.rect(0, 0, 595, 64, "F"); pdf.setFillColor(57, 255, 20); pdf.rect(0, 64, 595, 3, "F");
    pdf.setDrawColor(57, 255, 20); pdf.setLineWidth(1.5); pdf.roundedRect(L, 16, 32, 32, 6, 6, "S"); pdf.setTextColor(57, 255, 20); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text("FL", L + 7, 37);
    pdf.setFontSize(14); pdf.text("FixLine Guardian", L + 42, 30); pdf.setTextColor(200, 220, 205); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text("Safety document - controlled copy when signed", L + 42, 44);
    pdf.text(fname(d, "pdf"), 555, 30, { align: "right" }); pdf.setTextColor(20, 20, 20); y = 92; };
  const need = (h: number) => { if (y + h > 790) { pdf.addPage(); header(); } };
  const text = (t: string, size = 10, bold = false, indent = 0, color: [number, number, number] = [20, 20, 20]) => { pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.setTextColor(...color); for (const l of pdf.splitTextToSize(t, W - indent) as string[]) { need(size * 1.4); pdf.text(l, L + indent, y); y += size * 1.4; } };
  const h2 = (t: string) => { need(30); y += 8; pdf.setFillColor(236, 255, 230); pdf.rect(L, y - 12, W, 18, "F"); pdf.setFillColor(30, 160, 20); pdf.rect(L, y - 12, 3, 18, "F"); text(t.toUpperCase(), 10.5, true, 8, [10, 90, 10]); y += 4; };
  const table = (head: string[], rows: string[][]) => { const cw = W / head.length;
    const cell = (r: string[], bold: boolean, fill?: [number, number, number]) => { pdf.setFontSize(8.5); pdf.setFont("helvetica", bold ? "bold" : "normal"); const lines = r.map((c) => pdf.splitTextToSize(String(c), cw - 8) as string[]); const h = Math.max(1, ...lines.map((l) => l.length)) * 11 + 8; need(h); if (fill) { pdf.setFillColor(...fill); pdf.rect(L, y - 10, W, h, "F"); } pdf.setDrawColor(190); pdf.setTextColor(20, 20, 20); lines.forEach((l, i) => { pdf.rect(L + i * cw, y - 10, cw, h); pdf.text(l, L + i * cw + 4, y + 1); }); y += h; };
    cell(head, true, [210, 245, 200]); rows.forEach((r, i) => cell(r, false, i % 2 ? [247, 250, 247] : undefined)); y += 6; };
  header(); text(d.title, 18, true); text(`Reference ${d.ref}`, 9, false, 0, [90, 90, 90]); y += 4;
  table(["Field", "Value", "Field", "Value"], pairs(d.meta));
  for (const s of d.sections) { h2(s.heading); s.bullets?.forEach((b) => text(`•  ${b}`, 10, false, 10)); if (s.table) table(s.table.head, s.table.rows); }
  h2("Authorisation & sign-off"); table(["Role", "Name", "Signature", "Date / time"], d.signoffs.map((r) => [r, "", "", ""]));
  text(`Standards referenced: ${d.standards.join("; ")}`, 8, false, 0, [90, 90, 90]);
  const n = pdf.getNumberOfPages(); for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(7.5); pdf.setTextColor(120); pdf.text(`${d.ref} - Page ${i} of ${n}`, L, 820); pdf.text("Verify against site procedures and local regulations.", 555, 820, { align: "right" }); }
  save(pdf.output("blob"), fname(d, "pdf"));
}
export async function toDocx(d: SafetyDoc) {
  const x = await import("docx"); const G = "1EA014";
  const R = (text: string, o: Record<string, unknown> = {}) => new x.TextRun({ text, font: "Calibri", size: 20, ...o });
  const P = (t: string, o: Record<string, unknown> = {}) => new x.Paragraph({ spacing: { after: 80 }, children: [R(t, o)] });
  const b = { style: x.BorderStyle.SINGLE, size: 4, color: "BFBFBF" }; const borders = { top: b, bottom: b, left: b, right: b };
  const T = (head: string[], rows: string[][]) => new x.Table({ width: { size: 100, type: x.WidthType.PERCENTAGE }, rows: [head, ...rows].map((r, i) => new x.TableRow({ tableHeader: i === 0, children: r.map((c) => new x.TableCell({ borders, shading: i === 0 ? { type: x.ShadingType.CLEAR, color: "auto", fill: "D2F5C8" } : i % 2 ? undefined : { type: x.ShadingType.CLEAR, color: "auto", fill: "F7FAF7" }, margins: { top: 60, bottom: 60, left: 90, right: 90 }, children: [new x.Paragraph({ children: [R(c, { bold: i === 0, size: 18 })] })] })) })) });
  const H = (t: string) => new x.Paragraph({ heading: x.HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, shading: { type: x.ShadingType.CLEAR, color: "auto", fill: "ECFFE6" }, children: [R(t.toUpperCase(), { bold: true, color: "0A5A0A", size: 22 })] });
  const kids: (InstanceType<typeof x.Paragraph> | InstanceType<typeof x.Table>)[] = [
    new x.Paragraph({ border: { bottom: { style: x.BorderStyle.SINGLE, size: 12, color: G, space: 4 } }, children: [R("◆ FixLine Guardian", { bold: true, color: G, size: 28 }), R("    Safety document · controlled copy when signed", { color: "777777", size: 16 })] }),
    new x.Paragraph({ heading: x.HeadingLevel.TITLE, spacing: { before: 200 }, children: [R(d.title, { bold: true, size: 40 })] }), P(`Reference ${d.ref} · File ${fname(d, "docx")}`, { color: "666666", size: 18 }),
    T(["Field", "Value", "Field", "Value"], pairs(d.meta))];
  for (const s of d.sections) { kids.push(H(s.heading)); s.bullets?.forEach((t) => kids.push(new x.Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [R(t)] }))); if (s.table) kids.push(T(s.table.head, s.table.rows)); }
  kids.push(H("Authorisation & sign-off"), T(["Role", "Name", "Signature", "Date / time"], d.signoffs.map((r) => [r, "", "", ""])), P(`Standards referenced: ${d.standards.join("; ")}`, { italics: true, size: 16, color: "666666" }));
  const footer = new x.Footer({ children: [new x.Paragraph({ alignment: x.AlignmentType.CENTER, children: [R(`${d.ref} · Page `, { size: 16, color: "888888" }), new x.TextRun({ children: [x.PageNumber.CURRENT], size: 16, color: "888888" }), R(" · Verify against site procedures and local regulations.", { size: 16, color: "888888" })] })] });
  save(await x.Packer.toBlob(new x.Document({ creator: "FixLine Guardian", title: d.title, sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, footers: { default: footer }, children: kids }] })), fname(d, "docx"));
}
export function toPng(d: SafetyDoc) {
  const c = document.createElement("canvas"); const W = 1240; const lines: [string, number, string][] = [[d.title, 34, "#39FF14"], [`Ref ${d.ref}`, 18, "#aaa"], ...d.meta.map(([k, v]) => [`${k}: ${v}`, 20, "#fff"] as [string, number, string])];
  d.sections.forEach((s) => { lines.push([s.heading, 26, "#39FF14"]); s.bullets?.forEach((b) => lines.push([`• ${b}`, 19, "#fff"])); s.table?.rows.forEach((r) => lines.push([r.join(" | "), 17, "#ddd"])); });
  d.signoffs.forEach((s) => lines.push([`${s}: ____________`, 19, "#fff"]));
  const g0 = c.getContext("2d")!; const wrapped: [string, number, string][] = [];
  for (const [t, s, col] of lines) { g0.font = `${s}px sans-serif`; let cur = ""; for (const w of t.split(" ")) { if (g0.measureText(cur + w).width > W - 80) { wrapped.push([cur, s, col]); cur = ""; } cur += w + " "; } wrapped.push([cur, s, col]); }
  c.width = W; c.height = 80 + wrapped.reduce((a, [, s]) => a + s * 1.45, 0); const g = c.getContext("2d")!; g.fillStyle = "#0a0f0a"; g.fillRect(0, 0, W, c.height); g.fillStyle = "#39FF14"; g.fillRect(0, 0, W, 10);
  let y = 50; for (const [t, s, col] of wrapped) { g.font = `${s}px sans-serif`; g.fillStyle = col; g.fillText(t, 40, y); y += s * 1.45; }
  c.toBlob((b) => b && save(b, fname(d, "png")));
}
/** Safety document generator: PTW, HAZOP, risk assessment, JSA, LOTO, hot work. */
export function SafetyDocs() {
  const [type, setType] = useState<DocType>("ptw"); const [job, setJob] = useState("Replace mechanical seal on crude transfer pump P-101A"); const [loc, setLoc] = useState("Flow station manifold"); const [eq, setEq] = useState(""); const [crew, setCrew] = useState("");
  const [doc, setDoc] = useState<SafetyDoc | null>(null); const [model, setModel] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function gen() { setBusy(true); setErr(""); try { const r = await post("/api/safety-doc", { type, task: job, location: loc || undefined, equipment: eq || undefined, crew: crew || undefined, lang: prefs().lang === "en" ? undefined : prefs().lang }); setDoc(r.doc); setModel(r.model); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }
  const r = regionOf(usePrefs()?.region);
  return <Card title="Safety documents in 60 seconds" sub={`Pick a type, then generate. Covers ${Object.values(DOC_TYPES).join(", ")}. Biased to ${r.label} (${r.bodies.slice(0, 3).join(", ")}). Export PDF · DOCX · PNG.`} right={<span className="pill">⭐ {Object.keys(DOC_TYPES).length} document types</span>} className="lg:col-span-2 safety-hero">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(DOC_TYPES).map(([k, l], i) => <motion.button type="button" key={k} aria-pressed={type === k} onClick={() => setType(k as DocType)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * .03 }} whileHover={{ y: -3 }} className="flex flex-col items-center rounded-3xl p-3 text-center" style={{ minHeight: 72, background: type === k ? "rgba(57,255,20,.2)" : k === "fire" ? "rgba(255,120,40,.12)" : "rgba(57,255,20,.06)", border: `1px solid rgba(57,255,20,${type === k ? .9 : .35})`, boxShadow: type === k ? "0 0 18px rgba(57,255,20,.35)" : undefined }}><b className="neon">{k.toUpperCase()}</b><span className="text-xs muted">{String(l)}</span></motion.button>)}</div>

    <div className="grid gap-3 md:grid-cols-3"><Field label="Document"><NeonSelect value={type} onChange={(e) => setType(e.target.value as DocType)}>{Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NeonSelect></Field>
      <Field label="Work description" tip="What will be done, on what"><input value={job} onChange={(e) => setJob(e.target.value)} /></Field><Field label="Location"><input value={loc} onChange={(e) => setLoc(e.target.value)} /></Field>
      <Field label="Equipment tag"><input value={eq} onChange={(e) => setEq(e.target.value)} placeholder="P-101A" /></Field><Field label="Crew"><input value={crew} onChange={(e) => setCrew(e.target.value)} placeholder="Names / roles" /></Field>
      <div className="row items-end"><Btn tip="Build the document from templates + AI hazards" className="btn-primary" onClick={gen} disabled={busy || job.length < 3}>{busy ? "Generating…" : "Generate document"}</Btn></div></div>
    {err && <p role="alert" style={{ color: "var(--danger)" }}>{err}</p>}
    {doc && <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} data-testid="safety-doc" className="rounded-3xl p-4" style={{ background: "var(--bg2)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}><div><h3 className="neon m-0">{doc.title}</h3><p className="m-0 muted text-xs">{doc.ref} · {model === "template" ? "template only (no AI key)" : `AI: ${model}`}</p></div>
        <div className="row"><Btn tip="Download as PDF" onClick={() => toPdf(doc)}>⬇ PDF</Btn><Btn tip="Download as Word document" onClick={() => toDocx(doc)}>⬇ DOCX</Btn><Btn tip="Download as image" onClick={() => toPng(doc)}>⬇ PNG</Btn><Btn tip="Print / save via browser" onClick={() => window.print()}>🖨 Print</Btn></div></div>
      <dl className="grid grid-cols-2 gap-x-4 text-sm md:grid-cols-4">{doc.meta.map(([k, v]) => <div key={k}><dt className="muted text-xs">{k}</dt><dd className="m-0">{v}</dd></div>)}</dl>
      {doc.sections.map((s) => <section key={s.heading}><h4 className="mb-1">{s.heading}</h4>{s.bullets && <ul className="m-0 pl-5 text-sm">{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
        {s.table && <div style={{ overflowX: "auto" }}><table className="text-xs"><thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}</section>)}
      <p className="text-xs muted">Sign-off: {doc.signoffs.join(" · ")} — Standards: {doc.standards.join("; ")}</p></motion.article>}
  </Card>;
}
const deviceId = () => { let d = localStorage.getItem("fixline.device"); if (!d) { d = crypto.randomUUID(); localStorage.setItem("fixline.device", d); } return d; };
type Card_ = { name: string; blood: string; allergies: string; meds: string; contact: string; site: string; muster: string };
/** Emergency card stored on-device (works offline). */
export function EmergencyCard() {
  const [c, setC] = useState<Card_>({ name: "", blood: "", allergies: "", meds: "", contact: "", site: "", muster: "" }); const [edit, setEdit] = useState(false);
  const [sync, setSync] = useState("");
  useEffect(() => { try { const s = localStorage.getItem("fixline.ecard"); if (s) setC(JSON.parse(s)); else setEdit(true); } catch { /* ignore */ }
    fetch(`/api/emergency?device=${deviceId()}`).then((r) => r.json()).then((j) => { if (j.card) { setC(j.card); setEdit(false); localStorage.setItem("fixline.ecard", JSON.stringify(j.card)); setSync("Synced from database"); } }).catch(() => setSync("Offline — using device copy")); }, []);
  const keep = async () => { localStorage.setItem("fixline.ecard", JSON.stringify(c)); setEdit(false);
    try { const r = await fetch(`/api/emergency?device=${deviceId()}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(c) }); const j = await r.json(); setSync(j.ok ? `Saved to database (${j.owner})` : "Saved on device only"); } catch { setSync("Saved on device only (offline)"); } };

  const F = (k: keyof Card_, l: string) => <Field key={k} label={l}><input value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} /></Field>;
  return <Card title="Emergency card" sub={sync || "Saved to your account (or this device for guests) · cached offline"}>
    {edit ? <div className="grid grid-cols-2 gap-3">{F("name", "Name")}{F("blood", "Blood group")}{F("allergies", "Allergies")}{F("meds", "Medication")}{F("contact", "Emergency contact")}{F("site", "Site emergency no.")}{F("muster", "Muster point")}<div className="row items-end"><Btn tip="Keep on this device" className="btn-primary" onClick={keep}>Save card</Btn></div></div>
      : <div className="rounded-3xl p-4" style={{ border: "2px solid var(--danger)" }}><b>{c.name || "—"}</b> · Blood {c.blood || "?"}<p className="m-0 text-sm">Allergies: {c.allergies || "none listed"} · Meds: {c.meds || "none"}</p><p className="m-0 text-sm">Muster: {c.muster || "?"}</p>
        <div className="row mt-2">{c.contact && <a className="btn btn-danger" href={`tel:${c.contact.replace(/[^\d+]/g, "")}`}>Call contact</a>}{c.site && <a className="btn btn-danger" href={`tel:${c.site.replace(/[^\d+]/g, "")}`}>Call site</a>}<Btn tip="Change the card" onClick={() => setEdit(true)}>Edit card</Btn></div></div>}
  </Card>;
}
export function HomeToggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return <NeonCheck checked={on} onChange={(v) => { set(v); savePrefs({ homeMode: v }); }} label="Home safety mode (gas, electrical, fire, first aid at home)" tip="Switch hazards and documents to a home context" />;
}
