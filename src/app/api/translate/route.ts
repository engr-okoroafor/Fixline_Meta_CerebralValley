import { reason } from "@/lib/ai";
const DEMO: Record<string, string> = {
  "Abeg, this pump dey leak for seal.": "Please, this pump is leaking at the seal.",
  "Ṣé kí n pa breaker náà?": "Should I switch off the breaker?",
};
export async function POST(req: Request) {
  const { text = "", to = "en" } = await req.json().catch(() => ({}));
  const r = await reason([{ role: "system", content: `Translate to ${to}. Output only the translation; keep technical terms.` }, { role: "user", content: text }], () => DEMO[text] ?? `[${to}] ${text}`);
  return Response.json(r);
}
