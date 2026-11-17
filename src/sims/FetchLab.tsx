import { useEffect, useRef, useState } from "react";
import { beginFetch, configureFetch, displayFetch, FETCH_TASKS, gradeFetch, newFetchLab, parseFetch, settleFetch, type FetchRequest } from "../grading/fetchLab";
import { requestLocalApi } from "../runtime/localApi";
import { CodeEditor } from "./code/CodeEditor";
import { LabCheck, type P3Props } from "./p3aShared";
import "../styles/code.css";
export function FetchLab({ mode, onSolved }: P3Props) {
  const [s, setS] = useState(() => newFetchLab()), generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const configure = (patch: Partial<FetchRequest>) => setS(current => configureFetch(current, patch));
  const send = async () => {
    const id = ++generation.current, start = beginFetch(s); setS(start);
    try { const response = await requestLocalApi(start.config); if (generation.current === id) setS(current => settleFetch(current, start.pending!, { response })); }
    catch (e) { if (generation.current === id) setS(current => settleFetch(current, start.pending!, { error: e instanceof Error ? e.message : "本地API网络失败" })); }
  };
  return <div className="p3-lab" aria-label="网页数据实验室">
    <p className="p3-task">{mode === "challenge" ? `任务 ${s.task + 1}/4：${FETCH_TASKS[s.task]!.title}` : "自由实验：本地API，可重复且不会联网"}</p>
    <p>{mode === "challenge" ? FETCH_TASKS[s.task]!.help : "GET /api/profile?id=1或2取得成员；POST同一路径以JSON创建虚构成员。试试错误路径、离线、尾逗号和不存在的字段。覆盖响应留空时按请求参数生成数据。"}</p>
    <div className="p3-fields"><label>请求方法<select aria-label="请求方法" value={s.config.method} onChange={e => configure({ method: e.target.value as FetchRequest["method"] })}><option>GET</option><option>POST</option></select></label><label>本地请求路径<input value={s.config.path} onChange={e => configure({ path: e.target.value })} /></label><label className="p3-toggle"><input type="checkbox" checked={s.config.online} onChange={e => configure({ online: e.target.checked })} />模拟网络可用</label></div>
    {s.config.method === "POST" && <><h4>请求JSON文本</h4><CodeEditor label="请求JSON编辑器" language="javascript" value={s.config.body} onChange={body => configure({ body })} /></>}
    <h4>响应JSON覆盖（留空使用API数据）</h4><CodeEditor label="响应JSON编辑器" language="javascript" value={s.config.override} onChange={override => configure({ override })} />
    <div className="row"><button type="button" className="btn" onClick={() => void send()} disabled={s.phase === "pending"}>发送本地请求</button><button type="button" className="btn secondary" onClick={() => setS(parseFetch(s))}>解析响应 JSON</button></div>
    <p role="status" className="foundation-note">{s.message}</p>
    <div className="p3-columns"><section><h4>Response与JSON文本</h4><pre className="p3-output" aria-label="API响应">{s.response ? `HTTP ${s.response.status} · ok=${s.response.ok}\n${s.response.text}` : `Promise ${s.phase === "pending" ? "pending" : s.phase === "rejected" ? "rejected（无Response）" : "尚未请求"}`}</pre></section><section><h4>解析后的JavaScript值</h4><pre className="p3-output" aria-label="解析对象">{s.parsedReady ? `${s.parsed === null ? "null" : typeof s.parsed}\n${JSON.stringify(s.parsed, null, 2)}` : "尚未成功解析"}</pre></section></div>
    <label>显示字段<input value={s.config.field} onChange={e => configure({ field: e.target.value })} /></label><p className="muted">改字段可直接读取已解析对象；改请求或响应文本则必须重新请求。</p>
    <button type="button" className="btn secondary" onClick={() => setS(displayFetch(s))}>把字段显示到页面</button><output className="p3-render" aria-label="数据页面">{s.displayed ?? "等待数据"}</output>
    <details><summary>把操作连成JavaScript</summary><pre className="p3-output">{`// 放在async函数中；out是已取得的页面元素\ntry {\n  const response = await fetch(${JSON.stringify(s.config.path)}${s.config.method === "POST" ? `, {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: ${JSON.stringify(s.config.body)}\n  }` : ""});\n  if (!response.ok) throw new Error("HTTP " + response.status);\n  const data = await response.json();\n  if (!data || typeof data !== "object" || !Object.hasOwn(data, ${JSON.stringify(s.config.field)}))\n    throw new Error("字段不存在");\n  out.textContent = data[${JSON.stringify(s.config.field)}];\n} catch (error) {\n  out.textContent = error.message;\n}`}</pre><p>代码展示真实fetch写法；本实验用显式本地Promise展开这些阶段，不执行互联网请求。覆盖JSON编辑器本身不会修改真实服务器。</p></details>
    {mode === "challenge" && <LabCheck key={s.task} valid={gradeFetch(s)} last={s.task === 3} onNext={() => { if (s.task === 3) onSolved?.(); else { generation.current++; setS(newFetchLab(s.task + 1)); } }} />}
    <button type="button" className="btn ghost" onClick={() => { generation.current++; setS(newFetchLab(s.task)); }}>重置当前实验</button>
  </div>;
}
