import { webkit, expect } from "@playwright/test";
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:5299/");
await page.getByText("launch-room", { exact: true }).first().click();
await page
  .getByRole("button", { name: "Toast workshop", exact: true })
  .first()
  .click();
await expect(page.getByLabel("Sonner stack · Buzz styles")).toBeChecked();
const grid = page.getByRole("group", { name: "Toast scenarios" });

await expect(grid.getByRole("button")).toHaveCount(248);
for (const name of [
  "Copy · channel link",
  "Copy · message link",
  "Copy · forwarded link",
  "Copy · community URL",
  "Copy · identity",
  "Save · attachment",
  "Save · API key",
  "App update · ready to install",
  "App update · check for updates",
  "App update · checking",
  "App update · preparing",
  "App update · installing",
  "App update · up to date",
  "App update · manual download",
]) {
  await grid.getByRole("button", { name, exact: true }).click();
  const front = page.locator(
    '.toast-sonner-reference [data-sonner-toast][data-front="true"]',
  );
  await expect(front).toBeVisible();
  if (name === "Copy · channel link") {
    await expect(front).toContainText("Link copied");
    await expect(front.locator(".buzz-button")).toHaveCount(0);
  }
  if (name === "App update · ready to install")
    await expect(
      front.getByRole("button", { name: "Update now" }),
    ).toBeVisible();
  await page.getByRole("button", { name: "Clear toast", exact: true }).click();
}
console.log(
  "36 grid entries; 14 copy/save and additional updater scenarios rendered",
);
await browser.close();
