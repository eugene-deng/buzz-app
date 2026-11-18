import { watchPageErrors } from "../../browser/page-errors.mjs";
import { webkit, expect } from "@playwright/test";
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const { errors } = watchPageErrors(page);
await page.goto("http://127.0.0.1:5299/");
await page.getByText("launch-room", { exact: true }).first().click();
await page
  .getByRole("button", { name: "Toast workshop", exact: true })
  .first()
  .click();
const grid = page.getByRole("group", { name: "Toast scenarios" });
const buttons = grid.getByRole("button");
const count = await buttons.count();
const front = page.locator(
  '.toast-sonner-reference [data-sonner-toast][data-front="true"]',
);
const overflows = [];
for (let i = 0; i < count; i++) {
  const name = await buttons.nth(i).innerText();
  await buttons.nth(i).click();
  await expect(front).toBeVisible();
  if (
    await front.evaluate(
      (e) => e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > 500,
    )
  )
    overflows.push(name);
  await page.getByRole("button", { name: "Clear toast", exact: true }).click();
  if (i % 50 === 0) console.log(i + "/" + count);
}
await page
  .getByRole("textbox", { name: "Search toast scenarios" })
  .fill("Huddle");
if ((await buttons.count()) < 3) throw Error("Missing huddle filter results");
await page.getByRole("textbox", { name: "Search toast scenarios" }).fill("");
await page.clock.install();
for (const [name, ms] of [
  ["Conversations · Chat archived: Design review", 3000],
  ["Source notices · Profile updated", 5000],
]) {
  await grid.getByRole("button", { name, exact: true }).click();
  await page.mouse.move(20, 500);
  await page.clock.runFor(ms - 500);
  await expect(front).toBeVisible();
  await page.clock.runFor(1000);
  await expect(front).toHaveCount(0);
}
console.log(JSON.stringify({ count, errors, overflows }));
await browser.close();
if (errors.length || overflows.length) process.exitCode = 1;
