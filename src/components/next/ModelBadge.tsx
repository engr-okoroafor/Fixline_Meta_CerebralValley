"use client";
import { motion } from "framer-motion";
import { Tip } from "../ui";
import { modelInfo } from "@/lib/models";
/** Futuristic model attribution chip shown on every AI answer. */
export function ModelBadge({ model, fallback }: { model?: string; fallback?: boolean }) {
  const m = modelInfo(model, fallback); const c = m.vendor === "Meta" ? "#39FF14" : m.vendor === "NVIDIA" ? "#76b900" : "#9fb3a8";
  return <Tip label={`Answered by ${m.name} (${m.raw}). Routing: Meta AI primary → NVIDIA fallback → offline knowledge base.`}>
    <motion.span data-testid="model-badge" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} className="pill" tabIndex={0}
      style={{ borderColor: c, color: c, background: `color-mix(in oklab, ${c} 12%, transparent)`, boxShadow: `0 0 14px color-mix(in oklab, ${c} 45%, transparent)`, fontFamily: "ui-monospace, monospace", letterSpacing: ".04em" }}>
      <motion.span aria-hidden animate={{ opacity: [1, .3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ width: 8, height: 8, borderRadius: 99, background: c, boxShadow: `0 0 8px ${c}` }} />
      {m.vendor === "Offline" ? "◇" : "◆"} {m.name} <span style={{ opacity: .7 }}>· {m.tier}</span>
    </motion.span></Tip>;
}
