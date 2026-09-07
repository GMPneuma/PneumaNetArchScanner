import { MODULE_ID } from "./constants.js";
import { apData, canSeeAP, canSeePulse, isAP, pulseProgress, tokenCenter } from "./model.js";
import { colorFor, serverNow } from "./actions.js";
import { setting } from "./settings.js";

/** Client-only presentation. No shared lights, player-owned APs, or global fog changes. */
export class APPresentation {
  constructor() {
    this.container = null;
    this.entries = new Map();
    this.lights = new Map();
    this.pending = false;
    this.tick = this.tick.bind(this);
  }

  queueRefresh() {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      if (!canvas.ready) return;
      this.refresh().catch((error) => console.error(`${MODULE_ID} | AP display`, error));
      canvas.perception.update({ initializeLightSources: true });
    });
  }

  async refresh() {
    if (!canvas.ready || !canvas.interface) return;
    if (!this.container || this.container.destroyed) {
      this.container = canvas.interface.addChild(new PIXI.Container());
      this.container.name = MODULE_ID;
      this.container.eventMode = "none";
      this.container.interactiveChildren = false;
      this.container.zIndex = 1000;
      canvas.app.ticker.add(this.tick);
    }
    const wanted = new Set();
    for (const token of canvas.tokens.placeables) {
      const doc = token.document;
      if (!canvas.scene.tokens.has(doc.id) || !canSeeAP(doc, game.user)) continue;
      wanted.add(doc.id);
      let entry = this.entries.get(doc.id);
      if (!entry) {
        const group = this.container.addChild(new PIXI.Container());
        const pulse = group.addChild(new PIXI.Graphics());
        const sprite = group.addChild(new PIXI.Sprite(PIXI.Texture.EMPTY));
        const label = group.addChild(new PIXI.Text("", { fontFamily: "Signika, sans-serif", fontSize: 14, fill: "#ffffff", stroke: "#111820", strokeThickness: 4, align: "center" }));
        sprite.anchor.set(0.5);
        label.anchor.set(0.5, 0);
        entry = { group, pulse, sprite, label, token, texturePath: null };
        this.entries.set(doc.id, entry);
      }
      entry.token = token;
      if (!game.user.isGM && entry.texturePath !== doc.texture.src) {
        entry.texturePath = doc.texture.src;
        const path = doc.texture.src;
        // Resolve textures without blocking concealment/removal of other APs.
        loadTexture(path).then((texture) => {
          if (this.entries.get(doc.id) !== entry || entry.sprite.destroyed || entry.texturePath !== path) return;
          entry.sprite.texture = texture;
          this.layout(entry);
        }).catch((error) => {
          entry.texturePath = null;
          console.warn(`${MODULE_ID} | Could not load AP artwork`, error);
        });
      }
      this.layout(entry);
    }
    for (const [id, entry] of this.entries) {
      if (wanted.has(id)) continue;
      entry.group.destroy({ children: true });
      this.entries.delete(id);
    }
    this.tick();
  }

  layout(entry) {
    const { token, sprite, label } = entry;
    const doc = token.document;
    const color = Number.parseInt(colorFor(apData(doc).netarch, doc.parent).slice(1), 16);
    const width = token.w || doc.width * canvas.grid.size;
    const height = token.h || doc.height * canvas.grid.size;
    entry.size = Math.max(width, height);
    entry.group.position.set(token.center.x, token.center.y);
    entry.color = color;
    sprite.visible = !game.user.isGM;
    // Native token art remains the editable representation for the GM.
    sprite.width = width * Math.abs(doc.texture.scaleX ?? 1);
    sprite.height = height * Math.abs(doc.texture.scaleY ?? 1);
    sprite.rotation = (doc.rotation ?? 0) * Math.PI / 180;
    sprite.tint = color;
    if (game.user.isGM && token.mesh) {
      token.mesh.tint = color;
      // Hidden tokens are normally faded for the GM. Keep AP strokes opaque;
      // only the SVG background carries its own 25% opacity.
      token.mesh.alpha = 1;
    }
    label.text = doc.name;
    label.style.fontSize = Math.max(10, Math.min(20, canvas.grid.size * 0.13));
    label.position.set(0, height / 2 + 6);
    label.visible = game.user.isGM || Boolean(apData(doc).showName ?? setting("showLabels"));
  }

  tick() {
    const now = serverNow();
    for (const entry of this.entries.values()) {
      const doc = entry.token.document;
      if (!canvas.scene?.tokens.has(doc.id) || !canSeeAP(doc, game.user)) { entry.group.visible = false; continue; }
      entry.group.visible = true;
      entry.group.position.set(entry.token.center.x, entry.token.center.y);
      entry.pulse.clear();
      if (!canSeePulse(doc, game.user, now)) continue;
      const progress = pulseProgress(apData(doc).pulse, now);
      const radius = entry.size * (0.55 + progress * 0.9);
      entry.pulse.lineStyle(3, entry.color, 0.85 * (1 - progress)).drawCircle(0, 0, radius);
    }
  }

  initializeLights() {
    if (!canvas.scene || !canvas.effects) return;
    const wanted = new Set();
    if (setting("revealStyle") === "vision") {
      const radiusUnits = Number(setting("visionRadius"));
      if (Number.isFinite(radiusUnits) && radiusUnits > 0 && canvas.scene.grid.distance > 0) {
        const radius = radiusUnits * canvas.grid.size / canvas.scene.grid.distance;
        for (const token of canvas.tokens.placeables) {
          const doc = token.document;
          if (!canvas.scene.tokens.has(doc.id) || !apData(doc).discovery?.revealed || !canSeeAP(doc, game.user)) continue;
          const id = `${MODULE_ID}.${doc.id}`;
          wanted.add(id);
          let source = this.lights.get(id);
          if (!source) {
            source = new CONFIG.Canvas.lightSourceClass({ sourceId: id });
            this.lights.set(id, source);
          }
          source.initialize({
            ...tokenCenter(doc, canvas.grid.size), elevation: doc.elevation ?? 0,
            bright: radius, dim: radius, radius,
            vision: true, walls: true, angle: 360,
            attenuation: 0, alpha: 0, luminosity: 0.5, disabled: false,
          });
          source.add();
        }
      }
    }
    for (const [id, source] of this.lights) {
      if (wanted.has(id)) continue;
      source.destroy();
      this.lights.delete(id);
    }
  }

  destroy() {
    canvas.app?.ticker.remove(this.tick);
    for (const source of this.lights.values()) source.destroy();
    this.lights.clear();
    this.entries.clear();
    if (this.container && !this.container.destroyed) this.container.destroy({ children: true });
    this.container = null;
  }

  registerHooks() {
    Hooks.on("canvasReady", () => this.queueRefresh());
    Hooks.on("canvasTearDown", () => this.destroy());
    Hooks.on("initializeLightSources", () => this.initializeLights());
    for (const hook of ["createToken", "updateToken", "deleteToken"]) {
      Hooks.on(hook, (doc) => { if (isAP(doc) && doc.parent?.id === canvas.scene?.id) this.queueRefresh(); });
    }
    Hooks.on("refreshToken", (token) => {
      const entry = this.entries.get(token.id);
      if (entry) this.layout(entry);
    });
    Hooks.on("updateUser", () => this.queueRefresh());
    Hooks.on("updateScene", (scene) => { if (scene.id === canvas.scene?.id) this.queueRefresh(); });
  }
}
