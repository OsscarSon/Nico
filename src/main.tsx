import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { applyTheme } from "./progress/theme";
import { applyFontSize, loadFontSize } from "./progress/settings";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/academy.css";

applyFontSize(loadFontSize());
applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
