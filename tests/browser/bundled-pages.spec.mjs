import { test, expect } from "./source-fixture.mjs";
import { watchPageErrors } from "./page-errors.mjs";
import { readFile } from "node:fs/promises";

async function pageAction(page, article, name) {
  await article.getByRole("button", { name: "Doc actions" }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

async function manual(page, article) {
  await pageAction(page, article, "Revision history");
  await page
    .getByRole("menuitem", { name: "Disable auto-save", exact: true })
    .click();
}

// Browser boundary: plugin composition, native rich editing, mounted live delivery,
// retained view state and responsive layout. Policy permutations live in Vitest.
test("edits and preserves drafts using host UI, then adopts an agent revision without rewriting it", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  await page.goto("/tests/fixtures/bundled-pages.html");
  await expect(
    page.getByRole("link", { name: "Agent outline", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const f = window.workingNotesFixture;
    return f.agentEdit(f.agentPage, "Fresh unopened collection body");
  });
  await page
    .getByRole("searchbox", { name: "Search docs" })
    .fill("Fresh unopened collection body");
  await expect(
    page.getByRole("link", { name: "Agent outline", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search docs" }).click();
  const shared = page.getByRole("link", {
    name: "Shared research",
    exact: true,
  });
  await expect(shared).toHaveCount(0);
  const folder = page.getByRole("button", {
    name: "Shared with me",
    exact: true,
  });
  await folder.focus();
  await folder.press("Enter");
  await expect(
    page.getByRole("button", { name: "Back to docs", exact: true }),
  ).toBeFocused();
  await shared.click();
  await expect(
    page.getByRole("article", { name: "Shared research", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("list", { name: "Shared with me", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(folder).toBeFocused();
  await expect(shared).toHaveCount(0);
  await page.goForward();
  await expect(shared).toBeVisible();
  await page.getByRole("button", { name: "Back to docs", exact: true }).click();
  await expect(folder).toBeFocused();
  await page
    .getByRole("link", { name: "Connected pages plan", exact: true })
    .click();
  const article = page.getByRole("article", {
    name: "Connected pages plan",
    exact: true,
  });
  await manual(page, article);
  const body = article.getByRole("textbox", { name: "Doc body", exact: true });
  const [h1, h2] = await article
    .getByRole("heading", { name: /Connected notes|Supporting research/ })
    .evaluateAll((headings) =>
      headings.map((heading) =>
        Number.parseFloat(getComputedStyle(heading).fontSize),
      ),
    );
  expect(h1 / h2).toBeGreaterThan(1);
  expect(h1 / h2).toBeLessThan(1.3);
  await body.fill("A draft retained while browsing.");
  await page.getByRole("button", { name: "Back to docs", exact: true }).click();
  await page
    .getByRole("link", { name: "Connected pages plan", exact: true })
    .click();
  await expect(body).toHaveText("A draft retained while browsing.");
  await pageAction(page, article, "Markdown source");
  const draftMarkdown = await article
    .getByRole("textbox", { name: "Markdown", exact: true })
    .inputValue();
  await pageAction(page, article, "Formatted text");
  const downloading = page.waitForEvent("download");
  await pageAction(page, article, "Export Markdown");
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("Connected pages plan.md");
  const exported = await readFile(await download.path(), "utf8");
  expect(exported).toContain("Status: Unsaved draft");
  expect(exported.endsWith(`\n\n${draftMarkdown}`)).toBe(true);
  await article.getByRole("button", { name: "Save", exact: true }).click();
  await expect(article.getByRole("status")).toHaveText(/^Saved /);
  await article
    .getByRole("combobox", { name: "Doc mode", exact: true })
    .click();
  await page.getByRole("option", { name: "Editing", exact: true }).click();
  const remote = "# Agent update\n\n- retain spacing\n- no echo\n";
  const saved = await page.evaluate(
    (markdown) =>
      window.workingNotesFixture.agentEdit(
        window.workingNotesFixture.plan,
        markdown,
      ),
    remote,
  );
  await expect(body).toContainText("Agent update");
  await expect(
    body.getByRole("heading", { level: 1, name: "Agent update" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.workingNotesFixture.head(window.workingNotesFixture.plan.id)
            .revision,
      ),
    )
    .toBe(saved.revision);
  expect(saved.message).toBe(`[Connected pages plan](<${saved.link}>)`);
  await pageAction(page, article, "Revision history");
  const currentRevision = page.getByRole("menuitem", {
    name: /Connected pages plan.*Carl.*Current/,
  });
  await expect(currentRevision).toBeVisible();
  const olderRevision = page
    .getByRole("menuitem", { name: /Connected pages plan.*You/ })
    .first();
  await olderRevision.focus();
  await olderRevision.press("Enter");
  const preview = page.getByRole("dialog", { name: "Revision preview" });
  await expect(
    preview.getByRole("region", { name: "Selected revision" }),
  ).toContainText("You ·");
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(
    article.getByRole("button", { name: "Doc actions" }),
  ).toBeFocused();
  await pageAction(page, article, "Markdown source");
  await expect(
    article.getByRole("textbox", { name: "Markdown", exact: true }),
  ).toHaveValue(remote);
  const sourceDraft = `${remote}\nUnsaved source edit.`;
  await article
    .getByRole("textbox", { name: "Markdown", exact: true })
    .fill(sourceDraft);
  await pageAction(page, article, "Formatted text");
  await expect(body).toContainText("Unsaved source edit.");
  await body.evaluate((input) => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  await page.keyboard.type(" Rich edit.");
  await pageAction(page, article, "Markdown source");
  await expect(
    article.getByRole("textbox", { name: "Markdown", exact: true }),
  ).toHaveValue(`${remote}\nUnsaved source edit. Rich edit.`.trimEnd());
  await pageAction(page, article, "Formatted text");
  expect(
    await page.evaluate(
      () =>
        window.workingNotesFixture.head(window.workingNotesFixture.plan.id)
          .revision,
    ),
  ).toBe(saved.revision);
  for (const theme of ["light", "dark"]) {
    for (const width of [1440, 480]) {
      await page.setViewportSize({ width, height: 950 });
      await page.evaluate((theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.fontSize = "20px";
      }, theme);
      await expect(
        article.getByRole("button", { name: "Share doc", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await expect(
        body.getByRole("heading", { level: 1, name: "Agent update" }),
      ).toBeVisible();
      const title = article.getByRole("textbox", { name: "Title" });
      const savedTitle = await title.inputValue();
      const shortHeight = (await title.boundingBox()).height;
      await title.fill(
        "A long title about sharing documents in a conversation ".repeat(4) +
          "Revision".repeat(18),
      );
      expect((await title.boundingBox()).height).toBeGreaterThan(shortHeight);
      expect(
        await title.evaluate(
          (field) =>
            field.scrollHeight <= field.clientHeight + 1 &&
            field.scrollWidth <= field.clientWidth + 1,
        ),
      ).toBe(true);
      await title.fill(savedTitle);
      expect((await title.boundingBox()).height).toBe(shortHeight);
      await pageAction(page, article, "Revision history");
      await expect(currentRevision).toBeInViewport({ ratio: 1 });
      const bounds = await page
        .getByRole("menu", { name: "Revision history" })
        .boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
    }
  }
  expect(errors.unexplained()).toEqual([]);
});

// Browser boundary: the real conversation link dispatcher must retain the
// composer and use the existing addressable panel Back/Forward/Close owner.
test("opens a Page beside the conversation and preserves host history and live edits", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  await page.goto("/tests/fixtures/bundled-pages.html");
  await page.getByRole("button", { name: "Conversation", exact: true }).click();
  const reference = page.getByRole("link", {
    name: "Connected pages plan",
    exact: true,
  });
  await reference.focus();
  await reference.press("Enter");
  const article = page.getByRole("article", {
    name: "Connected pages plan",
    exact: true,
  });
  await expect(article).toBeVisible();
  await expect(page.getByRole("textbox", { name: /message/i })).toBeVisible();
  const remote = "Updated through the agent tool beside the conversation.";
  await page.evaluate(
    (markdown) =>
      window.workingNotesFixture.agentEdit(
        window.workingNotesFixture.plan,
        markdown,
      ),
    remote,
  );
  await expect(
    article.getByRole("textbox", { name: "Doc body", exact: true }),
  ).toHaveText(remote);
  await page.goBack();
  await expect(article).toBeHidden();
  await page.goForward();
  await expect(article).toBeVisible();
  const tab = page.getByRole("tab", {
    name: "Connected pages plan",
    exact: true,
  });
  await tab.click({ button: "middle" });
  await expect(article).toBeHidden();
  await page.goBack();
  await page.goForward();
  await expect(article).toBeHidden();
  await reference.click();
  await expect(article).toBeVisible();
  await tab.click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Open in Docs", exact: true })
    .click();
  const docs = page.getByRole("region", { name: "Doc details" });
  await expect(
    docs.getByRole("article", { name: "Connected pages plan" }),
  ).toBeVisible();
  await page.goBack();
  await expect(tab).toBeVisible();
  await pageAction(page, article, "Open in Docs");
  await expect(
    docs.getByRole("article", { name: "Connected pages plan" }),
  ).toBeVisible();
  expect(errors.unexplained()).toEqual([]);
});
