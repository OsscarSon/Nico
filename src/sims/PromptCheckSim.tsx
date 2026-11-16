import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENTS, type ElementId } from "../ai/elements";
import { Feedback } from "../components/ui";
import { challengeFeedback, scorePrompt } from "../grading/promptScore";
import { ReportView } from "../features/prompt-lab/PromptReport";
import { REVEAL_AFTER_WRONG } from "../grading/quiz";
import "../styles/ai.css";

type Props = {
  mode: "free" | "challenge";
  scenario?: string;
  required?: ElementId[];
  /** 参考写法：规则检查可能漏判，答错几次后允许查看并继续 */
  sample?: string;
  onSolved?: () => void;
};

/** 写一条指令，用本地规则检查六要素。不联网，不用 AI。 */
export function PromptCheckSim({ mode, scenario, required = [], sample, onSolved }: Props) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const fired = useRef(false);

  const live = useMemo(() => scorePrompt(text), [text]);
  const attempt = useMemo(() => (checked === null ? null : scorePrompt(checked)), [checked]);
  const result = attempt ? challengeFeedback(attempt, required) : null;
  const solved = Boolean(result?.ok) || revealed;

  useEffect(() => {
    if (mode === "challenge" && solved && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [mode, solved, onSolved]);

  const check = () => {
    const r = challengeFeedback(scorePrompt(text), required);
    setChecked(text);
    if (!r.ok) setFails((n) => n + 1);
  };

  return (
    <div className="pc-sim">
      {scenario && <p className="scenario"><strong>场景：</strong>{scenario}</p>}
      <label htmlFor="pc-text" className="pl-label">
        {mode === "challenge" ? "写出你的指令" : "随便写一条给 AI 的指令"}
      </label>
      <textarea
        id="pc-text"
        className="pl-text"
        rows={6}
        value={text}
        disabled={solved && mode === "challenge"}
        onChange={(e) => setText(e.target.value)}
        placeholder="例如：你是一位……请帮我……"
      />
      {mode === "free" ? (
        text.trim() === "" ? (
          <p className="muted">写点什么，这里会显示六个要素有没有写到。</p>
        ) : (
          <ReportView report={live} />
        )
      ) : (
        <>
          <p className="muted">这一关要求写到：{required.length ? required.map((id) => ELEMENTS[id].name).join("、") : "—"}。</p>
          {!solved && (
            <div className="row">
              <button type="button" className="btn" disabled={text.trim() === ""} onClick={check}>检查指令</button>
              {fails >= REVEAL_AFTER_WRONG && sample && (
                <button type="button" className="btn ghost" onClick={() => setRevealed(true)}>看参考写法</button>
              )}
            </div>
          )}
          {result && !revealed && <Feedback ok={result.ok}>{result.message}</Feedback>}
          {attempt && !revealed && <ReportView report={attempt} showTips={false} />}
          {revealed && sample && (
            <>
              <Feedback ok>参考写法如下。规则检查有盲区，你的写法也可能是对的；对照看看差别，然后继续。</Feedback>
              <pre className="pl-prompt">{sample}</pre>
            </>
          )}
          {!result && fails === 0 && (
            <p className="muted">检查靠关键词规则，可能漏判。多次通不过时，可以看参考写法。</p>
          )}
        </>
      )}
    </div>
  );
}
