// Strict SVG sanitizer for model-generated diagrams (rendered via <img>, so scripts never run anyway).
export function sanitizeSvg(svg: string) {
  const m = svg.match(/<svg[\s\S]*<\/svg>/i); if (!m) return null;
  let s = m[0];
  if (/<(script|foreignObject|iframe|image|use)\b/i.test(s)) s = s.replace(/<(script|foreignObject|iframe|image|use)\b[\s\S]*?(<\/\1>|\/>)/gi, "");
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/(xlink:)?href\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/javascript:/gi, "");
  if (!/xmlns=/.test(s)) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return s.length > 60000 ? null : s;
}
export function fallbackSvg(title: string, steps: string[]) {
  const esc = (t: string) => t.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!).slice(0, 48);
  const h = 60 + steps.length * 56;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 ${h}" font-family="sans-serif"><rect width="420" height="${h}" rx="24" fill="#07130d"/><text x="20" y="34" fill="#39FF14" font-size="16" font-weight="700">${esc(title)}</text>${steps.map((s, i) => `<g transform="translate(20 ${56 + i * 56})"><rect width="380" height="44" rx="14" fill="#0d2418" stroke="#00FF9C"/><circle cx="22" cy="22" r="13" fill="#39FF14"/><text x="22" y="27" text-anchor="middle" font-size="13" fill="#000">${i + 1}</text><text x="44" y="27" font-size="12" fill="#d7ffe9">${esc(s)}</text>${i < steps.length - 1 ? '<path d="M22 44v12" stroke="#00FF9C" stroke-width="2"/>' : ""}</g>`).join("")}</svg>`;
}
