import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AdminClient from "@/components/AdminClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin console · FixLine Guardian" };
export default async function Admin() { const u = await currentUser().catch(() => null); if (!u) redirect("/login?next=/admin"); if (u.role !== "admin") redirect("/admin/demo"); return <AdminClient />; }
