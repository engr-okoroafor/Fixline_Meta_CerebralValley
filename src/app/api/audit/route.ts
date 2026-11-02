import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
export const runtime = "nodejs";
/** The signed-in user's own audit trail (SCADA writes, safety docs, inspections). */
export async function GET() {
  const u = await currentUser().catch(() => null); if (!u) return NextResponse.json({ entries: [], note: "Sign in to see your audit log." });
  const db = await getDb(); const entries = await db.select().from(schema.auditLog).where(eq(schema.auditLog.userId, u.id)).orderBy(desc(schema.auditLog.createdAt)).limit(100);
  return NextResponse.json({ entries });
}
