import "./globals.css"; import type { Metadata } from "next"; import Shell from "@/components/Shell"; import type { Viewport } from "next";
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05070f" };
export const metadata: Metadata = {
  title: "FixLine — Hands-free repair & quality agent on Ray-Ban Meta glasses | SAM 3.1 + Muse Spark",
  description: "FixLine puts SAM 3.1 perception and Muse Spark 1.3 reasoning on Ray-Ban Meta glasses: camera-confirmed guided repair, LOTO enforcement, multilingual voice (English, Pidgin, Yorùbá, Igbo, Hausa) and line QA shift reports. Push the Frontier — Meta Global AI Developer Hackathon 2026.",
  keywords: ["FixLine","Ray-Ban Meta","SAM 3.1","Muse Spark","Push the Frontier","industrial AI","LOTO","predictive maintenance","Meta hackathon"],
  openGraph: { title: "FixLine — AI that sees the machine and won't let you skip a step", description: "SAM 3.1 + Muse Spark 1.3 on Ray-Ban Meta glasses for factory floors.", type: "website" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body><Shell>{children}</Shell></body></html>;
}
