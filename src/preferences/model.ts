import { loadTheme } from "../progress/theme";

export const PREFERENCES_KEY = "nico-preferences";
export type Preferences = {
  schemaVersion: 1; theme: "dark" | "light" | "system"; font: "normal" | "large";
  density: "comfortable" | "compact"; motion: "system" | "reduce";
  landing: "/" | "/paths" | "/courses" | "/me"; showPlanned: boolean; resumeHome: boolean;
  nickname: string; learningPath: "" | "a" | "b" | "c" | "d" | "e" | "f" | "m"; showAiLinks: boolean;
};
export const DEFAULT_PREFERENCES: Preferences = { schemaVersion: 1, theme: "dark", font: "normal", density: "comfortable", motion: "system", landing: "/", showPlanned: true, resumeHome: true, nickname: "", learningPath: "", showAiLinks: true };
export function validNickname(value: string): boolean { return [...value.trim()].length <= 24 && !/[\p{Cc}\p{Cf}]/u.test(value); }
const object = (raw: string | null): Record<string, unknown> => {
  try { const x: unknown = JSON.parse(raw ?? "null"); return x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {}; } catch { return {}; }
};
/** Pure, conservative read: no writes, deletion, network, progress migration or unknown future schema interpretation. */
export function readPreferences(storage: Pick<Storage, "getItem">): Preferences {
  try {
    const old = object(storage.getItem("nico-settings"));
    const legacy = { ...DEFAULT_PREFERENCES, theme: loadTheme(storage), font: old.font === "large" ? "large" as const : "normal" as const };
    const p = object(storage.getItem(PREFERENCES_KEY));
    if (p.schemaVersion !== 1 && p.schemaVersion !== 0) return legacy;
    const result = { ...legacy };
    const choices = { theme: ["dark", "light", "system"], font: ["normal", "large"], density: ["comfortable", "compact"], motion: ["system", "reduce"], landing: ["/", "/paths", "/courses", "/me"], learningPath: ["", "a", "b", "c", "d", "e", "f", "m"] };
    for (const key of Object.keys(choices) as (keyof typeof choices)[]) if (typeof p[key] === "string" && choices[key].includes(p[key] as string)) Object.assign(result, { [key]: p[key] });
    for (const key of ["showPlanned", "resumeHome", "showAiLinks"] as const) if (typeof p[key] === "boolean") result[key] = p[key];
    if (typeof p.nickname === "string" && validNickname(p.nickname)) result.nickname = p.nickname.trim();
    return result;
  } catch { return { ...DEFAULT_PREFERENCES }; }
}
export function resolvedTheme(p: Preferences, prefersDark: boolean): "dark" | "light" { return p.theme === "system" ? prefersDark ? "dark" : "light" : p.theme; }
export function isCurrentPreferences(raw: string): boolean {
  const p = object(raw), normalized = readPreferences({ getItem: key => key === PREFERENCES_KEY ? raw : null });
  return p.schemaVersion === 1 && (Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]).every(key => p[key] === normalized[key]);
}
