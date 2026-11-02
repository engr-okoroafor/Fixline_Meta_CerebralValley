import { NextResponse } from "next/server";
import { live } from "@/lib/ai/meta-agent";
import { nvLive, NV_MODEL } from "@/lib/ai/nvidia-engine";
export const runtime = "nodejs";
export function GET() { return NextResponse.json({ meta: live(), metaModels: ["muse-spark-1.3", "sam-3.1", "muse-voice-transcribe", "seamless-m4t"], nvidia: nvLive(), nvidiaModel: NV_MODEL }); }
