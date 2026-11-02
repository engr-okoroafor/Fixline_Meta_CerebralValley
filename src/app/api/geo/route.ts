import { NextResponse } from "next/server";
import { COUNTRY_LOCALE, COUNTRY_REGION, DEFAULT_LOCALE } from "@/lib/i18n";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
/** First-visit language + jurisdiction suggestion from the Vercel edge IP-geo header. Unknown → en-US / US. */
export function GET(req: Request) {
  const c = (req.headers.get("x-vercel-ip-country") ?? new URL(req.url).searchParams.get("country") ?? "").toUpperCase().slice(0, 2);
  return NextResponse.json({ country: c || null, locale: COUNTRY_LOCALE[c] ?? DEFAULT_LOCALE, region: COUNTRY_REGION[c] ?? "US" }, { headers: { "cache-control": "private, no-store" } });
}
