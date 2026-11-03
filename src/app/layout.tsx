import type { Metadata, Viewport } from "next";
import "./globals.css";
const T = "FixLine — a hands-free AI repair, safety, quality & project management agent for plant workers";
const D = "FixLine is a hands-free AI repair, safety, quality and project management agent for plant workers. Muse Spark 1.3, SAM 3.1, voice and SeamlessM4T: guided repair, alignment, safety documents, and PMP Gantt with charter, WBS, risk register, status report and A3. Push the Frontier · Live demo, no login.";
const U = "https://fixline-meta-cerebralvalley.vercel.app";
export const metadata: Metadata = { metadataBase: new URL(U), title: T, description: D, applicationName: "FixLine", keywords: ["FixLine", "Ray-Ban Meta", "Meta AI", "Muse Spark 1.3", "SAM 3.1", "SeamlessM4T", "Mock Device Kit", "manufacturing AI", "predictive maintenance", "LOTO", "quality inspection", "Meta Global AI Hackathon 2026", "Push the Frontier"], openGraph: { title: T, description: D, url: U, siteName: "FixLine", type: "website" }, twitter: { card: "summary_large_image", title: T, description: D }, alternates: { canonical: U } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05070f" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
