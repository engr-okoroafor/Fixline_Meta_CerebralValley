"use client";
import { paintGantt, type PaintSpec } from "@/lib/gantt-paint";
function save(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
/** A3 landscape bitmap used for both the photo download and the PDF page. */
export async function renderGanttCanvas(spec: PaintSpec) {
  const c = document.createElement("canvas"); c.width = 2480; c.height = 1754;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable");
  paintGantt(ctx, c.width, c.height, spec);
  return c;
}
export async function downloadGanttPhoto(spec: PaintSpec, name: string) {
  const c = await renderGanttCanvas(spec);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not encode the photo");
  save(blob, `${name}.png`);
}
export async function downloadGanttPdf(spec: PaintSpec, name: string) {
  const c = await renderGanttCanvas(spec);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 420, 297);
  save(pdf.output("blob"), `${name}-A3.pdf`);
}
