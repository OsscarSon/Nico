import type { TcpState } from "../grading/tcp";
import { canRetry, tcpKindLabels } from "../grading/tcp";
import { connectedTcp, type TcpCommand } from "../grading/connection";
import { certificateLabels, type TlsState, type TlsAction } from "../grading/tls";
import type { HttpSession, HttpMethod } from "../grading/http";
import "../styles/web-labs.css";

export function TcpWorkbench({ state: s, onCommand, disabled = false, data = false }: { state: TcpState; onCommand: (c: TcpCommand) => void; disabled?: boolean; data?: boolean }) {
  return <div className="web-tcp">
    <div className="net-endpoints"><section className="net-node" aria-label="TCP客户端状态"><strong>客户端：{s.client}</strong><span>下一发送序号：{s.clientNext}</span>{data && <span>确认：{s.acked}/{s.payload.length}字节</span>}</section><section className="net-node" aria-label="TCP服务器状态"><strong>服务器：{s.server}</strong>{data && <><span>下一个期待字节：{s.serverNext}</span><span>实际字节流：「{s.received || "尚无"}」</span></>}</section></div>
    <div className="row"><button className="btn secondary" disabled={disabled || s.client !== "CLOSED"} onClick={() => onCommand({ type: "start" })}>启动 TCP 握手</button>{data && <button className="btn secondary" disabled={disabled || !connectedTcp(s) || !!s.clientPending || s.acked === s.payload.length} onClick={() => onCommand({ type: "data" })}>TCP 发送下一段</button>}</div>
    <ul className="net-channel" aria-label="TCP教学通道">{s.channel.map(p => <li key={p.id} data-kind={p.kind} data-id={p.id}><strong>#{p.id} {p.from === "client" ? "客户端→服务器" : "服务器→客户端"} · {tcpKindLabels[p.kind]}</strong><span className="mono">seq={p.seq}{p.ack !== undefined ? ` · ack=${p.ack}` : ""}{p.data ? ` · 「${p.data}」` : ""}</span><small>可投递：t={p.availableAt}</small><div className="row"><button className="btn secondary" aria-label={`投递 TCP 报文 ${p.id}`} disabled={disabled || p.availableAt > s.clock} onClick={() => onCommand({ type: "deliver", id: p.id })}>投递</button><button className="btn secondary" aria-label={`丢弃 TCP 报文 ${p.id}`} disabled={disabled} onClick={() => onCommand({ type: "drop", id: p.id })}>丢弃</button><button className="btn secondary" aria-label={`延迟 TCP 报文 ${p.id}`} disabled={disabled} onClick={() => onCommand({ type: "delay", id: p.id })}>延迟</button></div></li>)}</ul>
    {!s.channel.length && <p className="muted">TCP通道为空。未确认时需要等到期再重传，不会凭空到达。</p>}
    <p>连接逻辑时钟：t={s.clock} · 超时阈值3</p><div className="row"><button className="btn secondary" disabled={disabled} onClick={() => onCommand({ type: "tick" })}>推进 TCP 逻辑时钟</button><button className="btn secondary" disabled={disabled || !canRetry(s, "client")} onClick={() => onCommand({ type: "retry", side: "client" })}>TCP 客户端超时重传</button><button className="btn secondary" disabled={disabled || !canRetry(s, "server")} onClick={() => onCommand({ type: "retry", side: "server" })}>TCP 服务器超时重传</button></div>
    <p className="net-note" role="status">{s.note}</p>
  </div>;
}
export function TlsWorkbench({ state: s, onStep, disabled = false, transportReady }: { state: TlsState; onStep: (a: TlsAction) => void; disabled?: boolean; transportReady: boolean }) {
  const blocked = disabled || !transportReady;
  return <div className="web-tls"><p><strong>TLS状态：{s.phase}</strong> · 目标身份：{s.hostname}</p><p className="muted">本次情景：{certificateLabels[s.certificateCase]}。协商密钥{ s.keysDerived ? "已模拟完成" : "尚未完成" }，身份{ s.identityVerified ? "已核验" : "尚未核验" }，客户端Finished{ s.clientFinishedVerified ? "已核验" : "尚未核验" }。</p>
    {s.certificate && <div className="net-node" aria-label="服务器证书检查"><span>证书主机名：{s.certificate.hostname}</span><span>信任链：{s.certificate.trusted ? "可信" : "不可信"} · 有效期：{s.certificate.inDate ? "有效" : "过期"}</span><span>签名/服务器Finished：{s.certificate.handshakeProof ? "模型证明一致" : "被篡改"}</span></div>}
    <div className="row"><button className="btn secondary" disabled={blocked || s.phase !== "idle"} onClick={() => onStep("hello")}>发送 ClientHello</button><button className="btn secondary" disabled={blocked || s.phase !== "client-hello"} onClick={() => onStep("server")}>接收服务器握手</button><button className="btn secondary" disabled={blocked || s.phase !== "server-flight"} onClick={() => onStep("verify")}>核验服务器身份与证明</button><button className="btn secondary" disabled={blocked || s.phase !== "verified"} onClick={() => onStep("finish")}>完成 Finished</button></div><p className="net-note" role="status">{s.note}</p>
    <p className="muted">TLS1.3安全状态模型：未实现密码学、真实证书链或密钥交换运算；服务器握手flight合并展示，省略0-RTT/恢复/客户端认证。身份和完整性核验失败不能继续。</p>
  </div>;
}
export type HttpForm = { method: HttpMethod; path: string; headers: string; body: string };
export const initialHttpForm = (path = "/lesson", method: HttpMethod = "GET", hostname = "www.example.com"): HttpForm => ({ method, path, headers: `Host: ${hostname}\nAccept: text/html${method === "POST" ? "\nContent-Type: text/plain" : ""}`, body: '{"note":"hello"}' });
export function HttpEditor({ value: f, onChange, disabled, fixedPath }: { value: HttpForm; onChange: (f: HttpForm) => void; disabled: boolean; fixedPath?: string }) {
  return <div className="net-fields"><label>HTTP方法<select value={f.method} disabled={disabled} onChange={e => onChange({ ...f, method: e.target.value as HttpMethod })}>{(["GET", "HEAD", "POST", "DELETE"] as const).map(m => <option key={m}>{m}</option>)}</select></label><label>请求路径<input value={fixedPath ?? f.path} readOnly={fixedPath !== undefined} disabled={disabled} onChange={e => onChange({ ...f, path: e.target.value })} maxLength={200} /></label><label className="net-wide">请求Headers<textarea value={f.headers} disabled={disabled} spellCheck={false} onChange={e => onChange({ ...f, headers: e.target.value })} maxLength={1000} /></label>{f.method === "POST" && <label className="net-wide">JSON请求体<textarea value={f.body} disabled={disabled} spellCheck={false} onChange={e => onChange({ ...f, body: e.target.value })} maxLength={1000} /></label>}</div>;
}
export function HttpExchange({ state: s, disabled, onSend, onProcess, onReceive }: { state: HttpSession; disabled: boolean; onSend: () => void; onProcess: () => void; onReceive: () => void }) {
  const request = s.request;
  return <div className="web-http-exchange"><div className="row"><button className="btn" disabled={disabled || s.stage === "sent" || s.stage === "processed"} onClick={onSend}>发送 HTTP 请求</button><button className="btn secondary" disabled={disabled || s.stage !== "sent"} onClick={onProcess}>服务器处理请求</button><button className="btn secondary" disabled={disabled || s.stage !== "processed"} onClick={onReceive}>接收 HTTP 响应</button></div>
    <h4>端点诊断：实际请求快照</h4><pre className="web-message" aria-label="HTTP请求快照">{request ? `${request.method} ${request.path} HTTP/1.1\n${Object.entries(request.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${request.body}` : "尚未提交请求。编辑输入不会改写已发送的快照。"}</pre>
    <aside className="web-observer" aria-label="网络观察者视角"><strong>被动网络观察者</strong><p>{!request ? "还没有HTTP应用数据。" : s.protectedRequest ? "TLS受保护的应用记录（教学抽象，不生成真实密文）。观察者不能从应用记录读取方法、路径、Headers和正文；IP/端口以及普通SNI等元数据可能可见。本端点诊断框可见明文，不代表网络旁观者可见。" : `明文HTTP：观察者可读取 ${request.method} ${request.path}、Headers和正文。`}</p></aside>
    <h4>实际接收的响应</h4><pre className="web-message" aria-label="HTTP响应" data-status={s.response?.status ?? "none"}>{s.response ? `HTTP/1.1 ${s.response.status} ${s.response.reason}\n${Object.entries(s.response.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${s.response.body || "（无响应体；不编造缓存副本）"}` : "浏览器尚未接收服务器响应。"}</pre>
    <p className="muted">服务器记录：{s.server.notes.length}条 · 已接收状态：{s.receipts.map(r => r.response.status).join(" → ") || "暂无"}</p>
  </div>;
}
