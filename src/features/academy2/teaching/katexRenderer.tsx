import { useMemo } from "react";
import "katex/dist/katex.min.css";
import type { MathProps } from "./math";
import { renderFormula } from "./renderFormula";

export function KatexRenderer({ latex, display }: MathProps) {
  const html = useMemo(() => renderFormula(latex, display), [latex, display]);
  // HTML is produced exclusively by KaTeX, with trusted commands disabled.
  return html ? (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <code className="teaching-math-text" data-math-fallback>
      {latex}
    </code>
  );
}
