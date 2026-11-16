import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CodeSpec } from "../../content/schema";
import {
  checkSource, countLines, describeError, gradeChecks, programFor,
  type CheckResult, type RunOutcome,
} from "../../grading/code";
import { REVEAL_AFTER_WRONG } from "../../grading/quiz";
import { getPythonRunner, type RunResult } from "../../runtime/python";
import { Feedback } from "../../components/ui";
import { CodeEditor, type EditorApi } from "./CodeEditor";
import "../../styles/code.css";

type Props = { mode: "free" | "challenge"; spec: CodeSpec; onSolved?: () => void };

type View =
  | { kind: "none" }
  | { kind: "run"; result: RunResult; lines: number }
  | { kind: "check"; ok: boolean; results: CheckResult[]; note?: string };

const loadMessage = (err: string) =>
  `Python 没能加载（${err}）。第一次使用需要联网下载约 10 MB 的运行环境，请检查网络后再点一次。`;

export function PythonSim({ mode, spec, onSolved }: Props) {
  const challenge = mode === "challenge";
  const runner = getPythonRunner();
  const status = useSyncExternalStore(runner.subscribe, () => runner.status);
  const running = useSyncExternalStore(runner.subscribe, () => runner.running);

  const [code, setCode] = useState(spec.starter);
  const [input, setInput] = useState("");
  const [view, setView] = useState<View>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const api = useRef<EditorApi>(null);
  const fired = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      runner.stop(); // 离开这一步时停掉还在跑的代码
    };
  }, [runner]);

  useEffect(() => {
    if ((solved || revealed) && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [solved, revealed, onSolved]);

  const run = async () => {
    setBusy(true);
    setView({ kind: "none" });
    const result = await runner.run(code, { stdin: input, echoPrompt: true });
    if (!alive.current) return;
    setView({ kind: "run", result, lines: countLines(code) });
    setBusy(false);
  };

  const check = async () => {
    const checks = spec.checks ?? [];
    setBusy(true);
    setView({ kind: "none" });
    const outcomes: RunOutcome[] = [];
    let loadFailure: string | null = null;
    for (const c of checks) {
      const r = await runner.run(programFor(code, c), { stdin: c.stdin ?? "", echoPrompt: false });
      if (!alive.current) return;
      if (r.loadError) { loadFailure = r.loadError; break; }
      if (r.stopped) break;
      outcomes.push({ stdout: r.stdout, error: r.error, timedOut: r.timedOut });
      if (r.timedOut) break;
    }
    setBusy(false);
    if (loadFailure) {
      setView({ kind: "check", ok: false, results: [], note: loadMessage(loadFailure) });
      return;
    }
    const graded = gradeChecks(checks, outcomes, countLines(code));
    // 源码规则（例如「必须用变量」「必须用 for」）只在输出全对之后才检查：
    // 输出还不对时，学习者更需要看到哪一项没过，而不是一条关于写法的提醒。
    let rule: string | null = null;
    if (graded.ok) {
      try {
        rule = checkSource(code, spec.requires);
      } catch {
        rule = null; // 非法正则属于内容错误，由单元测试拦截；这里不卡住学习者
      }
    }
    if (graded.ok && !rule) {
      setView({ kind: "check", ok: true, results: graded.results });
      setSolved(true);
    } else {
      setView({ kind: "check", ok: false, results: graded.results, note: rule ?? undefined });
      setFailCount((n) => n + 1);
    }
  };

  const reset = () => {
    setCode(spec.starter);
    setView({ kind: "none" });
  };

  const statusText =
    status === "loading" ? "正在加载 Python……首次需要下载约 10 MB，请稍等。" : null;
  const canReveal = challenge && !solved && !revealed && failCount >= REVEAL_AFTER_WRONG && Boolean(spec.solution);

  return (
    <div className="codesim">
      <CodeEditor
        value={code}
        onChange={setCode}
        language="python"
        label="Python 代码编辑器"
        apiRef={api}
      />
      {!challenge && spec.allowInput && (
        <label className="code-input">
          <span>程序输入（每行给一次 input()，可以留空）</span>
          <textarea value={input} rows={2} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        </label>
      )}
      <div className="row code-actions">
        {running ? (
          <button type="button" className="btn secondary" onClick={() => runner.stop()}>停止</button>
        ) : (
          <button type="button" className="btn" onClick={run} disabled={busy}>运行</button>
        )}
        {challenge && (
          <button type="button" className="btn" onClick={check} disabled={busy || solved}>检查答案</button>
        )}
        <button type="button" className="btn ghost" onClick={() => api.current?.insertIndent()} aria-label="插入 4 个空格的缩进">缩进</button>
        <button type="button" className="btn ghost" onClick={reset} disabled={busy}>重置</button>
      </div>
      {statusText && <p className="muted" role="status">{statusText}</p>}

      {view.kind === "run" && <RunOutput result={view.result} lines={view.lines} />}
      {view.kind === "check" && <CheckOutput view={view} />}
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

function RunOutput({ result, lines }: { result: RunResult; lines: number }) {
  if (result.loadError) return <Feedback ok={false}>{loadMessage(result.loadError)}</Feedback>;
  if (result.stopped) return <p className="muted">已停止。</p>;
  return (
    <div className="code-out" aria-live="polite">
      <h4>输出</h4>
      <pre className="code-output">{result.stdout || (result.error || result.timedOut ? "" : "（程序没有输出任何内容）")}</pre>
      {result.truncated && <p className="muted">输出太多，只显示了前面一部分。</p>}
      {result.timedOut && (
        <Feedback ok={false}>运行超过 5 秒，已被停止。检查有没有写出停不下来的循环。</Feedback>
      )}
      {result.error && <Feedback ok={false}>{describeError(result.error, lines)}</Feedback>}
    </div>
  );
}

function CheckOutput({ view }: { view: Extract<View, { kind: "check" }> }) {
  return (
    <div className="code-checks" aria-live="polite">
      {view.note && <Feedback ok={false}>{view.note}</Feedback>}
      {view.results.length > 0 && (
        <ul className="checklist">
          {view.results.map((r, i) => (
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
    </div>
  );
}
