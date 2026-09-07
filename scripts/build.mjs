import { cp, lstat, mkdir, readFile, realpath, rm } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { check, root } from "./check.mjs";

await check();
const output = resolve(root, "dist", "pneuma-net-arch-scanner");
const dist = resolve(root, "dist");
await mkdir(dist, { recursive: true });
const expectedDist = resolve(await realpath(root), "dist");
assert.equal(await realpath(dist), expectedDist, "Refusing to clean a redirected dist directory.");
let existing;
try { existing = await lstat(output); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (existing) {
  assert.ok(!existing.isSymbolicLink(), "Refusing to clean a linked output directory.");
  assert.equal(await realpath(output), resolve(expectedDist, "pneuma-net-arch-scanner"), "Output must remain inside this project's dist directory.");
  await rm(output, { recursive: true });
}
await mkdir(output, { recursive: true });
await cp(resolve(root, "src"), output, { recursive: true });
await cp(resolve(root, "module.json"), resolve(output, "module.json"));
await cp(resolve(root, "README.md"), resolve(output, "README.md"));
await cp(resolve(root, "CHANGELOG.md"), resolve(output, "CHANGELOG.md"));
await cp(resolve(root, "docs"), resolve(output, "docs"), { recursive: true });
await check(output);
assert.equal(
  await readFile(resolve(output, "module.json"), "utf8"),
  await readFile(resolve(root, "module.json"), "utf8"),
);
console.log(`Built development module: ${output}`);
