export type FontSize = "normal" | "large";
const KEY = "nico-settings";

export function loadFontSize(): FontSize {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as { font?: string };
    return v.font === "large" ? "large" : "normal";
  } catch {
    return "normal";
  }
}
export function applyFontSize(size: FontSize) {
  document.documentElement.dataset.font = size;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ font: size }));
  } catch {
    /* 忽略 */
  }
}
