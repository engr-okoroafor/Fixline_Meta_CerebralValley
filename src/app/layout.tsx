import type { Metadata, Viewport } from "next";
import "./globals.css";
const T = "FixLine — hands-free repair, safety, quality and projects for industrial field crews";
const D = "FixLine is a hands-free AI agent for oil and gas, power, manufacturing, mining, water, food and beverage, pharma, chemicals, pulp and paper, ports, data centers, and plant maintenance. Muse Spark 1.3, SAM 3.1, Muse Voice and SeamlessM4T: perceive, reason, confirm, enforce. Push the Frontier · Live demo, no login.";
const U = "https://fixline-meta-cerebralvalley.vercel.app";
export const metadata: Metadata = { metadataBase: new URL(U), title: T, description: D, applicationName: "FixLine", keywords: ["FixLine", "Ray-Ban Meta", "Meta AI", "Muse Spark 1.3", "SAM 3.1", "SeamlessM4T", "Mock Device Kit", "manufacturing AI", "predictive maintenance", "LOTO", "quality inspection", "Meta Global AI Hackathon 2026", "Push the Frontier"], openGraph: { title: T, description: D, url: U, siteName: "FixLine", type: "website" }, twitter: { card: "summary_large_image", title: T, description: D }, alternates: { canonical: U } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05070f" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
