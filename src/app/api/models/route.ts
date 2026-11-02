import { BASE, MODELS } from "@/lib/ai";
/** Judges: shows which Meta models are wired and which are live vs demo on this deployment. */
export async function GET() {
  const live = !!process.env.MODEL_API_KEY;
  return Response.json({ base: BASE, live, models: MODELS, seamless: !!process.env.SEAMLESS_M4T_URL, nvidiaFallback: !!process.env.NVIDIA_API_KEY });
}
