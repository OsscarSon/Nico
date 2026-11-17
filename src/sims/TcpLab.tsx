import { useState } from "react";
import { Feedback } from "../components/ui";
import { initialTcp, startTcp, sendTcpData, deliverTcp, dropTcp, delayTcp, tickTcp, retryTcp, canRetry, gradeTcp, tcpKindLabels as kindLabel, type TcpState, type TcpTask } from "../grading/tcp";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
const tasks: { id: TcpTask; title: string }[] = [
  { id: "normal", title: "不丢包，正常建连并传完 HELLO!" },
  { id: "handshake-loss", title: "丢弃任一握手报文，用到期重传恢复，再完成传输" },
  { id: "data-loss", title: "握手后丢弃数据或数据 ACK，超时重传并完整确认" },
];
export function TcpLab({ mode, onSolved }: LabProps) {
  const [state, setState] = useState(initialTcp), [payload, setPayload] = useState("HELLO!"), [error, setError] = useState("");
  const [index, setIndex] = useState(0), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const frozen = done || grade?.ok === true;
  const change = (fn: (s: TcpState) => TcpState) => { setState(fn); setGrade(null); };
  const reset = () => { setState(initialTcp()); setGrade(null); setError(""); };
  const next = () => { if (!grade?.ok) return; if (index + 1 === tasks.length) { setDone(true); onSolved?.(); } else { setIndex(index + 1); reset(); } };
  return <div className="net-lab tcp-lab">
    {mode === "challenge" && <p className="net-mission">任务：{tasks[index]!.title}</p>}
    {mode === "free" && <div className="net-fields"><label>传输内容（ASCII）<input value={payload} onChange={e => setPayload(e.target.value)} maxLength={24} /></label><button className="btn secondary" onClick={() => { try { setState(initialTcp(payload)); setGrade(null); setError(""); } catch (e) { setError((e as Error).message); } }}>生成新会话</button></div>}
    {error && <Feedback ok={false}>{error}</Feedback>}
    <p className="muted">发送目标「{state.payload}」· 每段至多 3 字节 · 客户端 ISN=100，服务器 ISN=500。ASCII 字符在本模型中每个占 1 字节。</p>
    <div className="net-endpoints"><section className="net-node" aria-label="客户端状态"><h4>客户端</h4><strong>{state.client}</strong><span>下一个发送序号：{state.clientNext}</span><span>已确认：{state.acked} / {state.payload.length} 字节</span><small>待确认：{state.clientPending ? kindLabel[state.clientPending.wire.kind] : "无"}</small></section><section className="net-node" aria-label="服务器状态"><h4>服务器</h4><strong>{state.server}</strong><span>期待数据序号：{state.serverNext}</span><span>应用已收到：「{state.received || "尚无"}」</span><small>待确认：{state.serverPending ? kindLabel[state.serverPending.wire.kind] : "无"}</small></section></div>
    <div className="row"><button className="btn secondary" disabled={frozen || state.client !== "CLOSED"} onClick={() => change(startTcp)}>启动三次握手</button><button className="btn secondary" disabled={frozen || state.client !== "ESTABLISHED" || state.server !== "ESTABLISHED" || !!state.clientPending || state.acked === state.payload.length} onClick={() => change(sendTcpData)}>发送下一段</button></div>
    <h4>可操作的网络通道</h4><p className="muted">发送不会自动送达。选择任一报文投递、丢弃或延迟。</p>
    <ul className="net-channel" aria-label="TCP 通道">{state.channel.map(p => <li key={p.id} data-kind={p.kind} data-id={p.id}><strong>#{p.id} {p.from === "client" ? "客户端 → 服务器" : "服务器 → 客户端"} · {kindLabel[p.kind]}</strong><span className="mono">seq={p.seq}{p.ack !== undefined ? ` · ack=${p.ack}` : ""}{p.data ? ` · 载荷「${p.data}」` : ""}</span><small>可投递时刻 t={p.availableAt}</small><div className="row"><button className="btn secondary" aria-label={`投递报文 ${p.id}`} disabled={frozen || p.availableAt > state.clock} onClick={() => change(s => deliverTcp(s, p.id))}>投递</button><button className="btn secondary" aria-label={`丢弃报文 ${p.id}`} disabled={frozen} onClick={() => change(s => dropTcp(s, p.id))}>丢弃</button><button className="btn secondary" aria-label={`延迟报文 ${p.id}`} disabled={frozen} onClick={() => change(s => delayTcp(s, p.id))}>延迟</button></div></li>)}</ul>
    {!state.channel.length && <p className="muted">通道为空；可能需要开始发送、等待超时，或已经完成传输。</p>}
    <p>逻辑时钟：<strong>t={state.clock}</strong> · 到期阈值：3 个逻辑时刻</p><div className="row"><button className="btn secondary" disabled={frozen} onClick={() => change(tickTcp)}>推进逻辑时钟</button><button className="btn secondary" disabled={frozen || !canRetry(state, "client")} onClick={() => change(s => retryTcp(s, "client"))}>客户端超时重传</button><button className="btn secondary" disabled={frozen || !canRetry(state, "server")} onClick={() => change(s => retryTcp(s, "server"))}>服务器超时重传</button></div>
    <p className="net-note" role="status">{state.note}</p><p>已丢弃：{state.lost.map(k => kindLabel[k]).join("、") || "无"} · 已重传：{state.retransmitted.map(k => kindLabel[k]).join("、") || "无"}</p>
    <LabTrace events={state.trace} />
    <p className="muted">停等教学模型：仅一个待确认数据段；使用手动逻辑时钟，不是真实计时器。未实现滑动窗口、拥塞控制、RTT/RTO 自适应、校验和、FIN 关闭及完整 TCP 栈；不宣称适合生产通信。</p>
    {mode === "challenge" ? <LabTasks index={index} total={tasks.length} grade={grade} done={done} onCheck={() => setGrade(gradeTcp(state, tasks[index]!.id))} onNext={next} onReset={reset} /> : <button className="btn ghost" onClick={() => { setState(initialTcp()); setPayload("HELLO!"); setError(""); }}>重置实验</button>}
  </div>;
}
