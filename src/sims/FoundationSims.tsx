import { useState } from "react";
import { Feedback } from "../components/ui";
import { initialMemory, memoryStep, memoryGoals, type MemoryAction } from "../grading/memory";
import { initialOs, osStep, osGoals, type Pid } from "../grading/os";
import { initialTerminal, terminalStep, terminalGoals } from "../grading/terminal";
import "../styles/foundation.css";

type Props = { mode: "free" | "challenge"; onSolved?: () => void };
type Goal = { label: string; ok: boolean };
function GoalCheck({ goals, finished, onSolved }: { goals: Goal[]; finished: boolean; onSolved: () => void }) {
  const [checked, setChecked] = useState(false);
  return <div className="foundation-goals">
    <h4>任务清单</h4><ul className="checklist">{goals.map(g => <li key={g.label} data-ok={checked ? g.ok : undefined}><b aria-hidden="true">{checked ? g.ok ? "✓" : "○" : "·"}</b><span>{g.label}{checked && <small> — {g.ok ? "已达成" : "还未达成"}</small>}</span></li>)}</ul>
    <button className="btn" disabled={finished} onClick={() => { setChecked(true); if (goals.every(g => g.ok)) onSolved(); }}>检查任务</button>
    {checked && <Feedback ok={finished}>{finished ? "挑战通过，可以进入检查题。" : "还有任务未完成，请对照清单继续操作。"}</Feedback>}
  </div>;
}
export function MemorySim({ mode, onSolved }: Props) {
  const [state, setState] = useState(initialMemory);
  const [finished, setFinished] = useState(false);
  const actions: [MemoryAction, string][] = [["open", "打开文档"], ["edit", "改为修改稿"], ["save", "保存文档"], ["read", "读取工作副本"], ["restart", "断电重启"]];
  return <div className="foundation-sim">
    <p className="muted">教学模型：CPU 读缓存 → RAM；打开与保存才访问持久存储。断电仅清空本实验的易失数据。</p>
    <dl className="foundation-memory">{[["缓存", state.cache], ["RAM 工作副本", state.ram], ["持久存储", state.disk]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? "空"}</dd></div>)}</dl>
    <p className="mono">累计缓存命中：{state.hits}</p>
    <div className="row">{actions.map(([a, label]) => <button className="btn secondary" key={a} disabled={finished} onClick={() => setState(s => memoryStep(s, a))}>{label}</button>)}</div>
    <p className="foundation-note" role="status">{state.note}</p>
    {mode === "challenge" ? <GoalCheck goals={memoryGoals(state)} finished={finished} onSolved={() => { setFinished(true); onSolved?.(); }} /> : <button className="btn ghost" onClick={() => setState(initialMemory())}>重置实验</button>}
  </div>;
}
const processNames: Record<Pid, string> = { browser: "浏览器", editor: "编辑器" };
const stateNames = { ready: "就绪", running: "运行", waiting: "等待 I/O", stopped: "已结束" };
export function OsSim({ mode, onSolved }: Props) {
  const [state, setState] = useState(initialOs);
  const [file, setFile] = useState<"notes" | "system">("notes");
  const [finished, setFinished] = useState(false);
  return <div className="foundation-sim">
    <p className="muted">模拟单核：一次只有一个进程运行。CPU 推进一步只增加该进程的工作量。</p>
    <div className="foundation-processes">{(["browser", "editor"] as Pid[]).map(id => <section className="panel" key={id} aria-label={`${processNames[id]}进程`}>
      <h4>{processNames[id]}</h4><p>状态：<strong>{stateNames[state.processes[id]]}</strong> · 工作量 {state.work[id]}</p>
      <div className="row">{([["dispatch", "调度", "ready"], ["wait", "请求 I/O", "running"], ["wake", "I/O 回应", "waiting"], ["stop", "结束", null]] as const).map(([type, label, allowed]) => <button key={type} className="btn secondary" aria-label={`${label}${processNames[id]}`} disabled={finished || state.processes[id] === "stopped" || (allowed !== null && state.processes[id] !== allowed)} onClick={() => setState(s => osStep(s, { type, pid: id }))}>{label}</button>)}</div>
    </section>)}</div>
    <button className="btn secondary" disabled={finished} onClick={() => setState(s => osStep(s, { type: "tick" }))}>CPU 推进一步</button>
    <div className="foundation-files"><label className="field">编辑器写入目标<select value={file} disabled={finished} onChange={e => setFile(e.target.value as "notes" | "system")}><option value="notes">学习笔记（可写）</option><option value="system">系统配置（只读）</option></select></label><button className="btn secondary" disabled={finished} onClick={() => setState(s => osStep(s, { type: "write", file }))}>写入所选文件</button></div>
    <p>笔记：{state.notes} · 系统配置：{state.system}</p><p className="foundation-note" role="status">{state.note}</p>
    {mode === "challenge" ? <GoalCheck goals={osGoals(state)} finished={finished} onSolved={() => { setFinished(true); onSolved?.(); }} /> : <button className="btn ghost" onClick={() => setState(initialOs())}>重置实验</button>}
  </div>;
}
export function TerminalSim({ mode, onSolved }: Props) {
  const [state, setState] = useState(initialTerminal);
  const [line, setLine] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const run = () => {
    if (finished) return;
    const next = terminalStep(state, line);
    setHistory(h => [...h, `${state.cwd} $ ${line}\n${next.output}`].slice(-40));
    setState(next); setLine("");
  };
  return <div className="foundation-sim">
    <p className="muted">模拟终端：仅操作浏览器内的虚拟文件，不会运行你电脑上的命令。输入 help 查看范围。</p>
    <p>当前目录：<strong className="mono">{state.cwd}</strong></p>
    <pre className="foundation-terminal" aria-label="终端历史">{history.join("\n\n") || state.output}</pre>
    <form className="foundation-command" onSubmit={e => { e.preventDefault(); run(); }}><label className="field">输入命令<input value={line} maxLength={240} disabled={finished} onChange={e => setLine(e.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="off" /></label><button className="btn" disabled={finished}>运行命令</button></form>
    <p className="foundation-note" role="status">{state.error ? "命令未执行：" : "输出："}{state.output}</p>
    {mode === "challenge" ? <GoalCheck goals={terminalGoals(state)} finished={finished} onSolved={() => { setFinished(true); onSolved?.(); }} /> : <button className="btn ghost" onClick={() => { setState(initialTerminal()); setHistory([]); setLine(""); }}>重置实验</button>}
  </div>;
}
