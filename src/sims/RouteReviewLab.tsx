import { useState } from "react";
import { SITE_BASE } from "../grading/deployment";
import { buildReview, commitReview, editReview, gradeReview, newReview, publishReview, queryReview, visitReview } from "../grading/routeReview";
import { statusOf } from "../grading/git";
import { previewDocument } from "../grading/web";
import { LabCheck, type P3Props } from "./p3aShared";

export function RouteReviewLab({ mode, onSolved }: P3Props) {
  const [state, setState] = useState(newReview);
  const [path, setPath] = useState("/api/profile?id=1");
  const [field, setField] = useState<"name" | "id" | "points">("name");
  const [directory, setDirectory] = useState<"." | "dist">(".");
  const [address, setAddress] = useState("/");
  const [resetKey, setResetKey] = useState(0);
  const result = gradeReview(state);
  const head = state.repo.branches.main!;
  const snapshot = state.repo.commits[head]!;
  const status = statusOf(state.repo);
  const site = state.site.visit;

  return <div className="p3-lab" aria-label="路线结业联调">
    <p className="p3-task">交付目标：在 {SITE_BASE} 发布成员 2 的最新积分</p>
    <div className="p3-fields">
      <label>接口路径<input value={path} onChange={e => setPath(e.target.value)} /></label>
      <label>读取字段<select aria-label="读取字段" value={field} onChange={e => setField(e.target.value as typeof field)}>
        <option>name</option><option>id</option><option>points</option>
      </select></label>
      <button type="button" className="btn secondary" onClick={() => setState(s => queryReview(s, path, field))}>查询并解析 JSON</button>
    </div>
    <pre className="p3-output" aria-label="接口响应">{state.response || "尚无响应体"}</pre>
    <div className="row">
      <button type="button" className="btn secondary" onClick={() => setState(editReview)}>写入工作区</button>
      <button type="button" className="btn secondary" onClick={() => setState(s => commitReview(s, "stage"))}>暂存文件</button>
      <button type="button" className="btn secondary" onClick={() => setState(s => commitReview(s, "commit"))}>提交快照</button>
    </div>
    <div className="p3-columns">
      <section><h4>工作区</h4><pre className="p3-output">{state.repo.work["src/index.html"]}</pre><p>{status.clean ? "干净" : "有未提交的修改"}</p></section>
      <section><h4>main 提交 {head}</h4><pre className="p3-output">{snapshot.files["src/index.html"]}</pre></section>
    </div>
    <div className="p3-fields">
      <label>发布目录<select aria-label="发布目录" value={directory} onChange={e => setDirectory(e.target.value as typeof directory)}>
        <option value=".">项目根目录</option><option value="dist">dist</option>
      </select></label>
      <button type="button" className="btn secondary" onClick={() => setState(buildReview)}>从提交构建</button>
      <button type="button" className="btn secondary" onClick={() => setState(s => publishReview(s, directory))}>发布模拟快照</button>
    </div>
    <p>构建来源 {state.buildCommit ?? "尚未构建"} · 发布来源 {state.publishedCommit ?? "尚未发布"}</p>
    <div className="p3-fields">
      <label>访问路径<input value={address} onChange={e => setAddress(e.target.value)} /></label>
      <button type="button" className="btn" onClick={() => setState(s => visitReview(s, address))}>访问模拟站点</button>
    </div>
    {site && <section className="p3-render" aria-label="访问结果">
      <strong>HTTP {site.status}</strong>
      <p>{site.url}</p>
      {site.status === 200
        ? <iframe className="web-preview" title="发布快照预览" sandbox="" srcDoc={previewDocument(site.html)} />
        : <pre className="p3-output">{site.html}</pre>}
    </section>}
    <p className="foundation-note" role="status">{state.note}</p>
    <ul className="checklist" aria-label="交付验收">
      {[
        [result.correct, "读到成员 2 的积分"], [result.committed, "提交包含更新且工作区干净"],
        [result.published, "发布含当前提交产物"], [result.verified, "已从项目地址验证当前快照"],
      ].map(([passed, label]) => <li key={String(label)} data-ok={String(passed)}>
        <b>{passed ? "通过" : "待完成"}</b> {label}
      </li>)}
    </ul>
    {mode === "challenge" && <LabCheck key={resetKey} valid={result.verified} last onNext={() => onSolved?.()} />}
    <button type="button" className="btn ghost" onClick={() => {
      setState(newReview()); setPath("/api/profile?id=1"); setField("name"); setDirectory("."); setAddress("/"); setResetKey(key => key + 1);
    }}>重置当前实验</button>
  </div>;
}
