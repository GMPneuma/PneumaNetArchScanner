import { ensureTemplates } from "./templates.js";
import { MODULE_ID } from "./constants.js";

export const setting = (key) => game.settings.get(MODULE_ID, key);

export function pulseCount() {
  const count = Number(setting("pulseCount"));
  return Number.isFinite(count) ? Math.max(1, Math.min(20, Math.floor(count))) : 5;
}
export const pulseLabel = () => { const count = pulseCount(); return `Pulse ${count} ${count === 1 ? "time" : "times"}`; };

export function registerSettings(onChange) {
  const register = (key, data) => game.settings.register(MODULE_ID, key, {
    scope: "world", config: true, onChange, ...data,
  });
  register("apTypes", { config: false, type: Object, default: {} });
  Hooks.on("renderSettingsConfig", (_app, html) => groupRevealSettings(html));
  register("revealStyle", {
    name: "AP reveal style", hint: "Show AP artwork over fog, or also provide a small circle of vision around it.",
    type: String, default: "fog", choices: { fog: "Above fog of war", vision: "Small vision circle" },
  });
  register("visionRadius", {
    name: "Vision-circle radius", hint: "Measured in the scene's distance units. A value of 0.5 means half a meter on meter-based maps.",
    type: Number, default: 0.5, range: { min: 0.1, max: 10, step: 0.1 },
  });
  register("scannerRadius", {
    name: "Default Scanner selection radius", hint: "A GM selection filter, not a rules limit. Zero lists every AP. Adjustable in the Scanner window.",
    type: Number, default: 0,
  });
  // Use the former preference as the default until the positive option is saved.
  register("hideRevealAll", { config: false, type: Boolean, default: false });
  register("showRevealAll", { name: "Show 'Reveal to all' option", hint: "Show the Reveal to all column and bulk checkbox in the Scanner window. Existing discoveries are unchanged.", type: Boolean, default: !setting("hideRevealAll") });
  register("autoPulse", { name: "Pulse when revealing an AP", type: Boolean, default: true });
  register("pulseCount", { name: "Number of pulses", hint: "Used by finite pulses and the Scanner checkbox labels. Looping is selected in the AP list.", type: Number, default: 5, range: { min: 1, max: 20, step: 1 } });
  register("pulseDuration", { name: "Seconds per pulse", hint: "Lower values pulse faster. Saving updates running pulses as well as new pulses.", onChange: async value => { try { const { updateActivePulseSpeed } = await import("./actions.js"); await updateActivePulseSpeed(value); } catch (error) { ui.notifications.error(error.message); } finally { onChange?.(); } }, type: Number, default: 1.4, range: { min: 0.4, max: 5, step: 0.1 } });
  // Retained only as the fallback for APs created before per-token name controls.
  register("showLabels", { config: false, type: Boolean, default: true });
  register("autoScanner", { name: "Open GM controls after a Scanner roll", type: Boolean, default: true });
  register("netarchColors", { config: false, type: Object, default: { entries: [] } });
}

export function groupRevealSettings(html) {
  const root = html[0] ?? html;
  const style = root.querySelector(`[name="${MODULE_ID}.revealStyle"]`);
  const radius = root.querySelector(`[name="${MODULE_ID}.visionRadius"]`);
  if (!style || !radius || style.closest(".pneuma-ap-reveal-settings")) return;
  const styleRow = style.closest(".form-group"), radiusRow = radius.closest(".form-group");
  if (!styleRow || !radiusRow) return;
  const group = document.createElement("fieldset");
  group.className = "pneuma-ap-reveal-settings";
  const legend = document.createElement("legend");
  legend.textContent = "Access point visibility";
  group.append(legend);
  styleRow.before(group);
  group.append(styleRow, radiusRow);
  if (game.user.isGM) {
    const row = document.createElement("div");
    row.className = "form-group";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Re-create default AP templates";
    button.title = "Create missing default templates. Existing templates are found in any Actor folder and are preserved.";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const count = await ensureTemplates({ defaults: true, manual: true });
        ui.notifications.info(count ? `Created ${count} missing AP templates.` : "All default AP templates already exist.");
      } catch (error) { ui.notifications.error(error.message); }
      finally { button.disabled = false; }
    });
    row.append(button);
    group.after(row);
  }
  const sync = () => {
    const disabled = style.value !== "vision";
    radiusRow.querySelectorAll("input").forEach(input => { input.disabled = disabled; });
    radiusRow.classList.toggle("ap-radius-disabled", disabled);
  };
  style.addEventListener("change", sync);
  sync();
}