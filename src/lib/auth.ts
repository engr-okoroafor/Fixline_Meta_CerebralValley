import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, schema } from "./db";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { isDisabled } from "./settings";

const g = globalThis as unknown as { __auth?: Promise<ReturnType<typeof betterAuth>> };
export function getAuth() {
  return (g.__auth ??= getDb().then((db) =>
    betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema }),
      secret: process.env.BETTER_AUTH_SECRET ?? (process.env.NODE_ENV === "production" && !process.env.CI ? undefined : "dev-only-secret-change-me-0123456789abcdef"),
      emailAndPassword: { enabled: true, minPasswordLength: 10 },
      user: { additionalFields: { role: { type: "string", defaultValue: "operator", input: false } } },
      rateLimit: { enabled: true, window: 60, max: 30 },
      advanced: { useSecureCookies: process.env.NODE_ENV === "production" && !process.env.CI && !!process.env.VERCEL },
    }) as unknown as ReturnType<typeof betterAuth>,
  ));
}
export type SessionUser = { id: string; email: string; name: string; role: string };
export async function currentUser(): Promise<SessionUser | null> {
  const auth = await getAuth();
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as unknown as SessionUser;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (await isDisabled(u.id).catch(() => false)) return null;
  let role = u.role ?? "operator";
  if (admins.includes(u.email.toLowerCase())) role = "admin";
  else if (role !== "admin") {
    const db = await getDb();
    const first = await db.select({ id: schema.user.id }).from(schema.user).orderBy(schema.user.createdAt).limit(1);
    if (first[0]?.id === u.id) { role = "admin"; await db.update(schema.user).set({ role }).where(eq(schema.user.id, u.id)); }
  }
  return { ...u, role };
}
