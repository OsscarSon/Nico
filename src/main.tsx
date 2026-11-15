import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { applyFontSize, loadFontSize } from "./progress/settings";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";

applyFontSize(loadFontSize());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
