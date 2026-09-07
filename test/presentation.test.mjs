import test from "node:test";
import assert from "node:assert/strict";
import { APPresentation } from "../src/scripts/presentation.js";
import { apData } from "../src/scripts/model.js";
import { environment, makeScene, makeToken } from "./helpers.mjs";

function renderingEnvironment() {
  const env = environment(); makeScene();
  const tickers = new Set();
  class Display {
    constructor(texture) { this.children = []; this.position = { set: (x, y) => { this.x = x; this.y = y; } }; this.anchor = { set: () => {} }; this.texture = texture; this.visible = true; this.lines = []; }
    addChild(child) { this.children.push(child); return child; }
    clear() { this.lines = []; return this; }
    lineStyle(...args) { this.lines.push(args); return this; }
    drawCircle(...args) { this.circle = args; return this; }
    drawRoundedRect() { return this; }
    destroy() { this.destroyed = true; for (const child of this.children) child.destroy(); }
  }
  class Text extends Display { constructor(text, style) { super(); this.text = text; this.style = style; } }
  globalThis.PIXI = { Container: Display, Graphics: Display, Sprite: Display, Text, Texture: { EMPTY: {} } };
  globalThis.loadTexture = async (path) => ({ path });
  canvas.interface = new Display();
  canvas.effects = { lightSources: new Map() };
  canvas.app = { ticker: { add: (fn) => tickers.add(fn), remove: (fn) => tickers.delete(fn) } };
  canvas.perception = { update: () => {} };
  globalThis.CONFIG = { Canvas: { lightSourceClass: class {
    constructor({ sourceId }) { this.sourceId = sourceId; }
    initialize(data) { this.data = data; return this; }
    add() { canvas.effects.lightSources.set(this.sourceId, this); }
    destroy() { this.destroyed = true; canvas.effects.lightSources.delete(this.sourceId); }
  } } };
  return { ...env, tickers };
}

test("private circles create only local permitted light sources with the correct radius", () => {
  const { values, player, other } = renderingEnvironment(); values.set("revealStyle", "vision");
  const ap = makeToken(canvas.scene);
  apData(ap).discovery = { revealed: true, public: false, users: [player.id] };
  const display = new APPresentation();
  game.user = other; display.initializeLights(); assert.equal(canvas.effects.lightSources.size, 0);
  game.user = player; display.initializeLights(); assert.equal(canvas.effects.lightSources.size, 1);
  const source = [...display.lights.values()][0];
  assert.equal(source.data.radius, 25); // 0.5 m, 2 m grid, 100 px square.
  assert.equal(source.data.vision, true);
  assert.equal(source.data.walls, true);
  assert.equal(canvas.scene.updates.length, 0);
  game.user = other; display.initializeLights(); assert.equal(canvas.effects.lightSources.size, 0);
  assert.equal(source.destroyed, true);
});
test("switching to above-fog mode destroys circle sources", () => {
  const { values } = renderingEnvironment(); values.set("revealStyle", "vision");
  const ap = makeToken(canvas.scene); apData(ap).discovery = { revealed: true, public: true };
  const display = new APPresentation(); display.initializeLights();
  assert.equal(display.lights.size, 1);
  values.set("revealStyle", "fog"); display.initializeLights(); assert.equal(display.lights.size, 0);
});
test("unknown or invalid vision radius never produces an unbounded light", () => {
  const { values } = renderingEnvironment(); values.set("revealStyle", "vision");
  const ap = makeToken(canvas.scene); apData(ap).discovery = { revealed: true, public: true };
  const display = new APPresentation();
  for (const radius of [-1, 0, Infinity, NaN]) { values.set("visionRadius", radius); display.initializeLights(); assert.equal(display.lights.size, 0); }
});
test("private artwork never gets created for an unrelated player", async () => {
  const { player, other } = renderingEnvironment(); const ap = makeToken(canvas.scene);
  apData(ap).discovery = { revealed: true, public: false, users: [player.id] };
  const display = new APPresentation();
  game.user = other; await display.refresh(); assert.equal(display.entries.size, 0);
  game.user = player; await display.refresh(); await Promise.resolve(); assert.equal(display.entries.size, 1);
  const entry = display.entries.get(ap.id);
  assert.equal(entry.sprite.visible, true);
  assert.equal(entry.sprite.width, 50);
  assert.equal(entry.sprite.texture.path, ap.texture.src);
});
test("hiding an AP removes both its art and vision source", async () => {
  const { player, values } = renderingEnvironment(); values.set("revealStyle", "vision");
  const ap = makeToken(canvas.scene); apData(ap).discovery = { revealed: true, public: true };
  game.user = player;
  const display = new APPresentation(); await display.refresh(); display.initializeLights();
  const entry = display.entries.get(ap.id); apData(ap).discovery.revealed = false;
  display.tick(); assert.equal(entry.group.visible, false);
  await display.refresh(); display.initializeLights();
  assert.equal(display.entries.size, 0); assert.equal(display.lights.size, 0);
});
test("late texture loads cannot revive a deleted or concealed AP", async () => {
  const { player } = renderingEnvironment(); const ap = makeToken(canvas.scene);
  apData(ap).discovery = { revealed: true, public: true }; game.user = player;
  let finish; globalThis.loadTexture = () => new Promise((resolve) => { finish = resolve; });
  const display = new APPresentation(); await display.refresh();
  apData(ap).discovery.revealed = false; await display.refresh();
  finish({ path: "old" }); await Promise.resolve();
  assert.equal(display.entries.size, 0);
});
test("scene teardown removes ticker callbacks and all local sources", async () => {
  const { values, tickers } = renderingEnvironment(); values.set("revealStyle", "vision");
  const ap = makeToken(canvas.scene); apData(ap).discovery = { revealed: true, public: true };
  const display = new APPresentation(); await display.refresh(); display.initializeLights();
  assert.equal(tickers.size, 1); display.destroy();
  assert.equal(tickers.size, 0); assert.equal(display.entries.size, 0); assert.equal(display.lights.size, 0);
});
