import type { ReactNode } from "react";
import "../styles/ai.css";

/** “AI 生成”标签。所有 AI 产出的内容都必须带上它（见 docs/blueprint/04 的诚实规则）。 */
export function AiLabel({ model }: { model?: string }) {
  return (
    <span className="pill ai" title={model ? `由 ${model} 生成` : undefined}>
      AI 生成
    </span>
  );
}

/** 装 AI 产出内容的盒子：带标签，并提醒“可能出错”。 */
export function AiBox({
  title,
  model,
  children,
}: {
  title?: string;
  model?: string;
  children: ReactNode;
}) {
  return (
    <section className="aibox" aria-label={title ?? "AI 生成的内容"}>
      <header>
        {title && <strong>{title}</strong>}
        <AiLabel model={model} />
      </header>
      <div className="aibox-body">{children}</div>
      <p className="muted aibox-note">AI 可能出错。重要的结论，请自己再核对一遍。</p>
    </section>
  );
}
