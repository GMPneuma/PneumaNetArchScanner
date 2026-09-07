export const MODULE_ID = "pneuma-net-arch-scanner";
export const MODULE_TITLE = "Pneuma's NetArch Scanner";
export const SYSTEM_ID = "cyberpunk-red-core";
export const SCHEMA_VERSION = 1;
export const TYPES = Object.freeze([
  { id: "computer", label: "Computer", icon: "computer.svg" },
  { id: "camera", label: "Camera", icon: "camera.svg" },
  { id: "turret", label: "Turret", icon: "turret.svg" },
  { id: "door", label: "Door Controller", icon: "door.svg" },
  { id: "alarm", label: "Alarm Panel", icon: "alarm.svg" },
  { id: "generic", label: "Generic", icon: "generic.svg" },
]);
export const PALETTE = Object.freeze([
  "#55ddee", "#ffad55", "#c89aff", "#81e69a", "#ff7196", "#f1db62", "#6aaaff",
]);
export const DEFAULT_COLOR = "#ff0000";
export const iconPath = (type) => `modules/${MODULE_ID}/assets/${TYPES.find((t) => t.id === type)?.icon ?? TYPES[0].icon}`;
