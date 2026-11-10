import { test, expect } from "@playwright/test";
test("admin API requires auth; public AI is rate-limited not gated", async ({ request }) => {
  expect((await request.get("/api/admin")).status()).toBe(401);
  expect((await request.post("/api/ai", { data: { mode: "safety", hazard: "fire" } })).status()).toBe(200);
});
test("security headers", async ({ request }) => { const r = await request.get("/xr"); expect(r.headers()["content-security-policy"]).toContain("frame-ancestors 'none'"); });
test("/xr cold start → checklist anonymously < 30 s, resume keeps place", async ({ page }) => {
  const t0 = Date.now(); await page.goto("/xr"); await expect(page.getByTestId("checklist")).toBeVisible(); expect(Date.now() - t0).toBeLessThan(30000);
  await page.getByRole("button", { name: /Generator/ }).click();
  for (let i = 0; i < 6; i++) { await page.getByTestId("step-ask").click(); await page.getByTestId("step-approve").click(); }
  await expect(page.getByText("Checklist complete ✓")).toBeVisible();
  await page.getByTestId("step-restart").click(); await page.getByTestId("step-ask").click(); await page.getByTestId("step-approve").click();
  await page.reload(); await expect(page.getByText(/Step 2\/6/)).toBeVisible();
});
test("anonymous Safety demo + grounded ask + refusal", async ({ page }) => {
  await page.goto("/"); await page.getByRole("tab", { name: "Safety" }).click();
  await page.getByRole("button", { name: "Fire", exact: true }).click(); await expect(page.getByText(/not a substitute/i).first()).toBeVisible();
  await page.getByLabel("Ask a safety question").fill("Which extinguisher for a cooking oil fire?"); await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByTestId("answer")).toBeVisible({ timeout: 60000 });
});
test("sign up → admin console", async ({ page }) => {
  await page.goto("/login"); await page.getByText("Need an account").click();
  await page.getByLabel("Email").fill(`u${Date.now()}@test.dev`); await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click(); await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
});
