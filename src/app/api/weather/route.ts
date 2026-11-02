import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const h = req.headers; const lat = Number(h.get("x-vercel-ip-latitude") ?? 6.5244), lon = Number(h.get("x-vercel-ip-longitude") ?? 3.3792);
  const city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "Lagos");
  try { const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`, { next: { revalidate: 600 } }); const j = await r.json(); return NextResponse.json({ city, temp: j.current?.temperature_2m, code: j.current?.weather_code }); }
  catch { return NextResponse.json({ city, temp: null }); }
}
