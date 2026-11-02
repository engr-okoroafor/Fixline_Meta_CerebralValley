import { getSetting } from "@/lib/settings";
import type { Equipment } from "@/lib/equipment";
export const runtime = "nodejs";
/** Admin-managed machine types (Admin → Catalog), merged into the in-app machine search. */
export async function GET() { return Response.json({ machines: await getSetting<Equipment[]>("catalog_custom", []), vendors: (await getSetting<{ active: boolean }[]>("vendors", [])).filter((v) => v.active) }); }
