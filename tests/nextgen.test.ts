import { describe, it, expect } from "vitest";
import { tolFor, corrections } from "@/lib/alignment";
import { t, detectLang, DEFAULT_LOCALE, isRtl } from "@/lib/i18n";
import { regionOf, regionPrompt } from "@/lib/regions";
import { validateDoc, sniffOk } from "@/lib/security";
describe("shaft alignment", () => {
  it("tightens tolerance with speed", () => { expect(tolFor(3000).off).toBeLessThan(tolFor(900).off); });
  it("reference reading is out of tolerance horizontally, vertical angularity ok", () => { const tl = tolFor(1500); expect(0.42 > tl.ang && 0.02 <= tl.ang).toBe(true); });
  it("computes foot corrections opposite to the error", () => { const c = corrections({ hAng: 0.42, hOff: 0.32, vAng: 0.02, vOff: -0.56 }, 100, 200); expect(c.vFront).toBeCloseTo(0.54); expect(c.hRear).toBeCloseTo(-1.58); });
});
describe("i18n & region", () => {
  it("defaults to en-US and falls back", () => { expect(DEFAULT_LOCALE).toBe("en-US"); expect(t("fr", "repair")).toBe("Réparation"); expect(t("ig", "projects")).toBe("Projects"); });
  it("detects scripts and RTL", () => { expect(detectLang("مرحبا كيف حالك")).toBe("ar"); expect(isRtl("ar")).toBe(true); expect(isRtl("en-US")).toBe(false); });
  it("region prompt names NG bodies", () => { expect(regionOf("NG").id).toBe("NG"); expect(regionPrompt("NG")).toMatch(/NEMSA/); expect(regionOf("??").id).toBe("US"); });
});
describe("upload validation", () => {
  it("rejects disallowed extensions", () => { expect(validateDoc("evil.exe", "application/octet-stream", 10)).toBeTruthy(); });
  it("checks PDF magic bytes", () => { expect(sniffOk("a.pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true); expect(sniffOk("a.pdf", new TextEncoder().encode("MZ\x90"))).toBe(false); });
});
