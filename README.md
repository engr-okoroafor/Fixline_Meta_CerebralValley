This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Dual-API architecture (Meta primary, NVIDIA fallback)
- **Meta (primary, latency-critical):** `muse-spark-1.3` via `https://api.meta.ai/v1/chat/completions` (with `reasoning_effort: "low"`, ~1–1.5 s) for voice, Ask AI, grounded safety, SCADA diagnosis, repair steps, QA reports and translation. `sam-3.1` segmentation via **`/v1/responses`** (verified; returns `<|box;x1;y1;x2;y2;w;h|>` tokens parsed into overlay boxes, ~0.5 s). Router: `src/lib/ai/router.ts`.
- **NVIDIA (fallback + heavy async):** `nemotron-3.5-super-vl-120b-a12b` is used only when Meta has no key, errors or times out, and for queued jobs (`/api/jobs`).
- **Catalog (last resort):** hazard catalog / equipment catalog answers; harness reports `recovered: true`.
- Keys are server-only: set `MODEL_API_KEY` and `NVIDIA_API_KEY` in Vercel → Settings → Environment Variables (Sensitive), locally in `.env.local`.

## New in this release
Collapsible sidebar (persisted), Settings (provider status), Voice & Vision (hands-free loop, live camera boxes every N s), Supervisor harness (Repair/Safety/Scada/Translator agents, memory, retry/backoff, traces in admin), `/glasses` HUD (Open-Meteo weather by Vercel IP geo, Lagos default), `/data/equipment` catalog + MCP JSON-RPC server at `/api/mcp`, Engineering calculators (IEC 60364-5-52 ampacity, ASME B36.10M / B16.5) that always cite their table, full language names with flags + auto-detect.

## Next-gen upgrade (Oct 2026)
- **Language & voice**: en-US default, header language switcher (14 UI locales, RTL for Arabic), voice **off** by default; floating Voice dock runs a talk → answer → speak loop in the active language with auto-detect for typed/spoken input.
- **Model attribution**: every AI answer shows a badge (Meta `muse-spark` primary → NVIDIA fallback, or "offline" mock).
- **Motion & onboarding**: Framer Motion page transitions, animated home insights, per-page skippable walkthroughs (stored in `localStorage`, replay from Settings).
- **Capture & uploads**: neon checkboxes, camera photo/video buttons, drag-drop upload zones. Repair accepts `.txt .md .pdf .docx .png .jpg` (validated client-side, re-validated server-side incl. magic bytes).
- **Engineering agent**: type or speak ("show vibration trend for P-101 at 7.4 mm/s", "size cable for 60 A derating 0.8") to add charts/KPIs/photos; questions go to the AI.
- **Safety**: high-visibility Safety Documents hero; Fire guidance with class icons, extinguisher suitability chart and P.A.S.S. diagram.
- **Shaft laser alignment panel** (Tuning): neon top/side views, H/V angularity (mm/100mm) & offset (mm) with ✓/✕ vs speed-based tolerance, foot shim/move table and AI deep-dive.
- **Ask AI** deep-link chips, **/xr** spatial labels, measurement callouts, keep-out zone, step progress and hints.
- **Standards region** selector (US / Nigeria / UK / EU / Global) biases AI citations.
- **Projects**: PMP/PRINCE2 phases, Gantt, calendar, costing (USD/NGN), AI project memory, 3D/XR layout entry.
- **Admin**: multi-vendor list, Paystack (NGN) / Stripe (USD) checkout **stubs** (`/api/billing`), secure MCP plant-connection settings (HTTPS-only, read-only default, write allowlist + human approval).
- **CI**: `.github/workflows/ci.yml` runs lint, typecheck, tests, build. See `.env.example` for new variables; never commit `.env.local`.

## What's new (2026-10-31)
- **Projects:** one-line brief → AI-built PMP/PRINCE2 plan, dated Gantt, drag-reorder, % complete with colour, USD/NGN/EUR/GBP/SAR/AED and more, stage deliverables to branded PDF/DOCX.
- **Global:** IP-geo language, whole-page translation, Middle East + Africa jurisdictions.
- **SCADA:** MQTT / OPC UA / Modbus / MCP status, HMI upload, XR link, operator approval.
- **Safety:** documents first, 16 document types on current standard editions.
See `CHANGELOG.md`.

## Admin console
- `/admin`: the first registered user, or anyone listed in `ADMIN_EMAILS`, is an admin. Covers users and roles, disable/enable, session history and usage-time analytics, production app settings (AI Meta primary / NVIDIA fallback, feature flags, default jurisdiction US, language en-US, i18n), the safety-document and admin audit log, SCADA/MCP/payment status (Paystack NGN, Stripe USD, KOMOJU JPY), vendors, the machine catalog, and demo vs live emergency cards.
- `/admin/demo`: a read-only demo for judges with masked emails and owners. Set `ADMIN_DEMO=off` to disable it.
- APIs: `GET/POST /api/admin` (`?demo=1` for read-only), `/api/catalog`, `/api/track`, `/api/emergency`.
