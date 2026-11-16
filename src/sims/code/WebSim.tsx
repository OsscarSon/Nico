import { useEffect, useRef, useState } from "react";
import type { CodeSpec } from "../../content/schema";
import { checkSource } from "../../grading/code";
import { gradeWebChecks, previewDocument, type WebCheckResult, type WebProbe } from "../../grading/web";
import { REVEAL_AFTER_WRONG } from "../../grading/quiz";
import { Feedback } from "../../components/ui";
import { CodeEditor, type EditorApi } from "./CodeEditor";
import "../../styles/code.css";

type Props = { mode: "free" | "challenge"; spec: CodeSpec; onSolved?: () => void };

/**
 * 把学习者的 HTML 放进一个看不见的 iframe 里来判分：
 * sandbox="allow-same-origin" 但没有 allow-scripts，所以他的脚本不会运行；内容安全策略禁止联网。
 * 这样既能数元素，也能读「计算后样式」（颜色、字号、布局）。
 */
async function withProbe<T>(html: string, fn: (probe: WebProbe) => T): Promise<T> {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:600px;border:0;";
  frame.srcdoc = previewDocument(html);
  const loaded = new Promise<void>((res) => frame.addEventListener("load", () => res(), { once: true }));
  document.body.appendChild(frame);
  try {
    await loaded;
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) throw new Error("no document");
    return fn({
      count: (sel) => doc.querySelectorAll(sel).length,
      texts: (sel) => [...doc.querySelectorAll(sel)].map((e) => e.textContent ?? ""),
      styles: (sel, prop) => [...doc.querySelectorAll(sel)].map((e) => win.getComputedStyle(e).getPropertyValue(prop)),
      normalize: (prop, value) => {
        const el = doc.createElement("span");
        // 边框宽度只有在边框样式不是 none 时才有值，所以先给探针一个实线边框
        el.style.setProperty("border-style", "solid");
        el.style.setProperty(prop, value);
        doc.body.appendChild(el);
        const out = win.getComputedStyle(el).getPropertyValue(prop);
        el.remove();
        return out;
      },
    });
  } finally {
    frame.remove();
  }
}

export function WebSim({ mode, spec, onSolved }: Props) {
  const challenge = mode === "challenge";
  const [code, setCode] = useState(spec.starter);
  const [shown, setShown] = useState(spec.starter);
  const [results, setResults] = useState<WebCheckResult[] | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const api = useRef<EditorApi>(null);
  const fired = useRef(false);

  // 输入停下 0.3 秒后再刷新预览，手机上不会一直重绘
  useEffect(() => {
    const t = setTimeout(() => setShown(code), 300);
    return () => clearTimeout(t);
  }, [code]);

  useEffect(() => {
    if ((solved || revealed) && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [solved, revealed, onSolved]);

  const [note, setNote] = useState<string | null>(null);
  const check = async () => {
    let graded: ReturnType<typeof gradeWebChecks>;
    try {
      graded = await withProbe(code, (probe) => gradeWebChecks(spec.webChecks ?? [], probe));
    } catch {
      setResults([{ label: "检查", ok: false, detail: "这次没能完成检查，请再点一次。" }]);
      return;
    }
    setResults(graded.results);
    // 写法规则（例如必须用 <style>）只在结果都对之后才提醒
    let rule: string | null = null;
    if (graded.ok) {
      try { rule = checkSource(code, spec.requires); } catch { rule = null; }
    }
    setNote(rule);
    if (graded.ok && !rule) setSolved(true);
    else setFailCount((n) => n + 1);
  };

  const canReveal = challenge && !solved && !revealed && failCount >= REVEAL_AFTER_WRONG && Boolean(spec.solution);

  return (
    <div className="codesim web">
      <CodeEditor value={code} onChange={setCode} language="html" label="HTML 代码编辑器" apiRef={api} />
      <div className="row code-actions">
        {challenge && (
          <button type="button" className="btn" onClick={check} disabled={solved}>检查答案</button>
        )}
        <button type="button" className="btn ghost" onClick={() => api.current?.insertIndent()} aria-label="插入 4 个空格的缩进">缩进</button>
        <button type="button" className="btn ghost" onClick={() => { setCode(spec.starter); setShown(spec.starter); setResults(null); setNote(null); }}>重置</button>
      </div>
      <h4>预览</h4>
      {/* sandbox="" ：不允许脚本、表单、弹窗和同源访问；CSP 再禁止联网 */}
      <iframe className="web-preview" title="网页预览" sandbox="" srcDoc={previewDocument(shown)} />
      {results && (
        <ul className="checklist" aria-live="polite">
          {results.map((r, i) => (
            <li key={i} data-ok={r.ok}>
              <b aria-hidden="true">{r.ok ? "✓" : "✗"}</b>
              <span>
                <span className="sr-only">{r.ok ? "通过：" : "未通过："}</span>
                {r.label}
                {!r.ok && <em>{r.detail}</em>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {note && <Feedback ok={false}>{note}</Feedback>}
      {solved && <Feedback ok>全部检查通过。</Feedback>}
      {canReveal && (
        <div className="row" style={{ marginTop: "var(--s3)" }}>
          <button type="button" className="btn ghost" onClick={() => setRevealed(true)}>看参考答案</button>
        </div>
      )}
      {revealed && spec.solution && (
        <div className="code-solution">
          <p><strong>参考答案</strong>：</p>
          <pre><code>{spec.solution}</code></pre>
        </div>
      )}
    </div>
  );
}
