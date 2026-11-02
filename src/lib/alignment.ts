/** Typical shaft alignment tolerances (short flexible couplings), offset mm / angularity mm per 100 mm. */
export const TOL: [number, number, number][] = [[1000, 0.10, 0.10], [2000, 0.08, 0.08], [3000, 0.07, 0.07], [4000, 0.06, 0.06], [6000, 0.05, 0.05]];
export const tolFor = (rpm: number) => { const r = TOL.find((x) => rpm <= x[0]) ?? TOL[TOL.length - 1]; return { off: r[1], ang: r[2] }; };
export type Reading = { hAng: number; hOff: number; vAng: number; vOff: number };
/** Foot corrections for the movable machine. Positive = add shim (V) / move toward + (H). */
export function corrections(r: Reading, cToF: number, fToR: number) {
  const at = (off: number, ang: number, d: number) => +(-(off + (ang * d) / 100)).toFixed(2);
  return { vFront: at(r.vOff, r.vAng, cToF), vRear: at(r.vOff, r.vAng, cToF + fToR), hFront: at(r.hOff, r.hAng, cToF), hRear: at(r.hOff, r.hAng, cToF + fToR) };
}
