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

await page.clock.install();
const cards = page.locator(".toast-sonner-reference [data-sonner-toast]");
await grid
  .getByRole("button", { name: "Copy · channel link", exact: true })
  .click();
await expect(cards).toHaveCount(1);
await expect(cards.locator("[data-close-button]")).toHaveCSS("opacity", "0");
await page.clock.runFor(4500);
await expect(cards).toHaveCount(0);
await grid
  .getByRole("button", { name: "Agent · completed", exact: true })
  .click();
await expect(cards).toHaveCount(1);
await page.clock.runFor(4500);
await expect(cards).toHaveCount(1);
await cards.hover();
await expect(cards.locator("[data-close-button]")).toHaveCSS("opacity", "1");
await page.clock.runFor(9000);
await expect(cards).toHaveCount(1);
await page.mouse.move(20, 500);
await page.clock.runFor(4500);
await expect(cards).toHaveCount(0);
await grid
  .getByRole("button", { name: "Connection · recovery", exact: true })
  .click();
await page.clock.runFor(15000);
await expect(cards).toHaveCount(1);
await cards.hover();
await cards.locator("[data-close-button]").click();
await expect(cards).toHaveCount(0);
console.log(
  "4s feedback, 8s action, hover pause/resume, persistent notice, hover X passed",
);
await browser.close();
