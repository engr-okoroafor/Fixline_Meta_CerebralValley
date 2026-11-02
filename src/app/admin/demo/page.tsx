import { notFound } from "next/navigation";
import AdminClient from "@/components/AdminClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin console (read-only demo) · FixLine Guardian" };
/** Judges' path: same console, live aggregate data, PII masked, all writes disabled. Turn off with ADMIN_DEMO=off. */
export default function AdminDemo() { if (process.env.ADMIN_DEMO === "off") notFound(); return <AdminClient demo />; }
