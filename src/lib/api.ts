"use client";
export async function callAi(body: unknown) {
  const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error ?? r.statusText); return j;
}
