import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: {
    process: "readonly", console: "readonly", setTimeout: "readonly",
    URL: "readonly", getComputedStyle: "readonly",
    document: "readonly", window: "readonly", localStorage: "readonly",
  } } },
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] } },
);
