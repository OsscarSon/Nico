import { useEffect, useRef, useState } from "react";
import { buildDeployment, configureDeployment, DEPLOY_TASKS, editDeployment, gradeDeployment, inspectDeployment, newDeployment, publishDeployment, recordRuntime, SITE_BASE, SITE_ORIGIN, visitDeployment, type StaticVisit } from "../grading/deployment";
import { runJs } from "../runtime/js";
import { CodeEditor } from "./code/CodeEditor";
import { LabCheck, type P3Props } from "./p3aShared";
import "../styles/code.css";

/** Strip executable HTML. Only published script resources go through the existing loop-guarded runner. */
function previewPage(v: StaticVisit): string {
  const doc = new DOMParser().parseFromString(v.html, "text/html");
  doc.querySelectorAll("script,style,link,base,meta,iframe,object,embed,svg,math").forEach(e => e.remove());
  doc.querySelectorAll("*").forEach(e => { for (const a of [...e.attributes]) if (!['id', 'class', 'type', 'value', 'disabled'].includes(a.name.toLowerCase())) e.removeAttribute(a.name); });
  const css = v.resources.filter(r => r.kind === "style" && r.status === 200).map(r => r.text).join("\n").replace(/</g, "\\3c ");
  return `<style>${css}</style>${doc.body.innerHTML}`;
}
export function DeploymentLab({ mode, onSolved }: P3Props) {
  const [s, setS] = useState(() => newDeployment()), [file, setFile] = useState("src/index.html"), [address, setAddress] = useState<string>(SITE_BASE), [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null), generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const visit = async () => {
    const id = ++generation.current, current = visitDeployment(s, address); setS(current); container.current?.replaceChildren();
    const v = current.visit;
    if (!v || v.status !== 200 || v.resources.some(r => r.status !== 200)) return;
    setBusy(true);
    const script = v.resources.filter(r => r.kind === "script").map(r => r.text).join("\n");
    try {
      if (/<\/script/i.test(script)) throw Error("教学JS文件不可含HTML结束标签；仅通过受保护的脚本入口执行。");
      const result = await runJs({ page: previewPage(v), code: script, container: container.current, harness: 'console.log(JSON.stringify({heading:document.querySelector("h1")?.textContent ?? "",message:document.querySelector("#message")?.textContent ?? "",color:document.querySelector("h1") ? getComputedStyle(document.querySelector("h1")).color : ""}));' });
      if (generation.current !== id) return;
      let measured = { heading: "", message: "", color: "" };
      try { measured = JSON.parse(result.stdout.split("\n").at(-1) ?? "{}"); } catch { /* An invalid runtime report cannot pass. */ }
      setS(latest => recordRuntime(latest, { deployment: v.deployment, url: v.url, ...measured, error: result.error }));
    } catch (e) { if (generation.current === id) setS(latest => recordRuntime(latest, { deployment: v.deployment, url: v.url, heading: "", message: "", color: "", error: e instanceof Error ? e.message : "预览执行失败" })); }
    finally { if (generation.current === id) setBusy(false); }
  };
  const reset = (task: number) => { generation.current++; setBusy(false); setS(newDeployment(task)); setFile("src/index.html"); setAddress(SITE_BASE); container.current?.replaceChildren(); };
  return <div className="p3-lab" aria-label="静态网页发布实验室">
    <p className="p3-task">{mode === "challenge" ? `任务 ${s.task + 1}/3：${DEPLOY_TASKS[s.task]!.title}` : "自由实验：源码 → 产物 → 发布快照 → 访问"}</p>
    <p>{mode === "challenge" ? DEPLOY_TASKS[s.task]!.help : "检查文件、构建并发布，试着换目录和资源路径。编辑源码后直接访问旧站点，观察旧发布快照仍不变。"}</p>
    <p>验收：标题“编程社”为蓝色，JS将消息改为“来自已发布的 JS”；仅HTTP200还不够。{SITE_ORIGIN}是保留域名，此处只有内存模拟，页面在原隔离沙盒中真实运行，不代表互联网发布。</p>
    <label>项目文件<select aria-label="项目文件" value={file} onChange={e => setFile(e.target.value)}>{Object.keys(s.files).map(path => <option key={path}>{path}</option>)}</select></label>
    <CodeEditor key={file} label="发布项目代码编辑器" language={file.endsWith("html") ? "html" : file.endsWith("css") ? "css" : "javascript"} value={s.files[file] ?? ""} onChange={text => setS(editDeployment(s, file, text))} />
    <div className="p3-fields"><label>源目录<input value={s.source} onChange={e => setS(configureDeployment(s, { source: e.target.value }))} /></label><label>构建输出目录<input value={s.output} onChange={e => setS(configureDeployment(s, { output: e.target.value }))} /></label><label>发布目录<input value={s.publishDir} onChange={e => setS(configureDeployment(s, { publishDir: e.target.value }))} /></label></div>
    <div className="row"><button type="button" className="btn secondary" onClick={() => setS(inspectDeployment(s))}>检查项目文件</button><button type="button" className="btn secondary" onClick={() => setS(buildDeployment(s))}>构建静态产物</button><button type="button" className="btn" onClick={() => { generation.current++; setBusy(false); container.current?.replaceChildren(); setS(publishDeployment(s)); }}>部署到模拟站点</button></div>
    <div className="p3-columns"><section><h4>构建输出快照</h4><pre className="p3-output">{s.built ? `源码版本 ${s.built.revision}\n${Object.keys(s.built.files).join("\n")}` : "尚未构建"}</pre></section><section><h4>已发布快照</h4><pre className="p3-output">{s.deployed ? `发布 ${s.deployed.id}\n${Object.keys(s.deployed.files).join("\n")}` : "尚未部署"}</pre></section></div>
    <div className="p3-fields"><label>模拟访问路径<input value={address} onChange={e => setAddress(e.target.value)} /></label><button type="button" className="btn" disabled={busy} onClick={() => void visit()}>{busy ? "验证中…" : "访问并验证页面"}</button></div>
    <p role="status" className="foundation-note">{s.message}</p>
    {s.visit && <pre className="p3-output" aria-label="发布请求记录">{`${s.visit.status} ${s.visit.url}\n${s.visit.resources.map(r => `${r.status} ${r.url}`).join("\n")}`}</pre>}
    <div className="p3-preview" ref={container} aria-label="已发布页面的隔离预览" />
    {mode === "challenge" && <LabCheck key={s.task} valid={gradeDeployment(s)} last={s.task === 2} onNext={() => s.task === 2 ? onSolved?.() : reset(s.task + 1)} />}
    <button type="button" className="btn ghost" onClick={() => reset(s.task)}>重置当前实验</button>
  </div>;
}
