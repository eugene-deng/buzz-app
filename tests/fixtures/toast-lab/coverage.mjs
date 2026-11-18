import { webkit } from "@playwright/test";
import fs from "node:fs";
const browser = await webkit.launch();
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5299/");
const samples = await page.evaluate(
  async () => (await import("/tests/fixtures/toast-lab/catalog.ts")).samples,
);
await browser.close();
const inv = JSON.parse(
  fs.readFileSync(new URL("./inventory.json", import.meta.url)),
);
const aliases = {
  "app/CommunityDepartureSettings.tsx": ["features/communities/departure.ts"],
  "features/communities/CommunityPicker.tsx": [
    "features/communities/departure.ts",
  ],
  "bundled/agent-activity/ActivityAccessory.tsx": [
    "features/messages/ActivityGroupActions.tsx",
  ],
  "features/messages/MediaActionAnnouncements.tsx": [
    "features/messages/MediaContextMenu.tsx",
  ],
  "features/messages/MediaDownloadAction.tsx": [
    "features/messages/MediaContextMenu.tsx",
  ],
  "features/messages/BackgroundUploadStatus.tsx": [
    "features/messages/background-upload.ts",
  ],
  "features/channel-navigation/ChannelNavigationState.tsx": [
    "bundled/channels/ChannelLifecycleDialog.tsx",
  ],
};
const missing = [];
const rows = inv.entries.map((e) => {
  const file = e.file.replace(/^src\//, "");
  const paths = [file, ...(aliases[file] ?? [])];
  const names = samples
    .filter((s) => paths.includes(s.file))
    .map((s) => s.name);
  if (!names.length) missing.push(file + ":" + e.line);
  return { file: e.file, line: e.line, kind: e.kind, examples: names };
});
fs.writeFileSync(
  new URL("./coverage.json", import.meta.url),
  JSON.stringify(
    {
      commit: inv.commit,
      scope:
        "Desktop src toast call sites; per-source family coverage, not proof of every runtime string or every branch.",
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    samples: samples.length,
    sites: rows.length,
    files: new Set(rows.map((x) => x.file)).size,
    missing,
  }),
);
