import { useEffect, useRef, useState } from "react";
import type { CodeSpec } from "../../content/schema";
import { checkSource, countLines, gradeChecks, type CheckResult, type RunOutcome } from "../../grading/code";
import { REVEAL_AFTER_WRONG } from "../../grading/quiz";
import { runJs, type JsRunResult } from "../../runtime/js";
import { Feedback } from "../../components/ui";
import { CodeEditor, type EditorApi } from "./CodeEditor";
import "../../styles/code.css";

type Props = { mode: "free" | "challenge"; spec: CodeSpec; onSolved?: () => void };

export function JsSim({ mode, spec, onSolved }: Props) {
  const challenge = mode === "challenge";
  const hasPage = Boolean(spec.page);
  const [code, setCode] = useState(spec.starter);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<JsRunResult | null>(null);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const api = useRef<EditorApi>(null);
  const fired = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    // 先把页面（还没运行任何脚本）显示出来
    if (hasPage) void runJs({ page: spec.page, code: "", container: preview.current });
    return () => {
      alive.current = false;
    };
  }, [hasPage, spec.page]);

  useEffect(() => {
    if ((solved || revealed) && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [solved, revealed, onSolved]);

  const run = async () => {
    setBusy(true);
    setResults(null);
    setNote(null);
    const r = await runJs({ page: spec.page, code, container: hasPage ? preview.current : null });
    if (!alive.current) return;
    setLast(r);
    setBusy(false);
  };

  const check = async () => {
    const checks = spec.checks ?? [];
    setBusy(true);
    setLast(null);
    setNote(null);
    const outcomes: RunOutcome[] = [];
    for (const c of checks) {
      const r = await runJs({ page: spec.page, code, harness: c.harness });
      if (!alive.current) return;
      outcomes.push({ stdout: r.stdout, error: r.error, timedOut: r.timedOut });
      if (r.timedOut) break;
    }
    setBusy(false);
    const graded = gradeChecks(checks, outcomes, countLines(code), (e) => e);
    setResults(graded.results);
    let rule: string | null = null;
    if (graded.ok) {
      try { rule = checkSource(code, spec.requires); } catch { rule = null; }
    }
    setNote(rule);
    if (graded.ok && !rule) setSolved(true);
    else setFailCount((n) => n + 1);
  };

  const reset = () => {
    setCode(spec.starter);
    setLast(null);
    setResults(null);
    setNote(null);
    if (hasPage) void runJs({ page: spec.page, code: "", container: preview.current });
  };

  const canReveal = challenge && !solved && !revealed && failCount >= REVEAL_AFTER_WRONG && Boolean(spec.solution);
  return (
    <div className={`codesim${hasPage ? " web" : ""}`}>
      <CodeEditor value={code} onChange={setCode} language="javascript" label="JavaScript 代码编辑器" apiRef={api} />
      {hasPage && (
        <div>
          <h4>页面</h4>
          <div ref={preview} className="js-preview" />
        </div>
      )}
      <div className="row code-actions">
        <button type="button" className="btn" onClick={run} disabled={busy}>运行</button>
        {challenge && <button type="button" className="btn" onClick={check} disabled={busy || solved}>检查答案</button>}
        <button type="button" className="btn ghost" onClick={() => api.current?.insertIndent()} aria-label="插入 4 个空格的缩进">缩进</button>
        <button type="button" className="btn ghost" onClick={reset} disabled={busy}>重置</button>
      </div>

      {last && (
        <div className="code-out" aria-live="polite">
          <h4>console 输出</h4>
          <pre className="code-output">{last.stdout || (last.error ? "" : "（没有 console 输出）")}</pre>
          {last.truncated && <p className="muted">输出太多，只显示了前面一部分。</p>}
          {last.error && <Feedback ok={false}>{last.error}</Feedback>}
        </div>
      )}
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
          <p><strong>参考答案</strong>（看过答案也可以继续，但建议自己改一遍再运行）：</p>
          <pre><code>{spec.solution}</code></pre>
        </div>
      )}
    </div>
  );
}
