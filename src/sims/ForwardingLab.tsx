import { useState } from "react";
import { hosts, connectedRoutes, routerMac, initialForward, startForward, forwardStep, forwardTasks, gradeForward, type HostId } from "../grading/forwarding";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
export function ForwardingLab({ mode, onSolved }: LabProps) {
  const [state, setState] = useState(initialForward);
  const [src, setSrc] = useState<HostId>("A"), [dst, setDst] = useState<HostId>("B");
  const [hop, setHop] = useState<"auto" | "direct" | "gateway">("auto");
  const [index, setIndex] = useState(0), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const frozen = done || grade?.ok === true;
  const task = forwardTasks[index]!;
  const reset = () => { setState(initialForward()); setGrade(null); setSrc(task.src); setDst(task.dst); setHop("auto"); };
  const next = () => { if (!grade?.ok) return; if (index + 1 === forwardTasks.length) { setDone(true); onSolved?.(); } else { const t = forwardTasks[index + 1]!; setIndex(index + 1); setState(initialForward()); setGrade(null); setSrc(t.src); setDst(t.dst); setHop("auto"); } };
  return <div className="net-lab forwarding-lab">
    {mode === "challenge" && <p className="net-mission">任务：{task.title}</p>}
    <div className="net-topology" aria-label="两个局域网通过路由器连接的拓扑">
      {([1, 0, 2] as const).map(lan => lan === 0 ? <section className="net-node" key="router"><strong>路由器 R</strong><small>LAN 1 ↔ LAN 2</small><span>接口 R1：192.168.1.1</span><span>接口 R2：192.168.2.1</span></section> : <section className="net-node" key={lan}><strong>LAN {lan} · 交换机 S{lan}</strong>{hosts.filter(h => h.lan === lan).map(h => <div key={h.id}><b>电脑 {h.id}</b><span>{h.ip}/24</span><small className="mono">{h.mac}</small></div>)}<small>网关 MAC：{routerMac(lan)}</small></section>)}
    </div>
    <div className="net-fields"><label>发送端<select aria-label="发送端" value={src} disabled={frozen || !!state.queue.length} onChange={e => { setSrc(e.target.value as HostId); setGrade(null); }}>{hosts.map(h => <option key={h.id}>{h.id}</option>)}</select></label><label>目标端<select aria-label="目标端" value={dst} disabled={frozen || !!state.queue.length} onChange={e => { setDst(e.target.value as HostId); setGrade(null); }}>{hosts.map(h => <option key={h.id}>{h.id}</option>)}</select></label><label>首跳策略<select aria-label="首跳策略" value={hop} disabled={frozen || !!state.queue.length} onChange={e => { setHop(e.target.value as typeof hop); setGrade(null); }}><option value="auto">按网段自动选择</option><option value="direct">强制直接找目标 MAC</option><option value="gateway">强制发给默认网关</option></select></label></div>
    <div className="row"><button className="btn secondary" disabled={frozen || !!state.queue.length || src === dst} onClick={() => { setState(s => startForward(s, src, dst, hop)); setGrade(null); }}>开始发送</button><button className="btn" disabled={frozen || !state.queue.length} onClick={() => { setState(forwardStep); setGrade(null); }}>转发下一跳</button>{mode === "free" && <button className="btn ghost" onClick={() => { setState(initialForward()); setGrade(null); }}>重置并清空 MAC 表</button>}</div>
    <p className="net-note" role="status">{state.note}</p><p>待处理帧副本：{state.queue.length} · 实际送达：{state.deliveries.map(d => `${d.src} → ${d.dst}`).join("、") || "尚未送达"}</p>
    <div className="net-tables">{([1, 2] as const).map(lan => <table key={lan}><caption>S{lan} 的 MAC 学习表</caption><thead><tr><th scope="col">源 MAC</th><th scope="col">入口端口</th></tr></thead><tbody>{Object.entries(state.tables[lan]).length ? Object.entries(state.tables[lan]).map(([mac, port]) => <tr key={mac}><td className="mono">{mac}</td><td>{port}</td></tr>) : <tr><td colSpan={2}>空表：尚未学习</td></tr>}</tbody></table>)}</div>
    <details className="net-trace"><summary>路由器的直连路由表</summary><ul>{connectedRoutes.map(r => <li key={r.lan}>{r.network}/{r.prefix} → LAN {r.lan}</li>)}</ul></details>
    <LabTrace events={state.trace} />
    <p className="muted">ARP 用已知映射代替请求/回应；未知单播泛洪不是广播帧。路由只含两个直连 /24 网段，无 NAT、VLAN、环路和路由协议；IP 不变，链路 MAC 随路由跳变化。</p>
    {mode === "challenge" && <LabTasks index={index} total={forwardTasks.length} grade={grade} done={done} onCheck={() => setGrade(gradeForward(state, task))} onNext={next} onReset={reset} />}
  </div>;
}
