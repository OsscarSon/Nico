import { useState } from "react";
import { cloneGithub, COLLAB_TARGET, commandGithub, editGithub, gradeGithub, inspectGithub, mergeGithub, newGithub, openGithubPr, peerGithub, pullGithub, pushGithub, resolveGithub, reviewGithub } from "../grading/github";
import { statusOf } from "../grading/git";
import { LabCheck, type P3Props } from "./p3aShared";
export function GithubLab({ mode, onSolved }: P3Props) {
  const [s, setS] = useState(newGithub), [command, setCommand] = useState("");
  const actions = [["Clone到本地", cloneGithub], ["Push当前分支", pushGithub], ["创建 Pull Request", openGithubPr], ["队友提交更新", peerGithub], ["Pull远程main", pullGithub], ["完成冲突解决", resolveGithub], ["查看远程差异", inspectGithub], ["批准当前版本", reviewGithub], ["合并 Pull Request", mergeGithub]] as const;
  return <div className="p3-lab" aria-label="GitHub协作实验室">
    <p className="p3-task">{mode === "challenge" ? "协作挑战：把双方修改带回本地main" : "自由实验：Git与GitHub的职责分开观察"}</p>
    <p>模拟远程origin，绝非真实GitHub；无需Token。先clone，建feature分支，把标题改为编程社，add/commit/push并开PR；再让队友提交联系方式，pull、对照版本手动解决冲突；push并查看差异/批准/合并，最后切main再pull。</p>
    <details><summary>任务验收文件与命令提示</summary><pre className="p3-output">{COLLAB_TARGET}</pre><p>这是最终应同时保留的两项修改，不是一键自动解题。</p><code>git switch -c feature</code><br /><code>git add .</code><br /><code>git commit -m "更新标题"</code><br /><code>git switch main</code><p>Pull按钮在本实验明确表示fetch origin/main后合并到当前分支；真实git pull默认目标取决于upstream配置。</p></details>
    <div className="p3-columns"><section className="p3-snapshot" aria-label="本地仓库"><h4>本地仓库</h4>{s.local ? <><p>HEAD：{s.local.head} · {s.local.branches[s.local.head]} · {statusOf(s.local).clean ? "干净" : "有未提交修改"}</p><pre className="p3-output">{Object.entries(s.local.branches).map(([b, id]) => `${b} → ${id}`).join("\n")}</pre><label>本地 index.html<textarea aria-label="本地 index.html" value={s.local.work["index.html"] ?? ""} onChange={e => setS(editGithub(s, e.target.value))} rows={4} /></label></> : <p>尚未clone，本地无仓库</p>}</section><section className="p3-snapshot" aria-label="远程仓库"><h4>远程仓库（模拟）</h4><pre className="p3-output">{Object.entries(s.remote.branches).map(([b, id]) => `${b} → ${id}`).join("\n")}</pre><pre className="p3-output">{s.remote.commits[s.remote.branches.main!]!.files["index.html"]}</pre><p>PR：{s.pr?.status ?? "未创建"} · {s.conflict ? "冲突待解决" : "无待处理冲突"}</p>{s.conflict && <details open><summary>对照冲突双方</summary><pre className="p3-output">{`共同祖先：\n${s.local?.commits[s.conflict.base]?.files["index.html"]}\n本地提交：\n${s.local?.commits[s.conflict.ours]?.files["index.html"]}\n远程提交：\n${s.remote.commits[s.conflict.theirs]?.files["index.html"]}`}</pre></details>}</section></div>
    <form className="p3-fields" onSubmit={e => { e.preventDefault(); setS(commandGithub(s, command)); setCommand(""); }}><label>本地Git命令<input value={command} onChange={e => setCommand(e.target.value)} autoCapitalize="off" spellCheck={false} placeholder='git switch -c feature' /></label><button type="submit" className="btn">运行本地命令</button></form>
    <div className="row">{actions.map(([label, action]) => <button type="button" className="btn secondary" key={label} onClick={() => setS(action(s))}>{label}</button>)}</div>
    <pre className="p3-output" role="status">{s.message}</pre>
    {mode === "challenge" && <LabCheck valid={gradeGithub(s)} last onNext={() => onSolved?.()} />}
    <button type="button" className="btn ghost" onClick={() => { setS(newGithub()); setCommand(""); }}>重置当前实验</button>
  </div>;
}
