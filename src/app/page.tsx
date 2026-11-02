import { currentUser } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
export const dynamic = "force-dynamic";
export default async function Home() {
  const u = await currentUser().catch(() => null); // public demo; admin stays gated
  return <Dashboard user={u ? { name: u.name, role: u.role } : { name: "guest", role: "guest" }} />;
}
