import { useSyncExternalStore } from "react";
import { applyTheme } from "../progress/theme";
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, readPreferences, resolvedTheme, validNickname, isCurrentPreferences, type Preferences } from "./model";
let snapshot: Preferences | null = null;
const listeners = new Set<() => void>();
let warning = "";
const storage = () => { try { return window.localStorage; } catch { return { getItem: () => null, setItem: () => { throw Error("storage unavailable"); } }; } };
export const getPreferences = (): Preferences => snapshot ??= readPreferences(storage());
export const preferenceWarning = () => warning;
function apply(p: Preferences) {
  applyTheme(resolvedTheme(p, window.matchMedia("(prefers-color-scheme: dark)").matches));
  Object.assign(document.documentElement.dataset, { font: p.font, density: p.density, motion: p.motion, aiLinks: p.showAiLinks ? "visible" : "hidden" });
}
export function setPreferences(patch: Partial<Omit<Preferences, "schemaVersion">>): void {
  if (patch.nickname !== undefined && !validNickname(patch.nickname)) throw Error("昵称最多24个字符，不能含控制或隐藏格式字符。");
  const next = { ...getPreferences(), ...patch, nickname: (patch.nickname ?? getPreferences().nickname).trim() };
  // Normalize the complete candidate with the same conservative parser used for storage.
  snapshot = readPreferences({ getItem: key => key === PREFERENCES_KEY ? JSON.stringify(next) : null });
  warning = "";
  try {
    const s = storage(), raw = s.getItem(PREFERENCES_KEY);
    if (raw && !isCurrentPreferences(raw)) s.setItem(`${PREFERENCES_KEY}-backup-${Date.now()}`, raw);
    s.setItem(PREFERENCES_KEY, JSON.stringify(snapshot));
    // Preserve compatibility without discarding other legacy fields.
    let old: Record<string, unknown> = {}; try { const v = JSON.parse(s.getItem("nico-settings") ?? "{}"); if (v && typeof v === "object" && !Array.isArray(v)) old = v; } catch { /* new preferences stay independent */ }
    s.setItem("nico-settings", JSON.stringify({ ...old, font: snapshot.font }));
  } catch { warning = "浏览器无法保存偏好，本次已生效；刷新后可能丢失。学习记录未被清除。"; }
  apply(snapshot); listeners.forEach(fn => fn());
}
export function initializePreferences(): () => void {
  apply(getPreferences());
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const change = () => { snapshot = { ...getPreferences() }; apply(snapshot); listeners.forEach(fn => fn()); };
  const crossTab = (event: StorageEvent) => { if (event.key === PREFERENCES_KEY || event.key === null) { snapshot = null; change(); } };
  media.addEventListener("change", change); window.addEventListener("storage", crossTab);
  // Only an unaddressed app visit uses the landing preference; explicit links and browser Back are untouched.
  if (!window.location.hash && getPreferences().landing !== "/") window.history.replaceState(null, "", `#${getPreferences().landing}`);
  return () => { media.removeEventListener("change", change); window.removeEventListener("storage", crossTab); };
}
export const usePreferences = () => useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, getPreferences, () => DEFAULT_PREFERENCES);
