import { test, expect, type Page } from "@playwright/test";
async function overlaps(page: Page) {
  return page.evaluate(() => { const els = [...document.querySelectorAll("button, a.btn, input, select, textarea")].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !e.closest("[aria-hidden=true]"); }).map((e) => ({ e: (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 30), r: e.getBoundingClientRect() }));
    const bad: string[] = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i].r, b = els[j].r; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 2 && iy > 2) bad.push(`${els[i].e} × ${els[j].e}`); }
    const small = els.filter((x) => x.r.height < 43.5 && !/^(INPUT)$/.test(x.e)).map((x) => `${x.e}:${Math.round(x.r.height)}`); return { bad, small }; });
}
for (const w of [375, 768, 1440]) {
  test(`no overlaps + screenshots @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    for (const [name, url, tab] of [["home", "/", null], ["scada", "/", "SCADA"], ["tuning", "/", "Tuning"], ["safety", "/", "Safety"], ["xr", "/xr", null]] as const) {
      await page.goto(url); if (tab) await page.getByRole("tab", { name: tab }).click(); await page.waitForTimeout(1500);
      const o = await overlaps(page); expect(o.bad, `${name}@${w} overlaps`).toEqual([]); expect(o.small, `${name}@${w} small targets`).toEqual([]);
      await page.screenshot({ path: `shots/${name}-${w}.png`, fullPage: true });
    }
  });
}
test("tooltip appears on hover", async ({ page }) => { await page.goto("/"); await page.getByRole("button", { name: "Switch to light theme" }).hover(); await expect(page.getByRole("tooltip")).toBeVisible(); });
test("SCADA control write requires login; agent + extract public", async ({ request }) => {
  expect((await request.post("/api/scada", { data: { op: "write", tag: "SEP1_P", sp: 12, target: "real", confirmed: true, estop: false } })).status()).toBe(401);
  const v = { SEP1_P: 16, SEP1_L: 50, SEP1_T: 60, TK1_L: 40, P101_FLOW: 120, FLARE_FLOW: 2, EXPORT_P: 30 };
  const r = await request.post("/api/agent", { data: { goal: "diagnose high pressure", values: v } }); expect(r.status()).toBe(200); const j = await r.json(); expect(j.steps[0].phase).toBe("plan");
});
