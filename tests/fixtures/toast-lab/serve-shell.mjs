import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const skill = process.argv[2];
if (!skill)
  throw new Error("Pass the local buzz-plugin-demos skill directory.");
const { startPreview } = await import(
  pathToFileURL(resolve(skill, "scripts/preview.mjs"))
);
const { url } = await startPreview({
  app: process.cwd(),
  plugins: ["./tests/fixtures/toast-lab/plugin"],
  seed: JSON.parse(readFileSync(resolve(skill, "seeds/default.json"), "utf8")),
  seedDir: resolve(skill, "seeds"),
  mocks: "./tests/fixtures/toast-lab/shell-mocks.mjs",
  port: 5299,
});
console.log(url);
