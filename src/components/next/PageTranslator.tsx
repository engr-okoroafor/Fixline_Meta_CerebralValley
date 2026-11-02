"use client";
import { useEffect } from "react";
import { prefs, savePrefs } from "../sections/shared";
import { useLocale } from "./useLocale";
/** Defaults are USA: language en-US and jurisdiction US. Geo lookup is advisory only and never changes them (user picks in the header). */
export function GeoLocale() {
  useEffect(() => { const p = prefs(); if (p.geoDone) return; savePrefs({ geoDone: true, ...(p.langSet ? {} : { lang: "en-US", voiceLang: "en-US" }), ...(p.regionSet ? {} : { region: "US" }) }); }, []);
  return null;
}
const orig = new WeakMap<Text, string>(); const origAttr = new WeakMap<Element, Record<string, string>>();
const SKIP = "script,style,code,pre,textarea,svg,[data-notranslate],.notranslate"; const ATTRS = ["placeholder", "aria-label", "title"];
const ok = (s: string) => s.length > 1 && s.length < 400 && /\p{L}{2}/u.test(s);
/** Whole-page translator: when the language is not English, EVERY visible string (text nodes, option labels, placeholders, aria-labels, titles, tooltips in portals) is translated via /api/translate in parallel batches and cached; re-runs on DOM changes. Switching back restores originals. */
export function PageTranslator() {
  const loc = useLocale(); const lang = loc.split("-")[0];
  useEffect(() => {
    const root = document.body; const en = lang === "en";
    const key = `fixline.tr.${loc}`; let mem: Record<string, string> = {}; try { mem = JSON.parse(localStorage.getItem(key) ?? "{}"); } catch {}
    const failed = new Map<string, number>();
    let busy = false, again = false, timer: ReturnType<typeof setTimeout> | undefined, dead = false;
    const nodes = () => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const out: Text[] = []; let n: Node | null;
      while ((n = w.nextNode())) { const el = (n as Text).parentElement; if (!el || el.closest(SKIP)) continue; out.push(n as Text); } return out; };
    const elems = () => Array.from(root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(","))).filter((e) => !e.closest(".notranslate,[data-notranslate]"));
    async function translate(need: string[]) {
      const chunks: string[][] = []; for (let i = 0; i < need.length; i += 40) chunks.push(need.slice(i, i + 40));
      for (let i = 0; i < chunks.length && !dead; i += 4) await Promise.all(chunks.slice(i, i + 4).map(async (c) => {
        const r = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: loc, texts: c }) }).then((x) => x.json()).catch(() => null);
        c.forEach((src, j) => { const v = r?.out?.[j]; if (v && v !== src) mem[src] = v; else failed.set(src, (failed.get(src) ?? 0) + 1); });
      }));
    }
    async function run() {
      if (dead) return; if (busy) { again = true; return; } busy = true; obs.disconnect();
      try {
        const list = nodes(); const els = elems();
        for (const n of list) { if (!orig.has(n)) { const v = n.nodeValue ?? ""; if (!ok(v.trim())) continue; orig.set(n, v); } }
        for (const e of els) { const o = origAttr.get(e) ?? {}; for (const a of ATTRS) { const v = e.getAttribute(a); if (v && !(a in o) && ok(v.trim())) o[a] = v; } origAttr.set(e, o); }
        if (en) { for (const n of list) { const o = orig.get(n); if (o !== undefined && n.nodeValue !== o) n.nodeValue = o; } for (const e of els) { const o = origAttr.get(e); if (o) for (const [a, v] of Object.entries(o)) e.setAttribute(a, v); } return; }
        const srcs = [...list.map((n) => orig.get(n)?.trim()), ...els.flatMap((e) => Object.values(origAttr.get(e) ?? {}).map((v) => v.trim()))];
        const need = [...new Set(srcs.filter((s): s is string => !!s && !(s in mem) && (failed.get(s) ?? 0) < 2))];
        if (need.length) { await translate(need); try { localStorage.setItem(key, JSON.stringify(mem)); } catch {} }
        for (const n of nodes()) { const o = orig.get(n); const tr = o && mem[o.trim()]; if (tr && n.nodeValue?.trim() !== tr) n.nodeValue = o!.replace(o!.trim(), tr); }
        for (const e of elems()) { const o = origAttr.get(e); if (o) for (const [a, v] of Object.entries(o)) { const tr = mem[v.trim()]; if (tr && e.getAttribute(a) !== tr) e.setAttribute(a, tr); } }
        document.documentElement.lang = loc; document.documentElement.dir = ["ar", "fa", "he", "ur"].includes(lang) ? "rtl" : "ltr";
      } finally { busy = false; if (!dead) { obs.observe(root, { childList: true, subtree: true, characterData: true }); if (again) { again = false; clearTimeout(timer); timer = setTimeout(run, 200); } } }
    }
    const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 350); });
    run();
    return () => { dead = true; obs.disconnect(); clearTimeout(timer); };
  }, [loc, lang]);
  return null;
}
