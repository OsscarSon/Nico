import katex from "katex";

export function renderFormula(latex: string, displayMode = false) {
  try {
    return katex.renderToString(latex, {
      displayMode,
      output: "htmlAndMathml",
      throwOnError: true,
      trust: false,
      maxExpand: 150,
      maxSize: 15,
      strict: (code) => (code === "unicodeTextInMathMode" ? "ignore" : "error"),
    });
  } catch {
    return null;
  }
}
