"use client";
import { useEffect, useState } from "react";
import { prefs, type Prefs } from "../sections/shared";
import { DEFAULT_LOCALE } from "@/lib/i18n";
/** Reactive prefs (lang, voiceOn, region…) synced via the fixline:prefs event. */
export function usePrefs(): Prefs | null {
  const [p, setP] = useState<Prefs | null>(null);
  useEffect(() => { setP(prefs()); const f = (e: Event) => setP((e as CustomEvent).detail as Prefs); window.addEventListener("fixline:prefs", f); return () => window.removeEventListener("fixline:prefs", f); }, []);
  return p;
}
export function useLocale() { return usePrefs()?.lang ?? DEFAULT_LOCALE; }
