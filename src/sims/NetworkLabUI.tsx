import { Feedback } from "../components/ui";
import "../styles/network-labs.css";
export type LabProps = { mode: "free" | "challenge"; onSolved?: () => void };
export type LabGrade = { ok: boolean; message: string };
export function LabTasks({ index, total, grade, done, onCheck, onNext, onReset }: { index: number; total: number; grade: LabGrade | null; done: boolean; onCheck: () => void; onNext: () => void; onReset: () => void }) {
  return <div className="net-task-controls">
    <p>操作任务 {Math.min(index + 1, total)} / {total} · 每项须有真实状态与结果</p>
    <div className="row"><button className="btn" disabled={done || grade?.ok === true} onClick={onCheck}>检查当前任务</button><button className="btn secondary" disabled={done || !grade?.ok} onClick={onNext}>{index + 1 === total ? "完成挑战" : "下一任务"}</button><button className="btn ghost" disabled={done} onClick={onReset}>重置当前任务</button></div>
    {done ? <Feedback ok>全部操作任务通过，可以进入检查题。</Feedback> : grade && <Feedback ok={grade.ok}>{grade.message}</Feedback>}
  </div>;
}
export function LabTrace({ events }: { events: string[] }) {
  return <details className="net-trace"><summary>查看操作记录（{events.length}）</summary><ol>{events.map((t, i) => <li key={i}>{t}</li>)}</ol></details>;
}
