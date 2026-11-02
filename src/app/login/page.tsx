"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in"); const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password"));
    const r = mode === "up" ? await authClient.signUp.email({ email, password, name: String(f.get("name") || email.split("@")[0]) }) : await authClient.signIn.email({ email, password });
    if (r.error) setErr(r.error.message ?? "failed"); else location.href = "/";
  }
  return <main className="grid min-h-screen place-items-center p-4"><div className="w-full max-w-sm"><form onSubmit={submit} className="glass card w-full max-w-sm">
    <h1 className="neon text-2xl font-bold">FixLine Guardian</h1>
    {mode === "up" && <input name="name" placeholder="Name" aria-label="Name" />}
    <input name="email" type="email" required placeholder="Email" aria-label="Email" />
    <input name="password" type="password" required minLength={10} placeholder="Password (10+ chars)" aria-label="Password" />
    {err && <p role="alert" className="text-red-400 text-sm">{err}</p>}
    <button className="btn w-full" type="submit">{mode === "up" ? "Create account" : "Sign in"}</button>
    <button type="button" className="btn" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}</button>
  </form></div></main>;
}
