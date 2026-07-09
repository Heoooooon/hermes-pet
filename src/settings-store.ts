// Pet settings, shared between the pet windows and the settings panel.
// Persisted in localStorage (all windows share the same origin) and
// broadcast live over the Tauri event bus.
import { emit } from "@tauri-apps/api/event";

export type PetSettings = {
  size: number; // pet scale, 1 = 100%
  speed: number; // walk speed multiplier
  activity: number; // how often she does something (higher = busier)
  stunts: number; // rocket/jet frequency multiplier
  crossMonitors: boolean; // roam across adjacent displays
  ipadHandoff: boolean; // hand off to the iPad via Lanbeam
};

export const DEFAULTS: PetSettings = {
  size: 1,
  speed: 1,
  activity: 1,
  stunts: 1,
  crossMonitors: true,
  ipadHandoff: true,
};

const KEY = "aipet-settings";
export const SETTINGS_EVENT = "settings-changed";

export function loadSettings(): PetSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(s: PetSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  await emit(SETTINGS_EVENT, s);
}
