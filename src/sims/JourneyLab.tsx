import { useState } from "react";
import { initialJourney, journeyTasks, navigateJourney, stepJourneyDns, clearJourneyAnswers, tickJourney, commandJourneyTcp, stepJourneyTls, restartJourneyTls, sendJourneyHttp, processJourneyHttp, receiveJourneyHttp, renderJourney, gradeJourney, type JourneyState } from "../grading/journey";
import { connectedTcp } from "../grading/connection";
import { certificateLabels, type CertificateCase } from "../grading/tls";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
import { TcpWorkbench, TlsWorkbench, HttpEditor, HttpExchange, initialHttpForm } from "./WebLabControls";
export function JourneyLab({ mode, onSolved }: LabProps) {
  const [index, setIndex] = useState(0), [state, setState] = useState(() => initialJourney(mode === "challenge" ? "cache" : "free"));
  const [url, setUrl] = useState(state.url), [form, setForm] = useState(() => initialHttpForm()), [certificate, setCertificate] = useState<CertificateCase>("valid");
  const [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const frozen = done || grade?.ok === true;
  const change = (fn: (s: JourneyState) => JourneyState) => { setState(fn); setGrade(null); };
  const reset = (i = index) => { const s = initialJourney(mode === "challenge" ? journeyTasks[i]!.id : "free"); setState(s); setUrl(s.url); setForm(initialHttpForm()); setCertificate("valid"); setGrade(null); };
  const next = () => { if (!grade?.ok) return; if (index + 1 === journeyTasks.length) { setDone(true); onSolved?.(); } else { const i = index + 1; setIndex(i); reset(i); } };
  const stages = [
    ["DNS", state.resolvedIp ?? (state.phase === "dns-error" ? "未找到名字" : "尚无地址"), state.phase === "dns"],
    ["TCP", `${state.tcp.client} / ${state.tcp.server}`, state.phase === "connect"],
    ["TLS", state.parsed?.scheme === "http" ? "HTTP不使用TLS" : state.http.tls.phase, state.phase === "tls"],
    ["HTTP请求", state.http.request ? `${state.http.request.method} ${state.http.request.path}` : "尚未发送", state.phase === "http" && state.http.stage === "ready"],
    ["服务器响应", state.http.response ? `${state.http.response.status} ${state.http.response.reason}` : state.http.stage === "processed" ? "已生成，尚未收到" : "尚未收到", state.phase === "http" && state.http.stage !== "ready"],
    ["页面显示", state.rendered ? `${state.rendered.status} ${state.rendered.kind}` : "尚未显示", state.phase === "display"],
  ] as const;
  return <div className="net-lab web-lab journey-lab">
    {mode === "challenge" && <p className="net-mission">情景：{journeyTasks[index]!.title}</p>}
    <div className="net-fields"><label className="net-wide">访问网址<input value={url} disabled={frozen} onChange={e => setUrl(e.target.value)} maxLength={240} /></label><button className="btn" disabled={frozen} onClick={() => { const s = navigateJourney(state, url); setState(s); if (!s.error && s.parsed) setForm(initialHttpForm(s.parsed.target, "GET", s.parsed.hostname)); setGrade(null); }}>开始本次访问</button><button className="btn secondary" disabled={frozen} onClick={() => change(tickJourney)}>推进访问逻辑时钟</button></div>
    <p>全局教学时刻t={state.clock} · 本次访问#{state.attempt} · 累计外部DNS查询{state.externalQueries}次 · 缓存命中{state.evidence.cacheHits}次</p>
    <ol className="web-stages" aria-label="访问协议状态">{stages.map(([label, value, current]) => <li key={label} aria-current={current ? "step" : undefined}><strong>{label}</strong><small>{value}</small></li>)}</ol>
    <details open={state.phase === "idle" || state.phase === "dns" || state.phase === "dns-error"}>
      <summary>DNS：缓存、查询与实际目标</summary>
      <div className="net-node" aria-label="DNS答案缓存">{Object.entries(state.cache.answers).length ? Object.entries(state.cache.answers).map(([name, ip]) => <p key={name}>{name} → {ip}<br /><small>有效至t={state.expires[name] ?? "未知"}；{(state.expires[name] ?? -1) > state.clock ? `剩余${state.expires[name]! - state.clock}个逻辑时刻` : "已到期，下次访问刷新"}</small></p>) : <p>答案缓存为空。</p>}<small>区指引：{state.cache.zones.join("、") || "空"}</small></div>
      <div className="row"><button className="btn secondary" disabled={frozen} onClick={() => change(clearJourneyAnswers)}>清除 DNS 答案缓存</button><button className="btn secondary" disabled={frozen || state.phase !== "dns"} onClick={() => change(stepJourneyDns)}>处理下一条 DNS 消息</button></div>
      <p>{state.phase === "dns" && state.resolution ? `待处理：${state.resolution.steps[state.dnsCursor]?.from} → ${state.resolution.steps[state.dnsCursor]?.to} · ${state.resolution.steps[state.dnsCursor]?.question}` : `当前地址：${state.resolvedIp ?? "尚无"}`}</p>
      <p className="muted">答案TTL为5个教学逻辑时刻，命中不续期；旧A13区指引模型保持不变，不模拟区指引到期。缓存清除不会改写已有连接，重新访问才使用新查询结果。</p>
    </details>
    <details open={state.phase === "connect"}><summary>TCP：真实连接状态和可操作通道</summary><TcpWorkbench state={state.tcp} disabled={frozen || state.phase !== "connect"} onCommand={command => change(s => commandJourneyTcp(s, command))} /></details>
    <details open={state.phase === "tls"}><summary>TLS：目标身份、握手与应用记录保护</summary>
      <div className="net-fields"><label>访问中的证书情景<select value={certificate} disabled={frozen || !connectedTcp(state.tcp) || state.parsed?.scheme !== "https"} onChange={e => setCertificate(e.target.value as CertificateCase)}>{Object.entries(certificateLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><button className="btn secondary" disabled={frozen || !connectedTcp(state.tcp) || state.parsed?.scheme !== "https"} onClick={() => change(s => restartJourneyTls(s, certificate))}>重建访问 TLS 会话</button></div>
      <TlsWorkbench state={state.http.tls} transportReady={connectedTcp(state.tcp)} disabled={frozen || state.phase !== "tls"} onStep={a => change(s => stepJourneyTls(s, a))} />
    </details>
    <details open={state.phase === "http" || state.phase === "display"}><summary>HTTP：请求、服务器处理与响应接收</summary>
      <p className="muted">路径来自本次网址。要修正路径，请编辑顶部网址并开始新访问；Host初始由网址生成，Header仍可实验修改。</p>
      <HttpEditor value={form} fixedPath={state.parsed?.target ?? form.path} disabled={frozen || state.phase !== "http"} onChange={f => { setForm(f); setGrade(null); }} />
      <HttpExchange state={state.http} disabled={frozen || state.phase !== "http"} onSend={() => change(s => sendJourneyHttp(s, form.method, form.headers, form.method === "POST" ? form.body : ""))} onProcess={() => change(processJourneyHttp)} onReceive={() => change(receiveJourneyHttp)} />
      <button className="btn" disabled={frozen || state.phase !== "http" || state.http.stage !== "received"} onClick={() => change(renderJourney)}>从响应显示页面</button>
    </details>
    {state.rendered && <section className={`web-screen${state.rendered.kind === "error" ? " error" : ""}`} aria-label="实际页面预览" data-status={state.rendered.status}><strong>{state.rendered.kind === "document" ? "页面内容" : state.rendered.kind === "error" ? "服务器错误页" : "接口数据"} · HTTP {state.rendered.status}</strong><p>{state.rendered.text}</p><small>来自本次实际响应体。仅预览虚构站点固定HTML文本，不执行JavaScript或实现完整浏览器渲染引擎。</small></section>}
    <p className="net-note" role="status">{state.note}</p><LabTrace events={state.trace} />
    <p className="muted">HTTP/1.1 over TCP/TLS教学链路，不涵盖HTTP/3/QUIC、CDN或真实网络。TCP握手复用A14真实状态机；HTTP数据阶段按完整消息交换抽象，丢包操控集中于握手，数据段恢复实验见A14/A15。TLS不实现密码学；显示页面依据实际响应，不是预制动画。</p>
    {mode === "challenge" ? <LabTasks index={index} total={journeyTasks.length} grade={grade} done={done} onCheck={() => setGrade(gradeJourney(state, journeyTasks[index]!.id))} onNext={next} onReset={() => reset()} /> : <button className="btn ghost" onClick={() => reset()}>重置实验</button>}
  </div>;
}
