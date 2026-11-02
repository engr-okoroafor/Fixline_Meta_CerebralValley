"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, XRSpace, createXRStore, useXRPlanes, useXRMeshes, useXRInputSourceStates, useXRSessionVisibilityState, useXRAnchor, useXR } from "@react-three/xr";
import * as THREE from "three";
import { SCENARIOS, clampSeated, surfaceSuitability, bestSurface, hazardZoneRadius, inputState, promptsFromLabels, fovFromProjection, type PlaneInfo } from "@/lib/xr-logic";
import { findHazard } from "@/lib/hazards";
import { initSim, stepSim } from "@/lib/scada/model";
// Hands-first: controllers disabled, hand + transient (gaze+pinch) pointers; no teleport. System palm-pinch gesture is never bound.
export const xrStore = createXRStore({ controller: false, hand: { teleportPointer: false }, transientPointer: true, gaze: false, planeDetection: true, meshDetection: true, hitTest: true, anchors: true, depthSensing: true, offerSession: false, emulate: false } as any);
function tex(lines: string[], w: number, h: number, accent: string, contrast: boolean) {
  const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext("2d")!;
  g.fillStyle = contrast ? "#000" : "rgba(3,16,8,0.88)"; g.beginPath(); g.roundRect(0, 0, c.width, c.height, 40); g.fill(); g.strokeStyle = contrast ? "#ff0" : accent; g.lineWidth = 6; g.stroke();
  g.fillStyle = contrast ? "#ff0" : "#d7ffe9"; g.font = "bold 28px sans-serif"; lines.slice(0, 8).forEach((l, i) => g.fillText(l.slice(0, 36), 22, 46 + i * 31));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function Panel({ pos, lines, w = 0.3, h = 0.12, accent = "#39FF14", onPress, contrast, tip }: { pos: [number, number, number]; lines: string[]; w?: number; h?: number; accent?: string; onPress?: () => void; contrast: boolean; tip?: string }) {
  const t = useMemo(() => tex(lines, w, h, accent, contrast), [lines, w, h, accent, contrast]); const [hov, setHov] = useState(false);
  const tt = useMemo(() => (tip ? tex([tip], 0.22, 0.04, "#00FF9C", contrast) : null), [tip, contrast]);
  return <group position={pos}>
    {onPress && <mesh onClick={onPress} onPointerOver={() => setHov(true)} onPointerOut={() => setHov(false)} position={[0, 0, -0.001]}><planeGeometry args={[w + 0.02, h + 0.02]} /><meshBasicMaterial transparent opacity={hov ? 0.35 : 0} color="#39FF14" /></mesh>}
    <mesh scale={hov ? 1.04 : 1}><planeGeometry args={[w, h]} /><meshBasicMaterial map={t} transparent /></mesh>
    {hov && tt && <mesh position={[0, h / 2 + 0.03, 0.005]}><planeGeometry args={[0.22, 0.04]} /><meshBasicMaterial map={tt} transparent /></mesh>}
  </group>;
}
/** Grid layout: no overlaps. Returns centre of cell (col,row) for given cell size + gap. */
export function cell(col: number, row: number, cols: number, w: number, h: number, gap = 0.02, top = 0): [number, number] { const W = cols * w + (cols - 1) * gap; return [-W / 2 + w / 2 + col * (w + gap), top - row * (h + gap)]; }
function MiniStation({ contrast }: { contrast: boolean }) {
  const [s, setS] = useState(initSim);
  useEffect(() => { const id = setInterval(() => setS((p) => stepSim(p)), 1000); return () => clearInterval(id); }, []);
  const rep = useMemo(() => { try { return JSON.parse(localStorage.getItem("fixline.replica.v1") ?? "null") as { tags: { label: string; value: unknown; unit: string; x: number; y: number }[] } | null; } catch { return null; } }, []);
  const alarm = s.v.SEP1_P > 15 || s.v.SEP1_L > 80;
  return <group>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.06, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.1, 24]} /><meshBasicMaterial color={alarm ? "#ff4d6d" : "#39FF14"} wireframe /></mesh>
    <mesh position={[0.06, -0.025 + 0.025 * s.v.TK1_L / 100, 0]}><cylinderGeometry args={[0.022, 0.022, 0.05 * s.v.TK1_L / 100 + 0.001, 20]} /><meshBasicMaterial color="#00FF9C" transparent opacity={0.6} /></mesh>
    <mesh position={[0.06, 0, 0]}><cylinderGeometry args={[0.024, 0.024, 0.05, 20, 1, true]} /><meshBasicMaterial color="#39FF14" wireframe /></mesh>
    <mesh position={[0.12, 0.03 + s.v.FLARE_FLOW * 0.001, 0]}><coneGeometry args={[0.008, 0.02 + s.v.FLARE_FLOW * 0.002, 8]} /><meshBasicMaterial color="#ff8a3d" /></mesh>
    <Panel contrast={contrast} pos={[0, -0.06, 0]} w={0.26} h={0.05} lines={[`SEP P ${s.v.SEP1_P.toFixed(1)} barg  L ${s.v.SEP1_L.toFixed(0)}%`, alarm ? "ALARM: open 2D SCADA" : "Normal"]} accent={alarm ? "#ff4d6d" : "#39FF14"} />
    {rep?.tags.slice(0, 6).map((t, i) => <mesh key={i} position={[-0.12 + t.x * 0.24, 0.05 + (1 - t.y) * 0.05, 0]}><boxGeometry args={[0.012, 0.012, 0.012]} /><meshBasicMaterial color="#00FF9C" /></mesh>)}
  </group>;
}
function extent(p: XRPlane) { const xs = p.polygon.map((v) => v.x), zs = p.polygon.map((v) => v.z); return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs) }; }
export type SceneProps = { scenario: string; step: number; setStep: (n: number) => void; setScenario: (s: string) => void; paused: boolean; setPaused: (p: boolean) => void; contrast: boolean; say: (t: string) => void };
/** Spatial AR guide: leader-line labels, measurement callouts, step progress, safety keep-out zone and contextual hints. */
function Leader({ from, to, color = "#39FF14" }: { from: [number, number, number]; to: [number, number, number]; color?: string }) {
  const g = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...from), new THREE.Vector3(...to)]), [from, to]);
  return <primitive object={new THREE.Line(g, new THREE.LineBasicMaterial({ color }))} />;
}
function Pulse({ r, color }: { r: number; color: string }) {
  const [t, setT] = useState(0); useEffect(() => { let id = 0; const f = () => { setT(performance.now() / 1000); id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); return () => cancelAnimationFrame(id); }, []);
  const k = 1 + 0.08 * Math.sin(t * 3);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[k, k, k]}><ringGeometry args={[r - 0.012, r, 64]} /><meshBasicMaterial color={color} transparent opacity={0.5 + 0.3 * Math.sin(t * 3)} side={THREE.DoubleSide} /></mesh>;
}
function ARGuide({ contrast, step, total, hint }: { contrast: boolean; step: number; total: number; hint: string }) {
  const labels: [string, [number, number, number], [number, number, number]][] = [["Motor (driver)", [0.27, 0.05, -0.42], [0.42, 0.16, -0.42]], ["Coupling · check alignment", [0.31, 0.03, -0.42], [0.33, -0.12, -0.4]], ["Pump (driven)", [0.35, 0.05, -0.42], [0.5, 0.06, -0.38]]];
  return <group>
    {labels.map(([l, a, b]) => <group key={l}><Leader from={a} to={b} /><Panel contrast={contrast} pos={b} w={0.13} h={0.035} lines={[l]} /></group>)}
    <Leader from={[0.2, -0.06, -0.42]} to={[0.42, -0.06, -0.42]} color="#00FF9C" />
    <Panel contrast={contrast} pos={[0.31, -0.085, -0.42]} w={0.2} h={0.045} accent="#00FF9C" lines={["H ∠ 0.42 mm/100mm ✕", "V offset −0.56 mm ✕"]} />
    <group position={[0, -1.1, -0.9]}><Pulse r={0.9} color="#ff4d6d" /><Panel contrast={contrast} pos={[0, 0.05, 0]} w={0.22} h={0.04} accent="#ff4d6d" lines={["KEEP-OUT 0.9 m · rotating parts"]} /></group>
    <mesh position={[-0.2 + (0.4 * Math.min(step, total)) / Math.max(total, 1) / 2, -0.03, -0.5]}><boxGeometry args={[(0.4 * Math.min(step, total)) / Math.max(total, 1), 0.008, 0.002]} /><meshBasicMaterial color="#39FF14" /></mesh>
    <Panel contrast={contrast} pos={[-0.3, 0.02, -0.45]} w={0.16} h={0.07} accent="#facc15" lines={["Hint", ...(hint.match(/.{1,24}(\s|$)/g) ?? []).slice(0, 3).map((x) => x.trim())]} />
  </group>;
}
function Inner(p: SceneProps) {
  const planes = useXRPlanes(); const meshes = useXRMeshes(); const sources = useXRInputSourceStates(); const vis = useXRSessionVisibilityState();
  const session = useXR((s) => s.session); const [anchor, createAnchor] = useXRAnchor();
  const infos: PlaneInfo[] = planes.map((pl) => ({ orientation: pl.orientation as any, ...extent(pl), label: (pl as any).semanticLabel, distance: 0.5 })); // distance refined on-device
  const clutter = planes.map(() => Math.max(0, meshes.length - planes.length)); // coarse: meshes beyond planes ≈ objects
  const idx = bestSurface(infos, clutter); const plane = idx >= 0 ? planes[idx] : undefined;
  const st = inputState(sources.map((s: any) => ({ type: s.type, joints: s.inputSource?.hand?.size })));
  const paused = st.paused || (vis !== undefined && vis !== "visible");
  useEffect(() => { if (paused !== p.paused) { p.setPaused(paused); if (paused) p.say("Paused. Raise your hands to resume."); } }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // anchor + persist
    if (!plane || anchor || !session) return;
    createAnchor({ relativeTo: plane.planeSpace } as any).then(async (a: any) => { try { const h = await a?.requestPersistentHandle?.(); if (h) localStorage.setItem("fixline.anchor", h); } catch { /* persistent anchors unsupported */ } }).catch(() => {});
  }, [plane, anchor, session, createAnchor]);
  useEffect(() => { const h = localStorage.getItem("fixline.anchor"); if (h && (session as any)?.restorePersistentAnchor) (session as any).restorePersistentAnchor(h).catch(() => localStorage.removeItem("fixline.anchor")); }, [session]);
  const fov = fovFromProjection(undefined);
  const prompts = promptsFromLabels([...planes.map((x: any) => x.semanticLabel), ...meshes.map((m: any) => m.semanticLabel)]);
  const sc = SCENARIOS.find((s) => s.id === p.scenario)!; const done = p.step >= sc.steps.length;
  const ui = (base: [number, number, number]) => { const c = clampSeated({ x: base[0], y: base[1], z: base[2] }, fov); return [c.x, c.y, c.z] as [number, number, number]; };
  const body = paused
    ? <Panel contrast={p.contrast} pos={ui([0, 0, -0.5])} w={0.34} h={0.14} accent="#facc15" lines={["Paused", "Hand tracking lost or app hidden.", "Raise both hands, then pinch", "here to resume."]} onPress={() => p.setPaused(false)} />
    : <>
      <Panel contrast={p.contrast} pos={ui([0, 0.1, -0.5])} w={0.4} h={0.15} lines={[sc.title, done ? "Complete. Pinch Restart." : `Step ${p.step + 1}/${sc.steps.length}`, ...(done ? [] : (sc.steps[p.step].text.match(/.{1,34}(\s|$)/g) ?? []).map((x) => x.trim()))]} />
      {([[done ? "Restart" : "Done ✓", "Pinch to confirm this step", () => { const n = done ? 0 : p.step + 1; p.setStep(n); p.say(n < sc.steps.length ? sc.steps[n].text : "Checklist complete."); }],
        [p.scenario === "loto" ? "Gen CO" : "LOTO", "Switch checklist", () => { p.setScenario(p.scenario === "loto" ? "gen-co" : "loto"); p.setStep(0); }],
        [p.contrast ? "Std contrast" : "Hi contrast", "Toggle high-contrast panels", () => p.say("Use the 2D toggle for contrast")]] as [string, string, () => void][]).map(([l, tip, fn], i) => { const [x, y] = cell(i, 0, 3, 0.125, 0.06, 0.02, -0.01); return <Panel key={l} contrast={p.contrast} pos={ui([x, y, -0.5])} w={0.125} h={0.06} lines={[l]} tip={tip} onPress={fn} />; })}
      {prompts.slice(0, 3).map((id, i) => { const [x, y] = cell(i, 0, 3, 0.125, 0.06, 0.02, -0.09); return <Panel key={id} contrast={p.contrast} accent="#ff4d6d" pos={ui([x, y, -0.5])} w={0.125} h={0.06} lines={["Nearby:", findHazard(id)?.title ?? id]} tip="Pinch to hear the first safety step" onPress={() => p.say(findHazard(id)?.steps[0] ?? "")} />; })}
      <group position={ui([0.27, 0.02, -0.42])} rotation={[0, -0.5, 0]}><MiniStation contrast={p.contrast} /></group>
      <ARGuide contrast={p.contrast} step={p.step} total={sc.steps.length} hint={done ? "Checklist complete — remove locks only after headcount." : "Pinch Done when verified. Look at a hazard to get a label."} />
    </>;
  return <>
    <ambientLight />
    {plane && <XRSpace space={plane.planeSpace}>{/* Safety dashboard anchored on surface + hazard zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}><ringGeometry args={[hazardZoneRadius(infos[idx]) - 0.01, hazardZoneRadius(infos[idx]), 48]} /><meshBasicMaterial color="#f87171" transparent opacity={0.7} /></mesh>
      <Panel contrast={p.contrast} pos={[0, 0.08, 0]} w={0.24} h={0.1} accent="#f87171" lines={["Safety zone", `Surface score ${surfaceSuitability(infos[idx], clutter[idx]).score}`, "Call emergency services first"]} />
    </XRSpace>}
    {!plane && planes.length === 0 && !paused && <Panel contrast={p.contrast} pos={ui([0, 0.16, -0.5])} w={0.3} h={0.06} accent="#facc15" lines={["No surfaces found: head-locked mode"]} />}
    <group position={[0, 1.15, 0]}>{body}</group>
  </>;
}
export default function XRScene(p: SceneProps) {
  return <Canvas camera={{ position: [0, 1.15, 0] }}><XR store={xrStore}><Inner {...p} /></XR></Canvas>;
}
