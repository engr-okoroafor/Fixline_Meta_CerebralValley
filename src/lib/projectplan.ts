import { ccgtShowcase } from "./schedule";
export type PlanTask = { name: string; phase: string; offset: number; days: number; owner: string; cost: number; dep: number };
export type Plan = { name: string; summary: string; method: Method; tasks: PlanTask[]; stages: { name: string; gate: string; deliverables: string[] }[]; risks: { risk: string; owner: string; response: string }[]; raci: [string, string][]; contingency: number };
export const METHODS = ["PMP", "PRINCE2", "Agile", "Waterfall", "CPM", "LSS"] as const;
export type Method = (typeof METHODS)[number];
export const METHOD_LABEL: Record<Method, string> = { PMP: "PMP", PRINCE2: "PRINCE2", Agile: "Agile / Scrum", Waterfall: "Waterfall", CPM: "Critical Path / CCPM", LSS: "Lean Six Sigma" };
/** Standard lifecycle libraries. The Projects screen shows these under Stage deliverables only. */
export const STAGES: Record<Method, { name: string; gate: string; deliverables: string[] }[]> = {
  PMP: [
    { name: "Initiating", gate: "Charter approved", deliverables: ["Project Charter", "Stakeholder Register", "Business Case", "Assumption Log", "Benefits Management Plan"] },
    { name: "Planning", gate: "Baselines approved", deliverables: ["Project Management Plan", "Scope Management Plan", "Requirements Documentation", "Requirements Traceability Matrix", "Project Scope Statement", "WBS", "WBS Dictionary", "Schedule Management Plan", "Activity List", "Milestone List", "Network Diagram", "Schedule Baseline", "Cost Management Plan", "Cost Estimates", "Cost Baseline", "Resource Management Plan", "Risk Management Plan", "Risk Register", "Quality Management Plan", "Quality Metrics", "Communications Plan", "Stakeholder Engagement Plan", "Procurement Plan", "Change Management Plan"] },
    { name: "Executing", gate: "Work complete", deliverables: ["Status Report", "Issue Log", "Change Request", "Work Performance Data", "Deliverables Register", "Quality Audit Report", "Team Assignments", "Procurement Status"] },
    { name: "Monitoring & Controlling", gate: "Performance in tolerance", deliverables: ["Change Log", "Performance Report", "Earned Value Report", "Risk Review", "Forecast Report", "Variance Analysis", "Quality Control Measurements", "A3 Summary"] },
    { name: "Closing", gate: "Acceptance signed", deliverables: ["Final Report", "Closure Report", "Lessons Learned", "Formal Acceptance", "Closeout Certificate", "Procurement Closure", "Handover Dossier"] },
  ],
  PRINCE2: [
    { name: "Starting up", gate: "Authorize initiation", deliverables: ["Project Brief", "Outline Business Case"] },
    { name: "Initiating", gate: "Authorize the project", deliverables: ["Project Initiation Documentation (PID)", "Risk Register"] },
    { name: "Delivery stage 1", gate: "End stage assessment", deliverables: ["Stage Plan", "Highlight Report", "Work Package"] },
    { name: "Delivery stage 2", gate: "End stage assessment", deliverables: ["End Stage Report", "Exception Report"] },
    { name: "Closing", gate: "Authorize closure", deliverables: ["End Project Report", "Lessons Report", "A3 Summary"] },
  ],
  Agile: [
    { name: "Vision & backlog", gate: "Product backlog ready", deliverables: ["Product Vision", "Product Backlog"] },
    { name: "Sprint planning", gate: "Sprint goal agreed", deliverables: ["Sprint Backlog", "Definition of Done"] },
    { name: "Sprint execution", gate: "Increment done", deliverables: ["Daily Stand-up Log", "Burndown Report"] },
    { name: "Review & retro", gate: "Increment accepted", deliverables: ["Sprint Review Notes", "Retrospective Actions"] },
    { name: "Release", gate: "Release approved", deliverables: ["Release Notes", "A3 Summary", "Handover Pack"] },
  ],
  Waterfall: [
    { name: "Requirements", gate: "Requirements signed off", deliverables: ["Requirements Specification"] },
    { name: "Design", gate: "Design review passed", deliverables: ["Design Basis", "Drawings Register", "WBS", "Schedule Baseline", "Risk Register"] },
    { name: "Construction", gate: "Mechanical completion", deliverables: ["Construction Progress Report", "Punch List"] },
    { name: "Testing & commissioning", gate: "Performance test passed", deliverables: ["Test Report", "Commissioning Dossier"] },
    { name: "Handover", gate: "Client acceptance", deliverables: ["A3 Summary", "Handover Certificate", "Lessons Learned"] },
  ],
  CPM: [
    { name: "Activity definition", gate: "WBS & logic complete", deliverables: ["Activity List", "WBS", "Network Diagram", "Schedule Baseline"] },
    { name: "Critical path & buffers", gate: "Schedule baseline", deliverables: ["Critical Path Analysis", "Buffer Plan (CCPM)", "Risk Register"] },
    { name: "Execution", gate: "Buffer in green/yellow", deliverables: ["Fever Chart Report", "Look-ahead Schedule"] },
    { name: "Control", gate: "Float recovered", deliverables: ["Schedule Variance Report", "Recovery Plan", "A3 Summary"] },
    { name: "Close", gate: "Completion", deliverables: ["As-built Schedule", "Lessons Learned"] },
  ],
  LSS: [
    { name: "Define", gate: "Charter & CTQs agreed", deliverables: ["Project Charter", "SIPOC & VOC"] },
    { name: "Measure", gate: "Baseline measured", deliverables: ["Data Collection Plan", "MSA / Baseline Report"] },
    { name: "Analyze", gate: "Root cause verified", deliverables: ["Root Cause Analysis (Fishbone/5-Why)", "Pareto Analysis"] },
    { name: "Improve", gate: "Solution piloted", deliverables: ["Improvement Plan", "FMEA"] },
    { name: "Control", gate: "Sustained gains", deliverables: ["Control Plan", "A3 Summary", "SPC Charts & Closure"] },
  ],
};
/** Flat union of the stage library, for callers that still want every title. The UI does not render this as its own section. */
export const ALL_DOCS: Record<Method, string[]> = {
  PMP: STAGES.PMP.flatMap((s) => s.deliverables),
  PRINCE2: STAGES.PRINCE2.flatMap((s) => s.deliverables),
  Agile: STAGES.Agile.flatMap((s) => s.deliverables),
  Waterfall: STAGES.Waterfall.flatMap((s) => s.deliverables),
  CPM: STAGES.CPM.flatMap((s) => s.deliverables),
  LSS: STAGES.LSS.flatMap((s) => s.deliverables),
};
/** Deterministic plan when no AI provider answers — still complete and editable. */
export function fallbackPlan(brief: string, method: Method): Plan {
  if (/\b(ccgt|combined[-\s]?cycle|\d+\s*mw|power plant)\b/i.test(brief)) {
    const s = ccgtShowcase();
    const start = Date.parse(s.startISO + "T00:00:00Z");
    const tasks = s.tasks.map((t) => ({ name: t.name, phase: t.phase || "Execute", offset: Math.round((Date.parse(t.start + "T00:00:00Z") - start) / 86400000), days: Math.round((Date.parse(t.end + "T00:00:00Z") - Date.parse(t.start + "T00:00:00Z")) / 86400000) + 1, owner: t.owner, cost: t.cost, dep: t.dep ? Number(t.dep.slice(1)) - 1 : -1 }));
    return { name: s.name, summary: s.summary, method, tasks, stages: STAGES[method], contingency: 12, risks: [{ risk: "Gas supply or pipeline permit delay", owner: "Pipeline", response: "Start the right-of-way early and keep a second gas spec" }, { risk: "OEM turbine slot slips", owner: "Procurement", response: "Liquidated damages and a factory-test hold point" }, { risk: "Grid connection late", owner: "E&I", response: "Build the switchyard in parallel with the turbine hall" }, { risk: "Community and land access", owner: "PM", response: "Weekly community forum in Oguta LGA" }, { risk: "Commissioning vibration or spread trip", owner: "Commissioning", response: "OEM rep on site, performance test procedure agreed before fuel-in" }], raci: [["Project Manager", "Accountable for the baseline and the stage gates"], ["OEM", "Turbine, HRSG and steam turbine supply"], ["HSE", "Permits, PTW and community safety"], ["Grid owner", "Interconnection and protection settings"], ["Client", "Accepts first power"]] };
  }
  const T: [string, string, number, string, number][] = [["Scope, stakeholders & charter", "Initiate", 2, "PM", 1200], ["Site survey & risk assessment (HAZOP/JSA)", "Initiate", 2, "HSE", 1500], ["Detailed design & WBS", "Plan", 4, "Engineering", 4800], ["Procurement of long-lead items", "Plan", 10, "Procurement", 18000], ["Permit to work & LOTO plan", "Plan", 1, "HSE", 600], ["Mobilize crew & equipment", "Execute", 2, "Construction", 3500], ["Mechanical installation", "Execute", 6, "Mechanical", 14000], ["Electrical & instrumentation", "Execute", 5, "E&I", 9000], ["QA/QC inspection & NDT", "Control", 2, "QA/QC", 2500], ["Pre-commissioning & loop checks", "Control", 2, "Commissioning", 2200], ["Commissioning & performance test", "Control", 2, "Commissioning", 3000], ["Handover, dossier & lessons learned", "Close", 2, "PM", 1000]];
  let off = 0; const tasks = T.map(([name, phase, days, owner, cost], k) => { const t = { name, phase, offset: k === 4 ? off - 1 : off, days, owner, cost, dep: k - 1 }; if (k !== 3) off += days; else off += 3; return t; });
  return { name: brief.split(/[.\n]/)[0].slice(0, 80) || "New project", summary: brief, method, tasks, stages: STAGES[method], contingency: 10,
    risks: [{ risk: "Long-lead item delay", owner: "Procurement", response: "Expedite + alternate vendor" }, { risk: "Permit/LOTO delays", owner: "HSE", response: "Pre-book permits; daily PTW meeting" }, { risk: "Scope creep", owner: "PM", response: "Change control board" }, { risk: "Weather / access", owner: "Construction", response: "Float + indoor work sequencing" }, { risk: "Commissioning failure", owner: "Commissioning", response: "Pre-commissioning checklists, vendor rep on site" }],
    raci: [["Project Manager", "Accountable for plan, budget, reporting"], ["HSE Lead", "PTW, LOTO, risk register"], ["Engineering", "Design & technical queries"], ["Contractor", "Execution of work packages"], ["Client / Sponsor", "Approves gates and changes"]] };
}
export function fallbackDeliverable(project: string, stage: string, doc: string, method: string) {
  return { title: `${doc} — ${project}`, sections: [{ heading: "Purpose", bullets: [`${doc} for the ${stage} stage, prepared under ${method}.`] }, { heading: "Scope & objectives", bullets: ["In scope / out of scope agreed with sponsor", "SMART objectives with acceptance criteria"] }, { heading: "Schedule & milestones", bullets: ["Baseline from the live Gantt", "Stage gate: sponsor approval"] }, { heading: "Cost & tolerances", bullets: ["Budget from the costing panel incl. contingency", "Tolerance ±10% cost, ±5 days time"] }, { heading: "Risks & issues", bullets: ["Top risks from the risk register with owners"] }, { heading: "Quality & HSE", bullets: ["ITP / QA-QC hold points", "PTW + LOTO per jurisdiction"] }, { heading: "Approvals", bullets: ["Project manager", "Contractor representative", "Client / sponsor"] }] };
}
