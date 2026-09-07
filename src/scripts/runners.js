import { isAP } from "./model.js";

export function isNetrunner(doc) {
  return Boolean(doc?.actor && !isAP(doc) && doc.actor.items?.some(item =>
    item.type === "role" && String(item.name ?? "").trim().toLowerCase() === "netrunner"));
}

export function isPlayerOwned(doc) {
  return Boolean(doc?.actor && game.users.some(user => !user.isGM
    && doc.actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)));
}
