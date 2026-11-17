import { useEffect, useState } from "react";
import "../styles/p3a.css";
export type P3Props = { mode: "free" | "challenge"; onSolved?: () => void };
export function LabCheck({ valid, last, onNext }: { valid: boolean; last: boolean; onNext: () => void }) {
  const [checked, setChecked] = useState(false), [finished, setFinished] = useState(false);
  useEffect(() => { if (!valid) setFinished(false); }, [valid]);
  return <div className="p3-check">
    <div className="row"><button type="button" className="btn" onClick={() => setChecked(true)}>检查当前任务</button><button type="button" className="btn secondary" disabled={!checked || !valid || finished} onClick={() => { if (last) setFinished(true); onNext(); }}>{last ? "完成挑战" : "下一任务"}</button></div>
    {checked && <p role="status" className={`feedback ${valid ? "ok" : "bad"}`}>{valid ? finished ? "挑战已完成：已验证实际状态与结果。" : "当前任务通过：已验证实际状态与结果。" : "尚未完成：请对照任务要求、错误记录与当前实际结果；点击次数不会得分。"}</p>}
  </div>;
}
