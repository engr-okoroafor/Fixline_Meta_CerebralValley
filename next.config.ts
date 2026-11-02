import type { NextConfig } from "next";
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'", `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`, "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "media-src 'self' blob:", "connect-src 'self'", "font-src 'self' data:", "worker-src 'self' blob:",
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join("; ");
const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), xr-spatial-tracking=(self), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ] }];
  },
};
export default config;
