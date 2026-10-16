import { test, expect } from "@playwright/test";
// Baselines were captured from the pre-refactor viewer, at fixed replay times.
// VIEWER_BASELINE_URL is only for reviewing/updating those references explicitly.
test.use({
  baseURL: process.env.VIEWER_BASELINE_URL ?? "http://127.0.0.1:4173",
});
for (const [pageName, slider, time] of [
  ["pitch-fbd", "#time", "4"],
  ["trim-launch", "#time", "8"],
  ["rigging-comparison", "#replay-time", "15"],
] as const) {
  test(`${pageName} retains its physical-scale presentation`, async ({
    page,
  }) => {
    await page.goto("/" + pageName + ".html");
    await expect(page.locator(slider)).toBeEnabled();
    await page.locator(slider).fill(time);
    await page.waitForTimeout(300);
    await expect(page.locator("canvas").first()).toHaveScreenshot(
      `${pageName}.png`,
      { maxDiffPixelRatio: 0.005, animations: "disabled", timeout: 20000 },
    );
  });
}
