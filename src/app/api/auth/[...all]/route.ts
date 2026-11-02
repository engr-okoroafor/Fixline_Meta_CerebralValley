import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { appSettings } from "@/lib/settings";
export const runtime = "nodejs";
const h = async (req: Request) => {
  // Admin console → Feature flags → "signups" can close new registrations in production.
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/sign-up/email") && !(await appSettings()).flags.signups) return Response.json({ message: "Sign-ups are currently closed by the administrator." }, { status: 403 });
  return (await getAuth()).handler(req);
};
export const { GET, POST } = toNextJsHandler(h);
