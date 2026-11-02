import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
export type AppSettings = {
  ai: { primary: "meta" | "nvidia"; fallback: "nvidia" | "meta" | "none"; timeoutMs: number; temperature: number };
  flags: Record<"voice" | "xr" | "glasses" | "scada" | "projects" | "billing" | "translate" | "mcpWrites" | "signups", boolean>;
  defaults: { region: string; lang: string; units: "imperial" | "metric" };
  i18n: { enabled: string[]; autoTranslate: boolean };
};
export const DEFAULT_SETTINGS: AppSettings = {
  ai: { primary: "meta", fallback: "nvidia", timeoutMs: 20000, temperature: 0.2 },
  flags: { voice: true, xr: true, glasses: true, scada: true, projects: true, billing: true, translate: true, mcpWrites: false, signups: true },
  defaults: { region: "US", lang: "en-US", units: "imperial" },
  i18n: { enabled: ["en-US", "es", "fr", "pt", "de", "ar", "zh", "hi", "ja", "yo", "ig", "ha"], autoTranslate: true },
};
const g = globalThis as unknown as { __set?: Map<string, { v: unknown; t: number }> };
const cache = (g.__set ??= new Map());
export async function getSetting<T>(key: string, def: T): Promise<T> {
  const c = cache.get(key); if (c && Date.now() - c.t < 15_000) return c.v as T;
  const db = await getDb(); const r = await db.select().from(schema.appSetting).where(eq(schema.appSetting.key, key)).limit(1);
  const v = (r[0]?.value as T) ?? def; cache.set(key, { v, t: Date.now() }); return v;
}
export async function setSetting(key: string, value: unknown, by?: string) {
  const db = await getDb();
  await db.insert(schema.appSetting).values({ key, value, updatedBy: by }).onConflictDoUpdate({ target: schema.appSetting.key, set: { value, updatedBy: by, updatedAt: new Date() } });
  cache.set(key, { v: value, t: Date.now() });
}
export const appSettings = async () => { const s = await getSetting<Partial<AppSettings>>("app", {}); return { ...DEFAULT_SETTINGS, ...s, ai: { ...DEFAULT_SETTINGS.ai, ...s.ai }, flags: { ...DEFAULT_SETTINGS.flags, ...s.flags }, defaults: { ...DEFAULT_SETTINGS.defaults, ...s.defaults }, i18n: { ...DEFAULT_SETTINGS.i18n, ...s.i18n } } as AppSettings; };
export const isDisabled = async (id: string) => (await getSetting<string[]>("disabled_users", [])).includes(id);
