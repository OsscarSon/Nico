import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { CmHandle, CodeLanguage } from "./cm";

export type EditorApi = { insertIndent(): void; focus(): void };

type Props = {
  value: string;
  onChange: (v: string) => void;
  language: CodeLanguage;
  /** 屏幕阅读器读到的名字 */
  label: string;
  readOnly?: boolean;
  apiRef?: Ref<EditorApi>;
};

/**
 * 代码编辑器：优先用 CodeMirror 6（懒加载）；加载失败或被禁用时，
 * 自动退回普通文本框，功能照样可用（只是没有语法高亮）。
 */
export function CodeEditor({ value, onChange, language, label, readOnly, apiRef }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const cm = useRef<CmHandle | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const [engine, setEngine] = useState<"loading" | "cm" | "fallback">("loading");

  useEffect(() => {
    let cancelled = false;
    let handle: CmHandle | null = null;
    import("./cm")
      .then((m) => {
        if (cancelled || !host.current) return;
        handle = m.createEditor({
          parent: host.current,
          doc: latest.current.value,
          language,
          label,
          readOnly,
          onChange: (v) => latest.current.onChange(v),
        });
        cm.current = handle;
        setEngine("cm");
      })
      .catch(() => {
        if (!cancelled) setEngine("fallback");
      });
    return () => {
      cancelled = true;
      handle?.destroy();
      cm.current = null;
    };
  }, [language, label, readOnly]);

  // 外部改了代码（例如"重置"）：同步进 CodeMirror
  useEffect(() => {
    if (cm.current && cm.current.getDoc() !== value) cm.current.setDoc(value);
  }, [value]);

  useImperativeHandle(
    apiRef,
    () => ({
      insertIndent: () => {
        if (cm.current) return cm.current.insertIndent();
        const el = area.current;
        if (!el) return;
        const { selectionStart: s, selectionEnd: e } = el;
        onChange(value.slice(0, s) + "    " + value.slice(e));
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(s + 4, s + 4);
        });
      },
      focus: () => (cm.current ? cm.current.focus() : area.current?.focus()),
    }),
    [onChange, value],
  );

  const rows = Math.min(16, Math.max(6, value.split("\n").length + 1));
  return (
    <div className="code-editor" data-engine={engine}>
      <div ref={host} className="code-cm" hidden={engine !== "cm"} />
      {engine !== "cm" && (
        <textarea
          ref={area}
          className="code-textarea"
          aria-label={label}
          value={value}
          rows={rows}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
