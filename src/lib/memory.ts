import "server-only";
// Two-tier memory: short-term = last N messages of a session; long-term = facts + document chunks, retrieved by BM25-style keyword scoring.
import { and, desc, eq, lt } from "drizzle-orm";
import { getDb, schema } from "./db";
import { rank } from "./retrieval";
export async function ensureSession(id: string, owner: string, title = "Session", kind = "chat") {
  const db = await getDb(); const s = await db.select().from(schema.memSession).where(eq(schema.memSession.id, id)).limit(1);
  if (!s.length) await db.insert(schema.memSession).values({ id, owner, title: title.slice(0, 80), kind }); else if (s[0].owner !== owner) throw new Error("session not owned");
}
export async function addMessage(sessionId: string, role: "user" | "assistant", content: string) { const db = await getDb(); await db.insert(schema.memMessage).values({ sessionId, role, content: content.slice(0, 8000) }); }
export async function shortTerm(sessionId: string, n = 8) { const db = await getDb(); const r = await db.select().from(schema.memMessage).where(eq(schema.memMessage.sessionId, sessionId)).orderBy(desc(schema.memMessage.id)).limit(n); return r.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })); }
export async function addFact(owner: string, content: string, kind = "fact", source?: string) { const db = await getDb(); await db.insert(schema.memFact).values({ owner, content: content.slice(0, 2000), kind, source }); }
export async function addDoc(owner: string, sessionId: string, name: string, mime: string, text: string) {
  const db = await getDb(); const chunks = chunk(text); for (let i = 0; i < chunks.length; i++) await db.insert(schema.memDoc).values({ owner, sessionId, name, mime, chunk: i, content: chunks[i] }); return chunks.length;
}
export function chunk(t: string, size = 1200, overlap = 150) { const out: string[] = []; const s = t.replace(/\s+\n/g, "\n").trim(); for (let i = 0; i < s.length && out.length < 200; i += size - overlap) out.push(s.slice(i, i + size)); return out; }
/** Long-term retrieval across all of the owner's facts and docs (cross-session memory). */
export async function longTerm(owner: string, q: string, k = 5) {
  const db = await getDb(); const facts = await db.select().from(schema.memFact).where(eq(schema.memFact.owner, owner)).orderBy(desc(schema.memFact.id)).limit(400);
  const docs = await db.select().from(schema.memDoc).where(eq(schema.memDoc.owner, owner)).orderBy(desc(schema.memDoc.id)).limit(800);
  return rank(q, [...facts.map((f) => ({ text: f.content, src: `memory:${f.kind}` })), ...docs.map((d) => ({ text: d.content, src: `${d.name}#${d.chunk + 1}` }))], k);
}
export async function sessions(owner: string) { const db = await getDb(); return db.select().from(schema.memSession).where(eq(schema.memSession.owner, owner)).orderBy(desc(schema.memSession.createdAt)).limit(50); }
export async function forget(owner: string, days: number) { const db = await getDb(); const cut = new Date(Date.now() - days * 864e5); await db.delete(schema.memFact).where(and(eq(schema.memFact.owner, owner), lt(schema.memFact.createdAt, cut))); await db.delete(schema.memDoc).where(and(eq(schema.memDoc.owner, owner), lt(schema.memDoc.createdAt, cut))); }
export async function memoryContext(owner: string, sessionId: string, q: string) {
  const [st, lt2] = await Promise.all([shortTerm(sessionId).catch(() => []), longTerm(owner, q).catch(() => [])]);
  return { history: st, recalled: lt2, prompt: `<memory>${lt2.map((r) => `[${r.src}] ${r.text}`).join("\n---\n").slice(0, 6000)}</memory>` };
}
