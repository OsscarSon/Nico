import { useState } from "react";
import { initialHttp, restartHttpTls, stepHttpTls, sendHttp, processHttp, receiveHttp, gradeHttp, type HttpSession, type HttpTask } from "../grading/http";
import { certificateLabels, type CertificateCase } from "../grading/tls";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
import { TlsWorkbench, HttpEditor, HttpExchange, initialHttpForm } from "./WebLabControls";
const tasks: { id: HttpTask; title: string }[] = [
  { id: "path", title: "先接收GET /missing的404，再修正路径并接收GET /lesson的200" },
  { id: "post", title: "先观察POST错误媒体类型415，再用JSON创建真实记录并接收201" },
  { id: "tls", title: "拒绝错误证书身份，重建正确TLS，接收受保护的GET /lesson响应" },
];
const sessionFor = (i: number) => i === 2 ? initialHttp("https", "www.example.com", true, "wrong-name") : initialHttp();
const formFor = (i: number) => initialHttpForm(i === 0 ? "/missing" : i === 1 ? "/api/note" : "/lesson", i === 1 ? "POST" : "GET");
export function HttpLab({ mode, onSolved }: LabProps) {
  const [index, setIndex] = useState(0), [state, setState] = useState(() => initialHttp()), [form, setForm] = useState(() => mode === "challenge" ? formFor(0) : initialHttpForm());
  const [certificate, setCertificate] = useState<CertificateCase>("valid"), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const frozen = done || grade?.ok === true;
  const change = (fn: (s: HttpSession) => HttpSession) => { setState(fn); setGrade(null); };
  const reset = (i = index) => { setState(mode === "challenge" ? sessionFor(i) : initialHttp()); setForm(mode === "challenge" ? formFor(i) : initialHttpForm()); setCertificate(i === 2 && mode === "challenge" ? "wrong-name" : "valid"); setGrade(null); };
  const next = () => { if (!grade?.ok) return; if (index + 1 === tasks.length) { setDone(true); onSolved?.(); } else { const i = index + 1; setIndex(i); reset(i); } };
  return <div className="net-lab web-lab http-lab">
    {mode === "challenge" && <p className="net-mission">任务：{tasks[index]!.title}</p>}
    <p className="muted">本实验预设TCP已建立。HTTP是应用消息，TLS负责保护该连接；A17中你需要亲自完成DNS与TCP阶段。</p>
    <div className="net-fields"><label>访问协议<select value={state.scheme} disabled={frozen || (mode === "challenge" && index === 2)} onChange={e => change(s => restartHttpTls(s, e.target.value as "http" | "https", certificate))}><option value="http">HTTP 明文</option><option value="https">HTTPS 经TLS保护</option></select></label>{state.scheme === "https" && <><label>服务器证书情景<select value={certificate} disabled={frozen} onChange={e => setCertificate(e.target.value as CertificateCase)}>{Object.entries(certificateLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button className="btn secondary" disabled={frozen} onClick={() => change(s => restartHttpTls(s, "https", certificate))}>重建 TLS 会话</button></>}</div>
    {state.scheme === "https" && <TlsWorkbench state={state.tls} transportReady={state.connected} disabled={frozen} onStep={a => change(s => stepHttpTls(s, a))} />}
    <HttpEditor value={form} disabled={frozen} onChange={f => { setForm(f); setGrade(null); }} />
    <HttpExchange state={state} disabled={frozen} onSend={() => change(s => sendHttp(s, form.method, form.path, form.headers, form.method === "POST" ? form.body : ""))} onProcess={() => change(processHttp)} onReceive={() => change(receiveHttp)} />
    <p className="net-note" role="status">{state.note}</p><LabTrace events={state.trace} />
    <p className="muted">虚构HTTP/1.1站点：/、/lesson、/api/note。资源格式固定；Accept只展示偏好，不实现完整内容协商。ETag仅做精确If-None-Match对照，不提供浏览器HTTP缓存。POST每次新提交可创建新记录，TCP去重不等于应用业务幂等。无真实请求或密码学。</p>
    {mode === "challenge" ? <LabTasks index={index} total={tasks.length} grade={grade} done={done} onCheck={() => setGrade(gradeHttp(state, tasks[index]!.id))} onNext={next} onReset={() => reset()} /> : <button className="btn ghost" onClick={() => reset()}>重置实验</button>}
  </div>;
}
