import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "FixLine Guardian", description: "Hands-free mixed-reality industrial & home safety assistant" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05070f" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
