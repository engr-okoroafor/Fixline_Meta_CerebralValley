import { describe, it, expect } from "vitest";
import { analyseSchedule, applyProjectCommand, barStatus, ccgtShowcase, nextBestAction, timeColumns, type GanttTask } from "@/lib/schedule";
import { gateAllowsNext, guideFor } from "@/lib/repair-guide";
import { guardValve } from "@/lib/scada/model";
import { buildDoc } from "@/lib/safetydocs";
import { navCommand } from "@/lib/ai/harness";
import { formatShiftReport, qualityDoc } from "@/lib/qualitydocs";
import { ALL_DOCS, METHODS, STAGES, fallbackPlan } from "@/lib/projectplan";
const t = (id: string, name: string, start: string, end: string, dep?: string): GanttTask => ({ id, name, start, end, owner: "PM", cost: 10, done: 0, dep });
describe("critical path", () => {
  const chain = [t("a", "Design", "2026-01-01", "2026-01-02"), t("b", "Build", "2026-01-03", "2026-01-04", "a")];
  it("a tight chain is entirely critical", () => { const a = analyseSchedule(chain); expect(a.rows.every((r) => r.critical && r.float === 0)).toBe(true); expect(a.path).toEqual(["a", "b"]); });
  it("a short parallel task has float", () => { const a = analyseSchedule([...chain, t("c", "Survey", "2026-01-01", "2026-01-01")]); const c = a.rows.find((r) => r.id === "c")!; expect(c.critical).toBe(false); expect(c.float).toBeGreaterThan(0); });
  it("flags a start that overlaps its predecessor", () => { const a = analyseSchedule([t("a", "Design", "2026-01-01", "2026-01-05"), t("b", "Build", "2026-01-02", "2026-01-06", "a")]); expect(a.rows.find((r) => r.id === "b")!.conflict).toBe(true); });
});
describe("gantt helpers", () => {
  it("classifies bar status", () => { expect(barStatus({ done: 100, start: "2026-01-01", end: "2026-01-02" }, "2026-06-01")).toBe("completed"); expect(barStatus({ done: 0, start: "2026-12-01", end: "2026-12-02" }, "2026-06-01")).toBe("pending"); expect(barStatus({ done: 40, start: "2026-01-01", end: "2026-02-01" }, "2026-06-01")).toBe("in-progress"); });
  it("uses grouped month labels on a long job and covers the span", () => { const cols = timeColumns(ccgtShowcase().tasks); expect(cols.length).toBeGreaterThan(4); expect(cols[0].label).toMatch(/1/); expect(cols.reduce((s, c) => s + c.days, 0)).toBeGreaterThan(800); });
  it("voice edits mark, slip, disconnect", () => {
    const tasks = [t("a", "Gas pipeline", "2026-01-01", "2026-01-10"), t("b", "Handover", "2026-01-11", "2026-01-12", "a")];
    expect(applyProjectCommand("mark gas pipeline 55%", tasks).tasks![0].done).toBe(55);
    expect(applyProjectCommand("slip handover by 14 days", tasks).tasks!.find((x) => x.id === "b")!.start).toBe("2026-01-25");
    expect(applyProjectCommand("disconnect handover", tasks).tasks!.find((x) => x.id === "b")!.dep).toBeUndefined();
  });
  it("names the next action on the critical path", () => { const tasks = [{ ...t("a", "Install", "2026-01-01", "2026-01-20"), done: 10 }]; expect(nextBestAction(tasks, "2026-01-05", ["a"])).toMatch(/critical path/); });
});
describe("stage deliverables", () => {
  const legacy = ["Project Charter", "Stakeholder Register", "WBS", "Schedule Baseline", "Cost Baseline", "Risk Register", "Quality Management Plan", "Communications Plan", "Procurement Plan", "Status Report", "Issue Log", "Change Log", "Earned Value Report", "A3 Summary", "Closure Report", "Lessons Learned"];
  it("lists a complete PMP set under each lifecycle stage", () => {
    expect(STAGES.PMP.map((s) => s.name)).toEqual(["Initiating", "Planning", "Executing", "Monitoring & Controlling", "Closing"]);
    const by = Object.fromEntries(STAGES.PMP.map((s) => [s.name, s.deliverables]));
    for (const doc of ["Project Charter", "Stakeholder Register", "Business Case"]) expect(by.Initiating).toContain(doc);
    for (const doc of ["WBS", "Schedule Baseline", "Cost Baseline", "Risk Register", "Quality Management Plan", "Communications Plan", "Procurement Plan"]) expect(by.Planning).toContain(doc);
    for (const doc of ["Status Report", "Issue Log", "Change Request"]) expect(by.Executing).toContain(doc);
    for (const doc of ["Change Log", "Performance Report", "Earned Value Report", "Risk Review", "A3 Summary"]) expect(by["Monitoring & Controlling"]).toContain(doc);
    for (const doc of ["Final Report", "Lessons Learned", "Closure Report", "Formal Acceptance", "Closeout Certificate"]) expect(by.Closing).toContain(doc);
    for (const stage of STAGES.PMP) expect(stage.deliverables.length).toBeGreaterThanOrEqual(5);
    const flat = STAGES.PMP.flatMap((s) => s.deliverables);
    expect(new Set(flat).size).toBe(flat.length);
    for (const doc of legacy) expect(flat).toContain(doc);
    expect(ALL_DOCS.PMP).toEqual(flat);
  });
  it("replaces the staged set for every methodology", () => {
    for (const m of METHODS) {
      expect(STAGES[m].length).toBeGreaterThanOrEqual(4);
      expect(STAGES[m].every((s) => s.gate.length > 0 && s.deliverables.length > 0)).toBe(true);
      expect(ALL_DOCS[m]).toEqual(STAGES[m].flatMap((s) => s.deliverables));
    }
  });
});
describe("showcase and costing plan", () => {
  it("CCGT showcase has full names, links and realistic cost", () => { const s = ccgtShowcase(); expect(s.name).toMatch(/150 MW/); expect(s.tasks.length).toBeGreaterThan(15); expect(s.tasks.some((t) => t.name.length > 30)).toBe(true); expect(s.tasks.reduce((a, t) => a + t.cost, 0)).toBeGreaterThan(100_000_000); expect(analyseSchedule(s.tasks).criticalIds.length).toBeGreaterThan(0); });
  it("a power-plant brief falls back to the CCGT plan", () => { const p = fallbackPlan("150 MW combined-cycle power plant", "Waterfall"); expect(p.tasks.length).toBeGreaterThan(15); expect(p.tasks[0].cost).toBeGreaterThan(1000); });
});
describe("repair gate and valves", () => {
  it("refuses the next step without a camera frame", () => { expect(gateAllowsNext({ hasFrame: false, confidence: 0.9, userConfirmsView: true }).ok).toBe(false); });
  it("accepts a confident SAM box and a confirmed low-confidence box", () => { expect(gateAllowsNext({ hasFrame: true, confidence: 0.9, userConfirmsView: false }).ok).toBe(true); expect(gateAllowsNext({ hasFrame: true, confidence: 0.2, userConfirmsView: false }).ok).toBe(false); expect(gateAllowsNext({ hasFrame: true, confidence: 0.2, userConfirmsView: true }).ok).toBe(true); });
  it("guides a pump seal from the catalog", () => { const g = guideFor("leaking mechanical seal on a centrifugal pump"); expect(g.machine).toMatch(/pump/i); expect(g.steps[0].what.toLowerCase()).toMatch(/lock/); });
  it("never lets the AI move a valve, and requires approval", () => {
    expect(guardValve({ valve: "inlet", open: true, target: "sim", confirmed: true, actor: "ai", estop: false }).ok).toBe(false);
    expect(guardValve({ valve: "inlet", open: true, target: "sim", confirmed: false, actor: "operator", estop: false }).ok).toBe(false);
    expect(guardValve({ valve: "inlet", open: true, target: "real", confirmed: true, actor: "operator", estop: false }).ok).toBe(false);
    expect(guardValve({ valve: "gasOut", open: false, target: "sim", confirmed: true, actor: "operator", estop: false }).ok).toBe(true);
    expect(guardValve({ valve: "inlet", open: true, target: "sim", confirmed: true, actor: "operator", estop: true }).ok).toBe(false);
  });
});
describe("safety, quality, voice nav", () => {
  it("fire plan names the agent and the aim point", () => { const d = buildDoc({ type: "fire", task: "Hot work at the separator" }); expect(d.sections.some((s) => /aim at the base/i.test((s.bullets ?? []).join(" ")))).toBe(true); expect(d.standards.join(" ")).toMatch(/NFPA 10/); });
  it("quality docs and the shift report are structured", () => { expect(qualityDoc("Inspection & Test Plan", "P-101").sections.length).toBeGreaterThan(2); expect(formatShiftReport({ status: "FAIL", temp: 90, vibration: 8, rpm: 1450, findings: "bearing" })).toMatch(/SHIFT QUALITY REPORT/); });
  it("opens projects and alignment by voice", () => { expect(navCommand("open projects")).toBe("projects"); expect(navCommand("show alignment")).toBe("tuning"); });
});
