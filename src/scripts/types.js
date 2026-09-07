import { MODULE_ID, TYPES, iconPath } from "./constants.js";

export function accessPointTypes({ includeDisabled = false } = {}) {
  const saved = globalThis.game?.settings?.get(MODULE_ID, "apTypes");
  const entries = saved?.entries ?? TYPES.map(type => ({ id: type.id, label: type.label, img: iconPath(type.id), enabled: true }));
  return entries.filter(type => includeDisabled || type.enabled !== false).map(type => ({ ...type }));
}
export const typeInfo = id => accessPointTypes({ includeDisabled: true }).find(type => type.id === id);
export const typeImage = id => typeInfo(id)?.img || iconPath("generic");

export function validateTypes(entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error("Keep at least one access point type.");
  const ids = new Set(), names = new Set();
  const normalized = entries.map(entry => {
    const id = String(entry.id ?? ""), label = String(entry.label ?? "").trim(), img = String(entry.img ?? "").trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw new Error("Invalid or duplicate type identifier.");
    if (!label || label.length > 80 || names.has(label.toLowerCase())) throw new Error("Use a unique name of 1–80 characters for each type.");
    if (!img || /^(?:javascript|data):/i.test(img)) throw new Error("Choose an image file for each type.");
    ids.add(id); names.add(label.toLowerCase());
    return { id, label, img, enabled: entry.enabled !== false };
  });
  if (!normalized.some(entry => entry.enabled)) throw new Error("Keep at least one type enabled.");
  return normalized;
}
