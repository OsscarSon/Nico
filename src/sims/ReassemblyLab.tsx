import { useState } from "react";
import { Feedback } from "../components/ui";
import { initialReassembly, deliverChunk, resendChunk, moveChunk, assembleChunks, gradeReassembly } from "../grading/reassembly";
import { LabTasks, type LabProps, type LabGrade } from "./NetworkLabUI";
export function ReassemblyLab({ mode, onSolved }: LabProps) {
  const [state, setState] = useState(initialReassembly);
  const [text, setText] = useState("今晚七点在图书馆见面"), [size, setSize] = useState("3"), [seed, setSeed] = useState("17");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const frozen = done || grade?.ok === true;
  const reset = () => { setState(initialReassembly("今晚七点在图书馆见面", 3, index ? 44 : 17)); setGrade(null); setError(""); };
  const next = () => { if (!grade?.ok) return; if (index === 1) { setDone(true); onSolved?.(); } else { setIndex(1); setState(initialReassembly("今晚七点在图书馆见面", 3, 44)); setSeed("44"); setGrade(null); } };
  const change = (fn: typeof deliverChunk) => { setState(fn); setGrade(null); };
  return <div className="net-lab reassembly-lab">
    {mode === "challenge" && <p className="net-mission">{index === 0 ? "任务：将乱序到达的片段按编号排好并恢复原文。" : "任务：主动丢弃一块，投递其余块，尝试重组并观察缺块失败，再重发、排序与恢复。"}</p>}
    <div className="net-fields"><label className="net-wide">待发送消息<input value={text} disabled={mode === "challenge"} onChange={e => setText(e.target.value)} maxLength={72} /></label><label>每块字符数<input type="number" value={size} disabled={mode === "challenge"} min={2} max={8} onChange={e => setSize(e.target.value)} /></label><label>随机种子<input type="number" value={seed} disabled={mode === "challenge"} onChange={e => setSeed(e.target.value)} /></label></div>
    {mode === "free" && <button className="btn secondary" onClick={() => { try { if (!size.trim() || !seed.trim()) throw Error("请填写字符数与种子。"); setState(initialReassembly(text, Number(size), Number(seed))); setError(""); } catch (e) { setError((e as Error).message); } }}>生成片段</button>}
    {error && <Feedback ok={false}>{error}</Feedback>}
    <details className="net-trace"><summary>发送端的编号消息块（{state.chunks.length}）</summary><ol>{state.chunks.map(c => <li key={c.seq}>#{c.seq}「{c.content}」</li>)}</ol></details>
    <p className="net-note">通道下一块：{state.wire[0] ? `#${state.wire[0].seq}「${state.wire[0].content}」` : "已空"} · 待投递 {state.wire.length} 块 · 种子 {state.seed}</p>
    <div className="row"><button className="btn secondary" disabled={frozen || !state.wire.length} onClick={() => change(s => deliverChunk(s))}>投递下一片段</button><button className="btn secondary" disabled={frozen || !state.wire.length} onClick={() => change(s => deliverChunk(s, true))}>丢弃下一片段</button></div>
    <p>缺失通道记录：{state.lost.length ? "可重发以下丢失块" : "没有等待重发的块"}</p><div className="row">{state.lost.map(c => <button className="btn secondary" key={c.seq} aria-label={`重发片段 ${c.seq}`} disabled={frozen} onClick={() => change(s => resendChunk(s, c.seq))}>重发 #{c.seq}</button>)}</div>
    <h4>接收端排列区</h4><p className="muted">片段按实际到达顺序放入。依据编号手动调整，不提供自动排序。</p>
    <ol className="net-chunks" aria-label="接收端片段">{state.received.map((c, i) => <li key={c.seq} data-seq={c.seq}><span><strong>#{c.seq}</strong>「{c.content}」</span><div className="row"><button className="btn secondary" aria-label={`上移片段 ${c.seq}`} disabled={frozen || i === 0} onClick={() => change(s => moveChunk(s, i, -1))}>上移</button><button className="btn secondary" aria-label={`下移片段 ${c.seq}`} disabled={frozen || i + 1 === state.received.length} onClick={() => change(s => moveChunk(s, i, 1))}>下移</button></div></li>)}</ol>
    <button className="btn" disabled={frozen} onClick={() => change(assembleChunks)}>尝试重组</button>
    {state.result && <Feedback ok={state.result.ok}>{state.result.message}</Feedback>}
    {state.result?.text !== null && state.result?.text !== undefined && <output className="net-output" aria-label="重组输出">{state.result.text}</output>}
    <p className="muted">这是应用层带编号消息块；字符按 Unicode 码点计算，不是 UTF-8 字节。本模型不实现 IP 分片或 TCP 字节序列；重发按钮是教学通道操作。</p>
    {mode === "challenge" && <LabTasks index={index} total={2} grade={grade} done={done} onCheck={() => setGrade(gradeReassembly(state, index === 1))} onNext={next} onReset={reset} />}
  </div>;
}
