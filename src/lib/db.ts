import "server-only";
import * as schema from "./schema";
const DDL = `
create table if not exists "user"(id text primary key,name text not null,email text not null unique,email_verified boolean not null default false,image text,role text default 'operator',created_at timestamp not null default now(),updated_at timestamp not null default now());
create table if not exists session(id text primary key,expires_at timestamp not null,token text not null unique,created_at timestamp not null default now(),updated_at timestamp not null default now(),ip_address text,user_agent text,user_id text not null references "user"(id) on delete cascade);
create table if not exists account(id text primary key,account_id text not null,provider_id text not null,user_id text not null references "user"(id) on delete cascade,access_token text,refresh_token text,id_token text,access_token_expires_at timestamp,refresh_token_expires_at timestamp,scope text,password text,created_at timestamp not null default now(),updated_at timestamp not null default now());
create table if not exists verification(id text primary key,identifier text not null,value text not null,expires_at timestamp not null,created_at timestamp default now(),updated_at timestamp default now());
create table if not exists incident(id integer generated always as identity primary key,user_id text,kind text not null,severity text not null,detail jsonb,created_at timestamp not null default now());
create table if not exists usage(id integer generated always as identity primary key,user_id text,action text not null,mock boolean not null default true,created_at timestamp not null default now());
create table if not exists agent_trace(id integer generated always as identity primary key,user_id text,goal text not null,steps jsonb,created_at timestamp not null default now());
create table if not exists mem_session(id text primary key,owner text not null,title text,kind text default 'chat',created_at timestamp not null default now(),updated_at timestamp not null default now());
create table if not exists mem_message(id integer generated always as identity primary key,session_id text not null,role text not null,content text not null,created_at timestamp not null default now());
create table if not exists mem_fact(id integer generated always as identity primary key,owner text not null,kind text not null default 'fact',content text not null,source text,created_at timestamp not null default now());
create table if not exists mem_doc(id integer generated always as identity primary key,owner text not null,session_id text,name text not null,mime text,chunk integer not null default 0,content text not null,created_at timestamp not null default now());
create table if not exists audit_log(id integer generated always as identity primary key,user_id text,action text not null,detail jsonb,created_at timestamp not null default now());
create table if not exists app_setting(key text primary key,value jsonb not null,updated_by text,updated_at timestamp not null default now());`;
async function make() {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pg = await import("pg");
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(DDL);
    return drizzle(pool, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  let client = new PGlite(process.env.VERCEL ? undefined : process.env.PGLITE_DIR ?? "./.pglite");
  try { await client.exec(DDL); }
  catch (e) { console.error("PGlite data dir unusable, falling back to in-memory DB:", (e as Error).message); client = new PGlite(); await client.exec(DDL); }
  return drizzle(client, { schema });
}
type DB = Awaited<ReturnType<typeof make>>;
const g = globalThis as unknown as { __db?: Promise<DB> };
export const getDb = () => (g.__db ??= make());
export { schema };
