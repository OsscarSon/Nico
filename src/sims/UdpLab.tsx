import { useState } from "react";
import { Feedback } from "../components/ui";
import { initialUdp, sendUdp, deliverUdp, dropUdp, delayUdp, tickUdp, resendUdp, setUdpPolicy, positionStream, gradeRealtime, type UdpState, type RealtimeTask, type UdpPolicy } from "../grading/udp";
import { initialTcp, type TcpState } from "../grading/tcp";
import { applyTcpCommand } from "../grading/connection";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
import { TcpWorkbench } from "./WebLabControls";
const tasks: { id: RealtimeTask; title: string }[] = [
  { id: "raw", title: "直接显示策略：发送三个快照，丢弃编号2，先投递3再投递1，观察位置倒退" },
  { id: "fresh", title: "应用新鲜策略：先显示3，拒绝旧编号，再让一个延迟到期的数据报实际到达" },
  { id: "tcp", title: "TCP对照：同样的位置文本，实际丢弃数据或ACK，超时重传并完整确认" },
];
export function UdpLab({ mode, onSolved }: LabProps) {
  const [udp, setUdp] = useState(initialUdp), [tcp, setTcp] = useState(() => initialTcp(positionStream(initialUdp())));
  const [positions, setPositions] = useState("10,20,30"), [error, setError] = useState("");
  const [index, setIndex] = useState(0), [view, setView] = useState<"udp" | "tcp">("udp"), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const frozen = done || grade?.ok === true;
  const changeUdp = (fn: (s: UdpState) => UdpState) => { setUdp(fn); setGrade(null); };
  const changeTcp = (fn: (s: TcpState) => TcpState) => { setTcp(fn); setGrade(null); };
  const reset = () => { const u = initialUdp(); setUdp(u); setTcp(initialTcp(positionStream(u))); setPositions("10,20,30"); setError(""); setGrade(null); };
  const next = () => { if (!grade?.ok) return; if (index + 1 === tasks.length) { setDone(true); onSolved?.(); } else { const n = index + 1; setIndex(n); setView(tasks[n]!.id === "tcp" ? "tcp" : "udp"); reset(); } };
  const completeRecords = tcp.received.split("|").slice(0, -1);
  return <div className="net-lab web-lab udp-lab">
    {mode === "challenge" && <p className="net-mission">任务：{tasks[index]!.title}</p>}
    {mode === "free" && <div className="net-fields"><label>三个位置（逗号分隔）<input value={positions} onChange={e => setPositions(e.target.value)} maxLength={20} /></label><button className="btn secondary" onClick={() => { try { const fields = positions.split(","); if (fields.some(f => !/^\d{1,2}$/.test(f.trim()))) throw Error("每个位置须为0–99整数，用英文逗号分隔。"); const u = initialUdp(fields.map(Number)); setUdp(u); setTcp(initialTcp(positionStream(u))); setError(""); setGrade(null); } catch (e) { setError((e as Error).message); } }}>生成位置实验</button></div>}
    {error && <Feedback ok={false}>{error}</Feedback>}
    <div className="row"><button className="btn secondary" disabled={frozen} aria-pressed={view === "udp"} onClick={() => setView("udp")}>观察 UDP</button><button className="btn secondary" disabled={frozen} aria-pressed={view === "tcp"} onClick={() => setView("tcp")}>观察 TCP</button></div>
    {view === "udp" ? <>
      <p>UDP数据报：端口53000→5000 · 三个位置：{udp.positions.join(" → ")}。编号、测量时间与截止期是应用字段，不是UDP自带序号。</p>
      <div className="net-fields"><label>应用显示策略<select value={udp.policy} disabled={frozen} onChange={e => changeUdp(s => setUdpPolicy(s, e.target.value as UdpPolicy))}><option value="arrival">按到达直接显示</option><option value="fresh">只应用新鲜更新</option></select></label></div>
      <section className="web-screen" aria-label="UDP画面"><strong aria-label="UDP画面位置">{udp.display ? `位置${udp.display.value} · 应用编号${udp.display.seq}` : "尚无位置更新"}</strong><p>逻辑时刻 t={udp.clock} · 到达年龄≥3即过期。新鲜策略只筛选到达的更新，不会凭空刷新或自动清除最后显示的位置。</p></section>
      <div className="row"><button className="btn" disabled={frozen || udp.sent.length === 3} onClick={() => changeUdp(sendUdp)}>发送下一份 UDP 快照</button><button className="btn secondary" disabled={frozen} onClick={() => changeUdp(tickUdp)}>推进 UDP 逻辑时钟</button></div>
      <ul className="net-channel" aria-label="UDP教学通道">{udp.channel.map(p => <li key={p.id} data-id={p.id} data-seq={p.seq}><strong>数据报 #{p.id} · 应用编号{p.seq} · 位置{p.value}</strong><small>测量t={p.createdAt} · 可投递t={p.availableAt}</small><div className="row"><button className="btn secondary" aria-label={`投递 UDP 数据报 ${p.id}`} disabled={frozen || p.availableAt > udp.clock} onClick={() => changeUdp(s => deliverUdp(s, p.id))}>投递</button><button className="btn secondary" aria-label={`丢弃 UDP 数据报 ${p.id}`} disabled={frozen} onClick={() => changeUdp(s => dropUdp(s, p.id))}>丢弃</button><button className="btn secondary" aria-label={`延迟 UDP 数据报 ${p.id}`} disabled={frozen} onClick={() => changeUdp(s => delayUdp(s, p.id))}>延迟</button></div></li>)}</ul>
      <p className="net-note" role="status">{udp.note}</p><p>实际到达记录：{udp.arrivals.map(a => `${a.seq}:${a.reason === "displayed" ? "显示" : a.reason === "older" ? "应用拒绝旧编号" : "应用拒绝过期"}`).join(" → ") || "暂无"}</p><p>应用记录簿：{Object.keys(udp.archive).sort((a, b) => Number(a) - Number(b)).map(seq => `#${seq}=${udp.archive[Number(seq)]}`).join("，") || "暂无"}。收到过的数据不等于画面应该显示它。</p>
      {mode === "free" && udp.lost.map(p => <button key={p.id} className="btn secondary" onClick={() => changeUdp(s => resendUdp(s, p.seq))}>应用重发缺失编号 {p.seq}</button>)}
      <p className="muted">重发是应用补偿。控制台知道丢失并代替反馈/超时机制，真实UDP不会主动告诉接收端丢了哪一份。无真实网络IO、校验和或拥塞控制；真实UDP应用仍需设计合适的发送速率与拥塞应对。</p><LabTrace events={udp.trace} />
    </> : <>
      <p>相同应用记录：「{positionStream(udp)}」。竖线分隔符属于应用格式；TCP提供字节流，不保留应用写入边界。</p><p aria-label="TCP画面位置">TCP应用最后完整位置：{completeRecords.length ? Number(completeRecords.at(-1)) : "尚无"}</p>
      <TcpWorkbench state={tcp} data disabled={frozen} onCommand={c => changeTcp(s => applyTcpCommand(s, c))} /><LabTrace events={tcp.trace} />
      <p className="muted">复用A14的停等模型，一次一段、手动时钟。真实TCP有窗口与拥塞控制，不能用本实验点击次数证明UDP一定更快。应用也可在UDP上自行实现可靠性，QUIC便是相关思路的现实例子。</p>
    </>}
    {mode === "challenge" ? <LabTasks index={index} total={tasks.length} grade={grade} done={done} onCheck={() => setGrade(gradeRealtime(udp, tcp, tasks[index]!.id))} onNext={next} onReset={reset} /> : <button className="btn ghost" onClick={reset}>重置实验</button>}
  </div>;
}
