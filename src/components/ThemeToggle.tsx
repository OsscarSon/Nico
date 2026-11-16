import { useState } from "react";
import { applyTheme, type Theme } from "../progress/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const target = theme === "dark" ? "light" : "dark";
  return <button className="theme-toggle" type="button" aria-label={`切换到${target === "light" ? "亮色" : "暗色"}主题`} onClick={() => { applyTheme(target); setTheme(target); }}>{theme === "dark" ? "亮色模式" : "暗色模式"}</button>;
}
