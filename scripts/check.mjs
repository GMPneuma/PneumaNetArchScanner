import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { TYPES } from "../src/scripts/constants.js";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function check(contentRoot = resolve(root, "src")) {
  const manifest = JSON.parse(await readFile(resolve(root, "module.json"), "utf8"));
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  assert.equal(manifest.id, "pneuma-net-arch-scanner");
  assert.equal(manifest.id, pkg.name);
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.compatibility.minimum, "12");
  assert.equal(manifest.compatibility.maximum, "12");
  assert.ok(manifest.title && manifest.description);
  assert.ok(manifest.relationships.systems.some(({ id }) => id === "cyberpunk-red-core"));
  assert.ok(manifest.esmodules.length > 0);
  assert.ok(manifest.relationships.requires.some(({ id }) => id === "lib-wrapper"));

  const assets = [
    ...manifest.esmodules,
    ...(manifest.styles ?? []),
    ...(manifest.languages ?? []).map(({ path }) => path),
    "templates/ap-editor.hbs", "templates/scanner.hbs", "templates/type-manager.hbs",
    ...TYPES.map(({ icon }) => `assets/${icon}`),
  ];
  for (const asset of assets) {
    const path = resolve(contentRoot, asset);
    const local = relative(contentRoot, path);
    assert.ok(!isAbsolute(asset) && local !== ".." && !local.startsWith("..") && !isAbsolute(local),
      `Asset must stay inside module: ${asset}`);
    assert.ok((await stat(path)).isFile(), `Missing asset: ${asset}`);
  }

  async function checkTree(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await checkTree(path);
      else if (/\.(mjs|js)$/.test(entry.name)) {
        execFileSync(process.execPath, ["--check", path], { stdio: "inherit" });
        const source = await readFile(path, "utf8");
        for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?["'](\.[^"']+)["']/g)) {
          assert.ok((await stat(resolve(dirname(path), match[1]))).isFile(), `Missing relative import: ${match[1]}`);
        }
      }
      else if (entry.name.endsWith(".json")) JSON.parse(await readFile(path, "utf8"));
    }
  }
  await checkTree(contentRoot);
  await checkTree(resolve(root, "scripts"));
  console.log("Manifest, asset references, JSON, and JavaScript syntax checks passed.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await check();
