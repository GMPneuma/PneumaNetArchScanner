import { MODULE_ID, MODULE_TITLE, SYSTEM_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { ensureTemplates, registerTokenGuards } from "./templates.js";
import { APPresentation } from "./presentation.js";
import { APEditor, openScanner, refreshPanels, registerUI } from "./ui.js";
import { hideAPs, pulseAPs, requireGM, revealAPs, stopPulses } from "./actions.js";
import { installScannerIntegration, registerScannerHooks } from "./scanner.js";

import { APTypeManager } from "./type-manager.js";

const presentation = new APPresentation();
const supported = () => game.system.id === SYSTEM_ID && Number(game.release.generation) === 12;

Hooks.once("init", () => {
  registerSettings(() => { presentation.queueRefresh(); refreshPanels(); });
  game.settings.registerMenu(MODULE_ID, "manageTypes", { name: "Access point types", label: "Manage Types", hint: "Add, rename, disable, and choose artwork for AP types.", icon: "fas fa-list", type: APTypeManager, restricted: true });
  if (!supported()) return;
  registerTokenGuards();
  registerUI();
  presentation.registerHooks();
  registerScannerHooks(openScanner);
  game.modules.get(MODULE_ID).api = Object.freeze({
    openScanner, reveal: revealAPs, hide: hideAPs, pulse: pulseAPs, stopPulses,
    ensureTemplates,
    edit: (tokenDocument) => { requireGM(); return new APEditor(tokenDocument).render(true); },
  });
});

Hooks.once("ready", async () => {
  if (!supported()) {
    ui.notifications.error(`${MODULE_TITLE} requires Foundry v12 and Cyberpunk RED Core.`, { permanent: true });
    return;
  }
  try { await installScannerIntegration(); }
  catch (error) {
    console.error(`${MODULE_ID} | Scanner integration`, error);
    if (game.user.isGM) ui.notifications.warn("Automatic Scanner integration is unavailable. Use the Scanner button in the token toolbar.", { permanent: true });
  }
  try { await ensureTemplates(); }
  catch (error) { console.error(`${MODULE_ID} | AP templates`, error); ui.notifications.error(`AP templates: ${error.message}`); }
  if (canvas.ready) presentation.queueRefresh();
  console.info(`${MODULE_ID} | Ready`);
});
