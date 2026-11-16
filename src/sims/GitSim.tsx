import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import type { gitSpecSchema } from "../content/schema";
import { evalGoals, newRepo, run, statusOf, type GitGoal, type Repo } from "../grading/git";
import { Feedback } from "../components/ui";
import "../styles/code.css";

type Spec = z.infer<typeof gitSpecSchema>;
type Props = { mode: "free" | "challenge"; spec: Spec; onSolved?: () => void };
type Line = { cmd: string; out: string[]; error: boolean };

const start = (s: Spec) => newRepo(s.files, s.committed);

export function GitSim({ mode, spec, onSolved }: Props) {
  const challenge = mode === "challenge";
  const [repo, setRepo] = useState<Repo>(() => start(spec));
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const fired = useRef(false);
  const logEnd = useRef<HTMLDivElement>(null);

  const goals = (spec.goals ?? []) as GitGoal[];
  const graded = challenge ? evalGoals(repo, goals) : null;
  const solved = Boolean(graded?.ok);

  useEffect(() => {
    if (solved && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [solved, onSolved]);
  useEffect(() => {
    logEnd.current?.scrollIntoView?.({ block: "nearest" });
  }, [lines.length]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cmd = text.trim();
    if (!cmd) return;
    const res = run(repo, cmd);
    setRepo(res.repo);
    setLines((l) => [...l, { cmd, out: res.out, error: res.error }]);
    setText("");
  };
  const reset = () => {
    setRepo(start(spec));
    setLines([]);
    setText("");
  };
  const st = statusOf(repo);
  const branches = Object.keys(repo.branches).sort();

  return (
    <div className="gitsim">
      <div className="git-state" aria-label="仓库现在的样子">
        <div>
          <h4>工作区</h4>
          <ul>
            {Object.keys(repo.work).sort().map((f) => (
              <li key={f} className="mono">
                {f}
                {st.untracked.includes(f) ? <em> 未跟踪</em> : st.modified.includes(f) ? <em> 已修改</em> : null}
              </li>
            ))}
            {Object.keys(repo.work).length === 0 && <li className="muted">空</li>}
          </ul>
        </div>
        <div>
          <h4>暂存区</h4>
          <ul>
            {st.staged.map((f) => <li key={f} className="mono">{f}</li>)}
            {st.staged.length === 0 && <li className="muted">空</li>}
          </ul>
        </div>
        <div>
          <h4>分支与提交</h4>
          <ul>
            {!repo.inited && <li className="muted">还没 git init</li>}
            {repo.inited && branches.length === 0 && <li className="muted">还没有提交</li>}
            {branches.map((b) => (
              <li key={b} className="mono">
                {b === repo.head ? "▶ " : ""}{b} · {repo.commits[repo.branches[b]!]?.message}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="git-term" role="log" aria-live="polite" aria-label="命令输出">
        {lines.length === 0 && <p className="muted">在下面输入命令，按回车运行。（这是模拟，不会动你的电脑。）</p>}
        {lines.map((l, i) => (
          <div key={i}>
            <div className="git-cmd mono">$ {l.cmd}</div>
            {l.out.length > 0 && <pre className={`git-out${l.error ? " err" : ""}`}>{l.out.join("\n")}</pre>}
          </div>
        ))}
        <div ref={logEnd} />
      </div>

      <form className="git-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="git-input">命令</label>
        <span className="mono" aria-hidden="true">$</span>
        <input
          id="git-input"
          className="git-input mono"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="例如 git status"
          disabled={solved}
        />
        <button type="submit" className="btn" disabled={solved}>运行</button>
      </form>
      {(spec.chips?.length ?? 0) > 0 && (
        <div className="git-chips" role="group" aria-label="命令提示">
          {spec.chips!.map((c) => (
            <button key={c} type="button" className="btn ghost mono" onClick={() => setText(c)} disabled={solved}>{c}</button>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: "var(--s2)" }}>
        <button type="button" className="btn ghost" onClick={reset}>重置</button>
      </div>

      {graded && (
        <ul className="checklist" aria-live="polite">
          {graded.results.map((r, i) => (
            <li key={i} data-ok={r.ok}>
              <b aria-hidden="true">{r.ok ? "✓" : "✗"}</b>
              <span><span className="sr-only">{r.ok ? "达成：" : "未达成："}</span>{r.label}</span>
            </li>
          ))}
        </ul>
      )}
      {solved && <Feedback ok>全部目标达成。</Feedback>}
    </div>
  );
}
