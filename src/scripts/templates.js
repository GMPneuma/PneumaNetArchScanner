import { accessPointTypes, typeImage } from "./types.js";
import { MODULE_ID, MODULE_TITLE, SYSTEM_ID, TYPES, iconPath } from "./constants.js";
import { apData, freshAP, isAP } from "./model.js";

export function activeGM() {
  return game.users.activeGM ?? game.users.filter((user) => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
}

let provisioning;
export async function ensureTemplates() {
  if (!game.user.isGM || activeGM()?.id !== game.user.id) return;
  if (provisioning) return provisioning;
  provisioning = provision().finally(() => { provisioning = null; });
  return provisioning;
}

async function provision() {
  if (!game.documentTypes.Actor.includes("container")) throw new Error("Cyberpunk RED's container Actor type is unavailable.");
  let folder = game.folders.find((entry) => entry.type === "Actor"
    && (entry.getFlag(MODULE_ID, "templates") || (!entry.folder && entry.name === MODULE_TITLE)));
  if (!folder) folder = await Folder.create({ name: MODULE_TITLE, type: "Actor", sorting: "a", flags: { [MODULE_ID]: { templates: true } } });
  const missing = accessPointTypes().filter((type) => !game.actors.some((actor) => actor.getFlag(MODULE_ID, "templateType") === type.id));
  if (!missing.length) return;
  // createDocuments uses the native data model without CPRContainerActor.create's shop defaults.
  await Actor.createDocuments(missing.map((type) => ({
    name: `AP — ${type.label}`, type: "container", folder: folder.id,
    img: typeImage(type.id), system: {}, items: [], ownership: { default: 0 },
    flags: { [MODULE_ID]: { templateType: type.id }, [SYSTEM_ID]: { "container-type": "custom" } },
    prototypeToken: {
      name: type.label, actorLink: false, width: 0.5, height: 0.5,
      texture: { src: typeImage(type.id) }, hidden: true, disposition: 0,
      displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
      bar1: { attribute: null }, bar2: { attribute: null },
      sight: { enabled: false }, light: { bright: 0, dim: 0 },
      flags: { [MODULE_ID]: freshAP(type.id) },
    },
  })));
}

export function registerTokenGuards() {
  Hooks.on("preCreateToken", (doc, _data, _options, userId) => {
    if (userId !== game.user.id) return;
    const templateType = game.actors.get(doc.actorId)?.getFlag(MODULE_ID, "templateType");
    if (!isAP(doc) && !templateType) return;
    const data = apData(doc);
    doc.updateSource({
      hidden: true, actorLink: false,
      sight: { enabled: false }, light: { bright: 0, dim: 0 },
      flags: { [MODULE_ID]: freshAP(data.type ?? templateType, data.netarch) },
    });
  });
  Hooks.on("preUpdateToken", (doc, changes) => {
    if (!isAP(doc)) return;
    // Native tokens stay GM-only. Disclosure is per-client, including after disabling this module.
    changes.hidden = true;
    changes.actorLink = false;
    if (changes.sight) changes.sight.enabled = false;
    if (changes.light) { changes.light.bright = 0; changes.light.dim = 0; }
    changes["sight.enabled"] = false;
    changes["light.bright"] = 0;
    changes["light.dim"] = 0;
  });
}
