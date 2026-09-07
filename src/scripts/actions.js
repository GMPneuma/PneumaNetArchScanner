import { activeGM } from "./templates.js";
import { accessPointTypes, typeInfo, typeImage } from "./types.js";
import { MODULE_ID, TYPES, iconPath } from "./constants.js";
import { apData, architectureColor, blankDiscovery, isAP, mergeDiscovery, pulseProgress } from "./model.js";
import { setting, pulseCount } from "./settings.js";

export function requireGM() {
  if (!game.user?.isGM) throw new Error("Only a GM can manage access points.");
}

export const serverNow = () => Number.isFinite(game.time?.serverTime) ? game.time.serverTime : Date.now();
export function colorFor(uuid, scene = canvas.scene) {
  const local = scene?.flags?.[MODULE_ID]?.unassignedColor;
  if (!uuid && /^#[\da-f]{6}$/i.test(local ?? "")) return local;
  return architectureColor(uuid, setting("netarchColors")?.entries ?? []);
}

export async function saveUnassignedColor(scene, color) {
  requireGM();
  if (scene?.documentName !== "Scene") throw new Error("Choose a scene first.");
  if (!/^#[\da-f]{6}$/i.test(color ?? "")) throw new Error("Choose a valid color.");
  await scene.setFlag(MODULE_ID, "unassignedColor", color);
}

export function architectures() {
  const found = new Map();
  const add = (item) => { if (item.type === "netarch") found.set(item.uuid, item); };
  for (const item of game.items) add(item);
  for (const actor of game.actors) for (const item of actor.items) add(item);
  for (const token of canvas.scene?.tokens ?? []) for (const item of token.actor?.items ?? []) add(item);
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function audienceFor(mode, runner) {
  if (mode === "all") return { public: true, users: [] };
  if (mode !== "runner") throw new Error("Choose a valid audience.");
  if (!runner?.actor || isAP(runner)) throw new Error("Choose the Netrunner token for a private reveal or pulse.");
  const users = game.users.filter((user) => !user.isGM
    && runner.actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)).map((user) => user.id);
  if (!users.length) throw new Error("The selected Netrunner has no player owners. Assign its player ownership first.");
  return { public: false, users };
}

export function makePulse(audience, overrides = {}) {
  return {
    id: foundry.utils.randomID(), started: serverNow(),
    duration: Math.max(400, Math.min(5000, Number(setting("pulseDuration")) * 1000 || 1400)),
    count: pulseCount(), loop: false, audience, ...overrides,
  };
}

function checkedDocuments(documents) {
  requireGM();
  const unique = [...new Map(documents.map((doc) => [doc.uuid, doc])).values()];
  if (!unique.length) throw new Error("Select at least one access point.");
  if (unique.some((doc) => !isAP(doc) || !doc.parent || doc.parent.documentName !== "Scene")) {
    throw new Error("Only placed access point tokens can be managed here.");
  }
  return unique;
}

async function updateGroups(documents, changes) {
  const groups = new Map();
  for (const doc of documents) {
    if (!groups.has(doc.parent)) groups.set(doc.parent, []);
    groups.get(doc.parent).push({ _id: doc.id, hidden: true, ...changes(doc) });
  }
  for (const [scene, updates] of groups) await scene.updateEmbeddedDocuments("Token", updates);
}

export async function revealAPs(documents, { runner = null, audience = "all", pulseAudience = "all", pulse = setting("autoPulse") } = {}) {
  const docs = checkedDocuments(documents);
  const recipients = audienceFor(audience, runner);
  const pulseRecipients = pulse ? audienceFor(pulseAudience, runner) : null;
  await updateGroups(docs, (doc) => ({
    [`flags.${MODULE_ID}.discovery`]: mergeDiscovery(apData(doc).discovery, recipients, runner?.uuid),
    [`flags.${MODULE_ID}.pulse`]: pulse ? makePulse(pulseRecipients) : apData(doc).pulse ?? null,
  }));
  return docs.length;
}

export async function hideAPs(documents) {
  const docs = checkedDocuments(documents);
  await updateGroups(docs, () => ({ [`flags.${MODULE_ID}.discovery`]: blankDiscovery(), [`flags.${MODULE_ID}.pulse`]: null }));
  return docs.length;
}

export async function pulseAPs(documents, { runner = null, audience = "all" } = {}) {
  const docs = checkedDocuments(documents).filter((doc) => apData(doc).discovery?.revealed);
  if (!docs.length) throw new Error("Reveal an access point before pulsing it.");
  const recipients = audienceFor(audience, runner);
  await updateGroups(docs, () => ({ [`flags.${MODULE_ID}.pulse`]: makePulse(recipients) }));
  return docs.length;
}

export async function stopPulses(documents) {
  const docs = checkedDocuments(documents);
  await updateGroups(docs, () => ({ [`flags.${MODULE_ID}.pulse`]: null }));
  return docs.length;
}

export async function saveAP(doc, { name, type, netarch, color }) {
  requireGM();
  if (!isAP(doc)) throw new Error("This token is not an access point.");
  name = String(name ?? "").trim();
  if (!name || name.length > 120) throw new Error("Enter an AP name between 1 and 120 characters.");
  if (!accessPointTypes().some(entry => entry.id === type) && type !== apData(doc).type) throw new Error("Choose a valid access point type.");
  if (netarch && netarch !== apData(doc).netarch) {
    const item = await fromUuid(netarch);
    if (item?.documentName !== "Item" || item.type !== "netarch") throw new Error("Choose an existing NET Architecture.");
  }
  if (netarch && !/^#[\da-f]{6}$/i.test(color ?? "")) throw new Error("Choose a valid Architecture color.");
  const updates = { name, [`flags.${MODULE_ID}.type`]: type, [`flags.${MODULE_ID}.netarch`]: netarch || "" };
  if (type !== apData(doc).type && (accessPointTypes({ includeDisabled: true }).some(entry => entry.img === doc.texture.src) || TYPES.some(entry => iconPath(entry.id) === doc.texture.src))) updates["texture.src"] = typeImage(type);
  await doc.update(updates);
  if (netarch) {
    const entries = (setting("netarchColors")?.entries ?? []).filter((entry) => entry.uuid !== netarch);
    entries.push({ uuid: netarch, color });
    await game.settings.set(MODULE_ID, "netarchColors", { entries });
  }
}

export async function applyAPControls(documents, changes, { runner = null } = {}) {
  const docs = checkedDocuments(documents);
  const { reveal, pulse, showName } = changes;
  if (showName !== undefined && typeof showName !== "boolean") throw new Error("Invalid AP name option.");
  if (reveal !== undefined && !["runner", "all", "hidden"].includes(reveal)) throw new Error("Invalid reveal option.");
  if (pulse !== undefined && !["five", "loop", "off"].includes(pulse)) throw new Error("Invalid pulse option.");
  if (reveal === undefined && pulse === undefined && showName === undefined) return 0;
  const recipients = reveal && reveal !== "hidden" ? audienceFor(reveal, runner) : null;
  const startPulse = pulse === "five" || pulse === "loop";
  if (startPulse && docs.some(doc => reveal === "hidden" || (!reveal && !apData(doc).discovery?.revealed))) {
    throw new Error("Reveal every selected AP before pulsing, or choose a reveal option together with the pulse.");
  }
  const pulseRecipients = startPulse ? audienceFor("all", runner) : null;
  await updateGroups(docs, () => {
    const updates = {};
    if (showName !== undefined) updates[`flags.${MODULE_ID}.showName`] = showName;
    if (reveal !== undefined) updates[`flags.${MODULE_ID}.discovery`] = recipients
      ? mergeDiscovery(blankDiscovery(), recipients, runner?.uuid) : blankDiscovery();
    if (reveal === "hidden" || pulse === "off") updates[`flags.${MODULE_ID}.pulse`] = null;
    else if (startPulse) updates[`flags.${MODULE_ID}.pulse`] = makePulse(pulseRecipients, { loop: pulse === "loop" });
    return updates;
  });
  return docs.length;
}

export async function updateActivePulseSpeed(seconds) {
  if (!game.user.isGM || activeGM()?.id !== game.user.id) return;
  const duration = Math.max(400, Math.min(5000, Number(seconds) * 1000 || 1400));
  const now = serverNow();
  const docs = game.scenes.contents.flatMap(scene => scene.tokens.contents)
    .filter(doc => isAP(doc) && apData(doc).discovery?.revealed && pulseProgress(apData(doc).pulse, now) !== null);
  await updateGroups(docs, doc => {
    const pulse = apData(doc).pulse;
    const completed = (now - pulse.started) / pulse.duration;
    return {
      [`flags.${MODULE_ID}.pulse.duration`]: duration,
      [`flags.${MODULE_ID}.pulse.started`]: now - completed * duration,
    };
  });
}