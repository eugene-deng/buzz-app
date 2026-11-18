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
for (const name of ["Agent · completed", "Agent · error", "Feedback · undo"]) {
  const b = grid.getByRole("button", { name, exact: true });
  await b.click();
}
const stack = page.locator(".toast-sonner-reference");
const front = stack.locator('[data-sonner-toast][data-front="true"]');
await front.hover();
await expect(front).toHaveAttribute("data-expanded", "true");
console.log(
  await front.evaluate((el) => ({
    radius: getComputedStyle(el).borderRadius,
    title: getComputedStyle(el.querySelector("[data-title]")).fontSize,
    button: el.querySelector(".buzz-button")?.outerHTML,
    count: el.parentElement.querySelectorAll("[data-sonner-toast]").length,
  })),
);
await expect(stack.locator("[data-sonner-toast]")).toHaveCount(3);
await front.locator(".buzz-button").click();
await expect(stack.locator("[data-sonner-toast]")).toHaveCount(2);
await browser.close();
