import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { applets } from "../../apps/applets/registry";
const build = JSON.parse(readFileSync("dist/applet-manifest.json", "utf8"));
for (const app of applets.filter((a) => a.kind !== "simulator")) {
  test(`${app.id}: render, dispose and remount`, async ({ page }) => {
    test.skip(
      !build.applets[app.id].available,
      `Local datasets unavailable: ${build.applets[app.id].missing}`,
    );
    const errors: string[] = [],
      requests: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    const query =
      app.id === "flight-replay"
        ? "?recording=flight-replays/trout-lake.json"
        : "";
    await page.goto("/" + app.page + query);
    await expect(page.locator("canvas").first()).toBeVisible();
    await page.waitForTimeout(600);
    const first = await page.locator("canvas").count();
    await page.evaluate(() => (window as any).microaguApplet.dispose());
    expect(
      await page.evaluate(() => (window as any).microaguApplet.resources),
    ).toBe(0);
    await expect(page.locator("canvas")).toHaveCount(
      (readFileSync(app.page, "utf8").match(/<canvas/g) ?? []).length,
    );
    await page.evaluate(async () => {
      await (window as any).microaguApplet.mount();
    });
    await expect(page.locator("canvas")).toHaveCount(first);
    expect(errors).toEqual([]);
    await expect(page.locator("body")).not.toContainText("3D unavailable:");
    expect(
      requests.some((url) => /arduplane|sim_wasm|\/worker-/.test(url)),
    ).toBe(false);
    await page.screenshot({
      path: `test-results/${app.id}.png`,
      fullPage: true,
    });
  });
}
test("simulator starts AUTO, can be disposed and restarted", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/simulator.html");
  await expect(page.locator("#panel")).toBeHidden();
  await expect(page.locator("#status")).toContainText("Inverted setup", {
    timeout: 100000,
  });
  await page.screenshot({ path: "test-results/inverted-launch.png" });
  await expect(page.locator("#status")).toContainText("AUTO confirmed", {
    timeout: 100000,
  });
  await expect(page.locator("#mode-label")).toHaveText("AUTO");
  await expect(page.locator("#launch")).toHaveText("Reset simulation");
  await page.locator("#panel-toggle").click();
  await page.locator("#wind-speed").fill("1.5");
  await page.locator("#apply-wind").click();
  await expect(page.locator("#wind-status")).toContainText("1.5 m/s");
  await page.locator("#panel-toggle").click();
  await page.locator("#mode").selectOption("MANUAL");
  await expect(page.locator("#mode-label")).toHaveText("MANUAL");
  await expect(page.locator("#stick")).toHaveAttribute(
    "data-shape",
    "semicircle",
  );
  const stick = await page.locator("#stick").boundingBox();
  await page.mouse.move(stick!.x + 82, stick!.y + 29);
  await page.mouse.down();
  await page.mouse.move(stick!.x + 82, stick!.y + 81);
  await expect(page.locator("#knob")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 52)",
  );
  await page.mouse.up();
  await page.screenshot({
    path: "test-results/simulator-manual.png",
    fullPage: true,
  });
  await page.locator("#altitude-open").click();
  await expect(page.locator("#altitude-help")).toContainText(
    "switches to CRUISE",
  );
  await page.locator("#altitude-command").fill("45");
  await page.locator("#altitude-form button[type=submit]").click();
  await expect(page.locator("#status")).toContainText(
    "Altitude target 45 m confirmed",
    { timeout: 15000 },
  );
  await expect(page.locator("#mode-label")).toHaveText("CRUISE");
  await expect(page.locator("#stick")).toHaveAttribute("data-shape", "line");
  await expect(page.locator("#alt-target")).toHaveText("TARGET 45 m");
  await page.screenshot({ path: "test-results/simulator.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/simulator-mobile.png",
    fullPage: true,
  });
  const throttle = await page.locator("#throttle").boundingBox();
  expect(throttle!.height).toBeGreaterThan(throttle!.width * 2);
  await page.locator("#launch").click();
  await expect(page.locator("#panel")).toBeHidden();
  await expect(page.locator("#status")).toContainText("AUTO confirmed", {
    timeout: 100000,
  });
  expect(errors).toEqual([]);
});
