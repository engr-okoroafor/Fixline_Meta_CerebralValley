# Changelog

## 2026-10-31 (evening): Admin console, catalog, safety exports
- **Admin console** (`/admin`, admins only; judges get the read-only, masked `/admin/demo`). Tabs: Overview KPIs and charts; Users (search, roles, disable/enable, which revokes sessions); Sessions & usage time (heartbeat analytics, pie/bar charts, tables); App settings (AI primary Meta / NVIDIA fallback, timeout, temperature, feature flags, defaults US / en-US / imperial, i18n list); Safety & audit log; Integrations (SCADA OPC UA/Modbus/MQTT/MCP, Paystack NGN, Stripe USD, KOMOJU JPY; reports env presence only); Vendors CRUD; Machine catalog CRUD; Demo vs live emergency cards. Settings are stored in the `app_setting` table and every admin action is audit-logged.
- The AI router follows the admin settings. The sign-ups flag blocks email sign-up. Disabled users are signed out.
- Removed the How-to spotlight walkthrough cards. Added one futuristic neon Loader.
- Machine catalog grew by 87 industrial, building and home types, with search and a domain filter. Added an Asset record card (tag, serial, criticality, service dates, standards).
- Safety: the hero styling moved into the "Safety documents in 60 seconds" card. File names follow `TYPE-YYYYMMDD-TAG`. PDF/DOCX exports are branded and use tables. The emergency card is saved in the DB (`/api/emergency`).
- NeonCheck checkboxes are used across the app. The translate rate limit was raised for whole-page translation.

## 2026-10-31 — NextGen UX + Projects
- Language: one narrow language bar; whole-page AI translation (`/api/translate`, cached); IP-geo auto language/jurisdiction (`/api/geo`); RTL for Arabic.
- Jurisdiction control (amber, separate from language) incl. Middle East (SA, AE, QA, KW, OM, IQ, EG) and Africa (NG, GH, AO, DZ, LY).
- Floating glass header, back-to-top/bottom buttons, Framer Motion page transitions, right-side sidebar tooltips, new chat icon.
- Walkthroughs: spotlight ring anchored to the exact target.
- Speech: Web Speech with interim results and clear error messages; server STT used only when configured; mic test in Settings.
- SCADA: MQTT / OPC UA / Modbus / MCP status bar, HMI upload, View in XR, explicit operator approval.
- Safety: documents at top; +10 doc types (cold work, confined space, height, electrical, excavation, lifting, radiography, MOC, toolbox, incident); current standard editions.
- Projects: AI PMP/PRINCE2 plan from a brief (`/api/project-plan`), date-based Gantt, drag-reorder, numeric % + colour, 12 currencies (USD default), stage deliverables to PDF/DOCX with company + contractor logos.
- XR: structured Enter AR flow with back button; smaller neon checkboxes; Projects before Settings.
