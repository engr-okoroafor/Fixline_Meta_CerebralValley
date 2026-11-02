import { describe, it, expect } from "vitest";
import { pipingSpec, wps, wallRequired, PRODUCTS } from "../src/lib/piping";
import { rank, tokens } from "../src/lib/retrieval";
import { LANGS, DEFAULT_LANG, speechLocale } from "../src/lib/langs";
import { EQUIPMENT, VENDORS, searchEquipment, diagnose } from "../src/lib/equipment";
import { findStandards } from "../src/lib/standards";
import { docxText, xlsxText, quickFacts } from "../src/lib/docparse";
import { zipSync, strToU8 } from "fflate";
describe("piping/WPS", () => {
  it("B31.3 wall grows with pressure", () => expect(wallRequired(10, 168.3)).toBeGreaterThan(wallRequired(2, 168.3)));
  it("every product yields a spec with standards", () => PRODUCTS.forEach((p) => { const s = pipingSpec(p, "6", 20, 60); expect(s.standards!.length).toBeGreaterThan(0); expect(JSON.stringify(s)).toMatch(/B31|NACE|API/); }));
  it("sour gas is NACE", () => expect(JSON.stringify(pipingSpec("sour-gas", "4", 50))).toMatch(/NACE/));
  it("WPS has root pass", () => expect(JSON.stringify(wps("A106 Gr.B", 7.1))).toMatch(/E6010|root/i));
});
describe("retrieval", () => { it("ranks relevant first", () => { const r = rank("bearing vibration", [{ text: "paint colour" }, { text: "bearing vibration high 7 mm/s" }]); expect(r[0].text).toMatch(/bearing/); expect(tokens("The pump")).toEqual(["pump"]); }); });
describe("langs", () => { it("en-US default, Igbo still supported", () => { expect(DEFAULT_LANG).toBe("en-US"); expect(LANGS.some(([c]) => c === "ig")).toBe(true); expect(LANGS.length).toBeGreaterThan(60); expect(speechLocale("ig")).toBe("ig-NG"); }); });
describe("equipment KB", () => {
  it("is multi-vendor and large", () => { expect(EQUIPMENT.length).toBeGreaterThan(150); expect(VENDORS.length).toBeGreaterThan(15); });
  it("search + diagnose", () => { const e = searchEquipment("ABB VFD overcurrent")[0]; expect(e).toBeTruthy(); const d = diagnose(e.id, "overcurrent trip"); expect(d!.howTo.length).toBeGreaterThan(0); });
  it("standards lookup", () => expect(findStandards("lockout energy isolation")[0].code).toMatch(/1910\.147/));
});
describe("docparse", () => {
  it("docx", () => expect(docxText(zipSync({ "word/document.xml": strToU8("<w:p><w:t>Torque 45 Nm</w:t></w:p>") }))).toContain("Torque 45 Nm"));
  it("xlsx", () => expect(xlsxText(zipSync({ "xl/sharedStrings.xml": strToU8("<sst><si><t>PT-101</t></si></sst>"), "xl/worksheets/sheet1.xml": strToU8('<row r="1"><c t="s"><v>0</v></c><c><v>12.5</v></c></row>') }))).toContain("PT-101,12.5"));
  it("facts", () => { const f = quickFacts("PT-101 reads 12 bar per API 610. WARNING: never open hot."); expect(f.tags).toContain("PT-101"); expect(f.readings.join()).toMatch(/12 bar/); expect(f.warnings.length).toBe(1); });
});
import { advise } from "../src/lib/scada/advisor";
import { initSim } from "../src/lib/scada/model";
describe("scada advisor", () => {
  it("normal → no advice", () => expect(advise(initSim().v).advice.length).toBe(0));
  it("high pressure → critical advice + proposal, no write", () => { const v = { ...initSim().v, SEP1_P: 17.5 }; const a = advise(v); expect(a.advice[0].priority).toBe("critical"); expect(a.advice[0].proposal!.sp).toBeLessThan(15); expect(a.trips.join()).toMatch(/PSHH/); });
});
