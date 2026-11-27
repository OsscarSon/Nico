import { Fragment, useEffect, useState, type ComponentType } from "react";

export type MathProps = { latex: string; display?: boolean };
let renderer: ComponentType<MathProps> | undefined;
let loading: ReturnType<typeof importRenderer> | undefined;
function importRenderer() {
  return import("./katexRenderer").then(
    (module) => (renderer = module.KatexRenderer),
  );
}

export function MathText({ latex, display = false }: MathProps) {
  const [Render, setRender] = useState(() => renderer);
  useEffect(() => {
    if (Render) return;
    let active = true;
    loading ??= importRenderer();
    loading
      .then((component) => {
        if (active) setRender(() => component);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [Render]);
  const formula = Render ? (
    <Render latex={latex} display={display} />
  ) : (
    <code className="teaching-math-text">{latex}</code>
  );
  return display ? (
    <div
      className="teaching-math-scroll"
      tabIndex={0}
      role="region"
      aria-label="数学公式，可横向滚动"
    >
      {formula}
    </div>
  ) : (
    <span className="teaching-math-inline">{formula}</span>
  );
}

export function RichText({ text }: { text: string }) {
  // Each inline expression is explicitly delimited. Currency and prose stay literal.
  const tokens = text.split(/(?<!\\)\$([^$\r\n]+?)(?<!\\)\$/g);
  return (
    <>
      {tokens.map((token, index) =>
        index % 2 ? (
          <MathText key={index} latex={token} />
        ) : (
          <Fragment key={index}>{token.replace(/\\\$/g, "$")}</Fragment>
        ),
      )}
    </>
  );
}
