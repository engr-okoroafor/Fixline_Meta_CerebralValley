import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey, detectInjection, validateDoc, sniffOk } from "@/lib/security";
import { parseFile } from "@/lib/docparse";
import { addDoc } from "@/lib/memory";
import { copilot } from "@/lib/ai/copilot";
export const runtime = "nodejs"; export const maxDuration = 60;
const MAX = 15_000_000;
/** Multipart upload: files[] (PDF, DOCX, XLSX, CSV, TXT, images) + question + session + machine → parsed, stored in long-term memory, analysed. */
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`docs:${who}`, u ? 20 : 8)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const fd = await req.formData().catch(() => null); if (!fd) return NextResponse.json({ error: "multipart form expected" }, { status: 400 });
  const files = fd.getAll("files").filter((f): f is File => typeof f !== "string").slice(0, 6);
  const question = String(fd.get("question") ?? "Summarise these documents and give the key maintenance insights.").slice(0, 1500);
  const session = String(fd.get("session") ?? crypto.randomUUID()).slice(0, 64); const machine = String(fd.get("machine") ?? "") || undefined; const lang = String(fd.get("lang") ?? "") || undefined;
  if (detectInjection(question)) return NextResponse.json({ error: "input rejected by prompt-injection filter" }, { status: 422 });
  if (files.reduce((a, f) => a + f.size, 0) > MAX) return NextResponse.json({ error: "files too large (15 MB total)" }, { status: 413 });
  const bad = files.map((f) => ({ f, e: validateDoc(f.name, f.type, f.size) })).filter((x) => x.e);
  if (bad.length) return NextResponse.json({ error: bad.map((x) => `${x.f.name.slice(0, 60)}: ${x.e}`).join("; ") }, { status: 415 });
  const parsed = []; const errors: string[] = [];
  for (const f of files) { try { const buf = new Uint8Array(await f.arrayBuffer()); if (!sniffOk(f.name, buf)) throw new Error("content does not match file type"); parsed.push(await parseFile(f.name.slice(0, 120), f.type, buf)); } catch (e) { errors.push(`${f.name}: ${(e as Error).message}`); } }
  const docs = parsed.filter((p) => p.kind !== "image").map((p) => ({ name: p.name, text: p.text.slice(0, 200_000) }));
  const owner = `${who}`;
  const chunks = await Promise.all(docs.map((d) => addDoc(owner, session, d.name, "text", d.text).catch(() => 0)));
  const images = parsed.filter((p) => p.kind === "image" && p.image!.length < 4_000_000).map((p) => p.image!);
  const region = String(fd.get("region") ?? "") || undefined;
  const out = await copilot({ owner, session, question, docs, images, machine, lang, region, prefer: fd.get("prefer") === "nvidia" ? "nvidia" : "meta" });
  return NextResponse.json({ ...out, session, files: parsed.map((p, i) => ({ name: p.name, kind: p.kind, chars: p.text.length, chunks: chunks[i] ?? 0 })), errors });
}
