// CodeMirror 6 的封装。只被 CodeEditor 用 import() 懒加载：
// 不进首屏的包，加载失败时 CodeEditor 自动退回普通文本框。
import { EditorView, minimalSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap, lineNumbers } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

export type CodeLanguage = "python" | "html" | "css" | "javascript";

export type CmHandle = {
  getDoc(): string;
  setDoc(text: string): void;
  insertIndent(): void;
  focus(): void;
  destroy(): void;
};

const language = (l: CodeLanguage) =>
  l === "python" ? python() : l === "html" ? html() : l === "css" ? css() : javascript();

const theme = EditorView.theme({
  "&": {
    fontSize: "16px", // 16px 以上，iOS 聚焦时不会自动放大页面
    backgroundColor: "var(--panel)",
    border: "2px solid var(--ink)",
    borderRadius: "var(--r-button)",
  },
  "&.cm-focused": { outline: "3px solid var(--trace)", outlineOffset: "1px" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.55", maxHeight: "360px" },
  ".cm-content": { padding: "8px 0" },
  ".cm-gutters": {
    backgroundColor: "var(--paper)",
    color: "var(--muted)",
    border: "none",
    borderRight: "1px solid var(--grid)",
  },
});

export function createEditor(opts: {
  parent: HTMLElement;
  doc: string;
  language: CodeLanguage;
  label: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}): CmHandle {
  const view = new EditorView({
    parent: opts.parent,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        minimalSetup,
        lineNumbers(),
        EditorView.lineWrapping,
        keymap.of([indentWithTab]),
        language(opts.language),
        theme,
        EditorView.contentAttributes.of({
          "aria-label": opts.label,
          autocapitalize: "off",
          autocorrect: "off",
          spellcheck: "false",
        }),
        EditorState.readOnly.of(Boolean(opts.readOnly)),
        EditorView.editable.of(!opts.readOnly),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange(u.state.doc.toString());
        }),
      ],
    }),
  });
  return {
    getDoc: () => view.state.doc.toString(),
    setDoc: (text) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    insertIndent: () => {
      view.dispatch(view.state.replaceSelection("    "));
      view.focus();
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
