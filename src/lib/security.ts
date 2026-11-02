import { z } from "zod";
const buckets = new Map<string, { n: number; t: number }>();
export function rateLimit(key: string, max = 20, windowMs = 60_000) {
  const now = Date.now(); const b = buckets.get(key);
  if (!b || now - b.t > windowMs) { buckets.set(key, { n: 1, t: now }); return true; }
  b.n++; return b.n <= max;
}
const INJECTION = [/ignore (all|any|the)? ?(previous|prior|above) (instructions|prompts?)/i, /system prompt/i, /you are now/i, /disregard .*instructions/i, /reveal .*(key|secret|password|prompt)/i, /<\/?(script|iframe)/i, /\bjailbreak\b/i, /act as (an? )?(admin|developer|dan)\b/i];
export function detectInjection(s: string) { return INJECTION.some((r) => r.test(s)); }
export function sanitize(s: string, max = 4000) { return s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").slice(0, max); }
const IMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const imageSchema = z.string().max(4_000_000).regex(IMG, "invalid image").optional();
export const MANUAL_TYPES = ["text/plain", "text/markdown", "application/pdf"];
export function validateUpload(name: string, type: string, size: number) {
  if (size > 5_000_000) return "file too large";
  if (!MANUAL_TYPES.includes(type)) return "unsupported type";
  if (!/^[\w\- .]{1,120}\.(txt|md|pdf)$/i.test(name)) return "bad filename";
  return null;
}
export const aiRequest = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("repair"), part: z.string().min(1).max(200), manual: z.string().max(20000).optional(), history: z.string().max(4000).optional(), step: z.number().int().min(0).max(50).default(0), image: imageSchema }),
  z.object({ mode: z.literal("quality"), image: imageSchema, telemetry: z.object({ temp: z.number().min(-50).max(500), vibration: z.number().min(0).max(100), rpm: z.number().min(0).max(100000) }) }),
  z.object({ mode: z.literal("safety"), hazard: z.string().min(1).max(60), context: z.enum(["industrial", "home"]).default("industrial") }),
  z.object({ mode: z.literal("anything"), question: z.string().min(3).max(1000), image: imageSchema }),
  z.object({ mode: z.literal("ask"), question: z.string().min(3).max(500) }),
  z.object({ mode: z.literal("translate"), text: z.string().min(1).max(2000), source: z.string().regex(/^([a-z]{2,3}(-[A-Z]{2})?|auto)$/), target: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/) }),
]);
export type AiRequest = z.infer<typeof aiRequest>;
export const jobRequest = z.object({ kind: z.enum(["repair-guide", "risk-analysis"]), text: z.string().min(3).max(2000), image: imageSchema });
export function clientKey(req: Request, userId?: string) { return userId ?? `ip:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`; }

/** Repair/Ask document uploads: extension allow-list + MIME + size + safe filename (client and server share this). */
export const DOC_EXT = ["txt", "md", "pdf", "docx", "xlsx", "csv", "png", "jpg", "jpeg", "webp", "json", "log"] as const;
export function validateDoc(name: string, type: string, size: number) {
  if (size <= 0) return "empty file"; if (size > 15_000_000) return "file too large (15 MB max)";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!(DOC_EXT as readonly string[]).includes(ext)) return `unsupported type .${ext}`;
  if (!/^[^\\/:*?"<>|\u0000-\u001f]{1,120}$/.test(name) || name.includes("..")) return "bad filename";
  if (type && /(javascript|x-msdownload|x-sh|html|svg)/i.test(type)) return "blocked MIME type";
  return null;
}
/** Magic-byte sniff so a renamed executable/HTML can't pass as a document. */
export function sniffOk(name: string, b: Uint8Array) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""; const h = (n: number[]) => n.every((x, i) => b[i] === x);
  if (ext === "pdf") return h([0x25, 0x50, 0x44, 0x46]);
  if (["docx", "xlsx"].includes(ext)) return h([0x50, 0x4b, 0x03, 0x04]);
  if (ext === "png") return h([0x89, 0x50, 0x4e, 0x47]);
  if (["jpg", "jpeg"].includes(ext)) return h([0xff, 0xd8, 0xff]);
  if (ext === "webp") return h([0x52, 0x49, 0x46, 0x46]);
  const head = new TextDecoder().decode(b.slice(0, 512)).toLowerCase();
  return !/<script|<html|<iframe|^mz/.test(head);
}
