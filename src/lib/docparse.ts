import "server-only";
// Factory document parser: PDF, DOCX, XLSX, CSV, TXT/MD/JSON/LOG. Images are routed to vision by the caller.
import { unzipSync, strFromU8 } from "fflate";
const xmlText = (x: string) => x.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
export function docxText(buf: Uint8Array) { const z = unzipSync(buf, { filter: (f) => f.name === "word/document.xml" }); const x = z["word/document.xml"]; if (!x) throw new Error("not a DOCX"); return xmlText(strFromU8(x)).replace(/\n{3,}/g, "\n\n").trim(); }
export function xlsxText(buf: Uint8Array) {
  const z = unzipSync(buf, { filter: (f) => f.name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name) });
  const ss = z["xl/sharedStrings.xml"] ? [...strFromU8(z["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1])) : [];
  return Object.keys(z).filter((k) => k.includes("worksheets")).sort().map((k) => { const rows = [...strFromU8(z[k]).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].slice(0, 2000).map((r) => [...r[1].matchAll(/<c([^>]*)>(?:<f>[\s\S]*?<\/f>)?(?:<v>([\s\S]*?)<\/v>|<is>([\s\S]*?)<\/is>)?<\/c>/g)].map((c) => /t="s"/.test(c[1]) ? ss[+c[2]] ?? "" : c[3] ? xmlText(c[3]) : c[2] ?? "").join(",")); return `# ${k.split("/").pop()}\n${rows.join("\n")}`; }).join("\n\n");
}
export async function pdfText(buf: Uint8Array) { const { extractText, getDocumentProxy } = await import("unpdf"); const pdf = await getDocumentProxy(buf); const { text } = await extractText(pdf, { mergePages: true }); return String(text); }
export type Parsed = { name: string; kind: "pdf" | "docx" | "xlsx" | "csv" | "text" | "image"; text: string; pages?: number; image?: string };
export async function parseFile(name: string, mime: string, buf: Uint8Array): Promise<Parsed> {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (/^image\//.test(mime) || ["png", "jpg", "jpeg", "webp"].includes(ext)) return { name, kind: "image", text: "", image: `data:${mime || "image/jpeg"};base64,${Buffer.from(buf).toString("base64")}` };
  if (ext === "pdf" || mime === "application/pdf") return { name, kind: "pdf", text: await pdfText(buf) };
  if (ext === "docx") return { name, kind: "docx", text: docxText(buf) };
  if (ext === "xlsx") return { name, kind: "xlsx", text: xlsxText(buf) };
  if (ext === "csv") return { name, kind: "csv", text: new TextDecoder().decode(buf) };
  if (["txt", "md", "json", "log", "xml", "ini", "cfg"].includes(ext) || mime.startsWith("text/")) return { name, kind: "text", text: new TextDecoder().decode(buf) };
  throw new Error(`Unsupported file type: .${ext}. Use PDF, DOCX, XLSX, CSV, TXT or an image.`);
}
/** Cheap structured facts from text (no AI): readings, tags, model numbers, standards, torque values. */
export function quickFacts(t: string) {
  const uniq = (a: string[]) => [...new Set(a)].slice(0, 15);
  return {
    words: t.split(/\s+/).filter(Boolean).length,
    tags: uniq(t.match(/\b[A-Z]{1,4}-?\d{2,5}[A-Z]?\b/g) ?? []),
    standards: uniq(t.match(/\b(?:ISO|IEC|API|ASME|NFPA|IEEE|OSHA|ANSI|AWS|NACE|EN|BS)\s?[A-Z]?\d[\d.\-/]*\b/g) ?? []),
    readings: uniq(t.match(/\b\d+(?:\.\d+)?\s?(?:bar|barg|psi|kPa|MPa|°C|degC|mm\/s|rpm|kW|A|V|kV|MΩ|Nm|N·m|%|m3\/h|l\/min)\b/g) ?? []),
    warnings: uniq((t.match(/[^.\n]*(?:WARNING|DANGER|CAUTION|must not|never)[^.\n]*/gi) ?? []).map((s) => s.trim().slice(0, 160))),
  };
}
