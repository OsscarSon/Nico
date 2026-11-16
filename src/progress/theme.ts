export type Theme = "dark" | "light";
export const THEME_KEY = "nico-theme";

export function loadTheme(storage: Pick<Storage, "getItem">): Theme {
  try {
    const value = storage.getItem(THEME_KEY);
    if (value === "dark" || value === "light") return value;
    const old = JSON.parse(storage.getItem("nico-settings") ?? "{}") as { theme?: string };
    if (old.theme === "dark" || old.theme === "light") return old.theme;
  } catch { /* 存储不可用时仍以暗色启动 */ }
  return "dark";
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0e1420" : "#f2f4f7");
  try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* 本次仍可切换 */ }
}
