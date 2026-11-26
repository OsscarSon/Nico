import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { initializePreferences } from "./preferences/store";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/academy.css";
import "./styles/p2.css";
import "./styles/p2-final.css";
import "./styles/academy2.css";

initializePreferences();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
