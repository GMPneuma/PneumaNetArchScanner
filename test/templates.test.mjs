import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID } from "../src/scripts/constants.js";
import { apData } from "../src/scripts/model.js";
import { ensureTemplates, registerTokenGuards } from "../src/scripts/templates.js";
import { environment, makeScene, makeToken } from "./helpers.mjs";

test("six private templates are created once without overwriting GM edits", async () => {
  environment();
  await ensureTemplates();
  assert.equal(game.folders.size, 1);
  assert.equal(game.actors.size, 6);
  const computer = game.actors.find((actor) => actor.flags[MODULE_ID].templateType === "computer");
  assert.equal(computer.type, "container");
  assert.equal(computer.ownership.default, 0);
  assert.equal(computer.prototypeToken.hidden, true);
  assert.equal(computer.prototypeToken.actorLink, false);
  const generic = game.actors.find(actor => actor.flags[MODULE_ID].templateType === "generic");
  assert.ok(generic.prototypeToken.texture.src.endsWith("/generic.svg"));
  computer.name = "GM custom terminal";
  await ensureTemplates();
  assert.equal(game.actors.size, 6);
  assert.equal(computer.name, "GM custom terminal");
});
test("only the active GM provisions Actors, and simultaneous requests share work", async () => {
  const { player } = environment();
  game.user = player; await ensureTemplates(); assert.equal(game.actors.size, 0);
  game.user = game.users.get("gm");
  await Promise.all([ensureTemplates(), ensureTemplates()]);
  assert.equal(game.actors.size, 6);
});
test("dropping or copying APs resets discovery and pulse while retaining their Architecture", async () => {
  environment(); registerTokenGuards(); const scene = makeScene(), doc = makeToken(scene);
  game.actors.get(doc.actorId).getFlag = () => "computer";
  apData(doc).netarch = "Item.arch";
  apData(doc).discovery = { revealed: true, public: true, users: [] };
  apData(doc).pulse = { loop: true };
  doc.hidden = false;
  await Hooks.call("preCreateToken", doc, {}, {}, game.user.id);
  assert.equal(doc.hidden, true);
  assert.equal(apData(doc).discovery.revealed, false);
  assert.equal(apData(doc).pulse, null);
  assert.equal(apData(doc).netarch, "Item.arch");
});
test("native updates cannot turn an AP into a shared vision source", async () => {
  environment(); registerTokenGuards(); const scene = makeScene(), ap = makeToken(scene);
  await ap.update({ hidden: false, actorLink: true, "sight.enabled": true, "light.bright": 20, "light.dim": 30 });
  assert.equal(ap.hidden, true);
  assert.equal(ap.actorLink, false);
  assert.equal(ap.sight.enabled, false);
  assert.equal(ap.light.bright, 0);
  assert.equal(ap.light.dim, 0);
});
test("ordinary tokens retain their native hidden and light settings", async () => {
  environment(); registerTokenGuards(); const scene = makeScene(), runner = makeToken(scene, "runner", { ap: false });
  await runner.update({ hidden: false, "light.bright": 20 });
  assert.equal(runner.hidden, false);
  assert.equal(runner.light.bright, 20);
});
test("nested native configuration updates also keep AP lights and vision disabled", async () => {
  environment(); registerTokenGuards(); const scene = makeScene(), ap = makeToken(scene);
  await ap.update({ light: { bright: 10, dim: 20 }, sight: { enabled: true } });
  assert.equal(ap.sight.enabled, false); assert.equal(ap.light.bright, 0); assert.equal(ap.light.dim, 0);
});
