import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "../../app/router";
import { aiEnabled } from "../../ai/config";
import { clearProgress, getProgress, importProgress, useProgress } from "../../progress/useProgress";
import { parseProgress, streak, type Progress } from "../../progress/store";
import { preferenceWarning, setPreferences, usePreferences } from "../../preferences/store";
import { ProfileEditor } from "../profile/ProfileEditor";
import { version } from "../../../package.json";

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; text: string }[]; onChange: (v: T) => void }) {
  return <div className="segmented" role="group" aria-label={label}>{options.map(o => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.text}</button>)}</div>;
}
function Setting({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="setting-row"><div className="setting-text"><strong>{title}</strong><p>{description}</p></div>{children}</div>;
}
export function SettingsPage() {
  const progress = useProgress(), preferences = usePreferences(), fileRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false), [clearProfile, setClearProfile] = useState(false), [incoming, setIncoming] = useState<Progress | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const announce = (text: string, kind: "ok" | "error" = "ok") => setMessage({ kind, text });
  const exportData = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: "application/json" }), a = document.createElement("a");
    const url = URL.createObjectURL(blob); a.href = url; a.download = `nico-progress-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    announce("已导出学习记录。请妥善保存；该文件不含昵称与界面偏好。");
  };
  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ""; setIncoming(null); if (!file) return;
    if (file.size > 1_000_000) { announce("文件太大，不像是 Nico 的学习记录备份。", "error"); return; }
    try {
      const parsed = parseProgress(await file.text());
      if (!parsed || Object.values(parsed.lessons).some(r => !Number.isInteger(r.quizTotal) || !Number.isInteger(r.firstTryCorrect) || r.quizTotal < 0 || r.firstTryCorrect < 0 || r.firstTryCorrect > r.quizTotal)) { announce("无法导入：这不是有效的 Nico 学习记录备份（或版本不匹配）。当前记录没有被改动。", "error"); return; }
      setIncoming(parsed); announce("备份校验通过，等待确认合并。当前记录尚未改动。");
    } catch { announce("无法读取备份文件，请重新选择。当前记录没有被改动。", "error"); }
  };
  const merge = () => { if (!incoming) return; const before = getProgress(); importProgress(incoming); const after = getProgress(); setIncoming(null); announce(`已合并导入：新增 ${Object.keys(after.lessons).length - Object.keys(before.lessons).length} 个已完成课时、${after.activeDays.length - before.activeDays.length} 个学习日。按原合并规则保留更早的首次完成记录。`); };
  const ai = aiEnabled();
  return <>
    <header className="page-head"><span className="eyebrow">为自己调整学习空间</span><h1>设置</h1><p>所有偏好和学习资料仅保存在此浏览器。无需账号，不会上传到云端。</p></header>
    {preferenceWarning() && <p className="settings-message error" role="status">{preferenceWarning()}</p>}
    <div className="settings-grid">
      <section className="panel settings-list" aria-labelledby="appearance-title"><h2 id="appearance-title">外观</h2>
        <Setting title="主题" description="默认暗色；跟随系统会立即响应设备外观变化。"><Segmented label="主题" value={preferences.theme} onChange={theme => setPreferences({ theme })} options={[{ value: "dark", text: "暗色" }, { value: "light", text: "亮色" }, { value: "system", text: "跟随系统" }]} /></Setting>
        <Setting title="字号" description="立即调整界面与课程阅读字号。"><Segmented label="字号" value={preferences.font} onChange={font => setPreferences({ font })} options={[{ value: "normal", text: "标准" }, { value: "large", text: "大" }]} /></Setting>
        <Setting title="信息密度" description="紧凑模式缩小面板与列表间距，触控目标仍至少44px。"><Segmented label="信息密度" value={preferences.density} onChange={density => setPreferences({ density })} options={[{ value: "comfortable", text: "舒适" }, { value: "compact", text: "紧凑" }]} /></Setting>
        <Setting title="动效" description="减少动效会关闭过渡、脉冲与平滑滚动；默认尊重设备减少动效偏好。"><Segmented label="动效" value={preferences.motion} onChange={motion => setPreferences({ motion })} options={[{ value: "system", text: "跟随设备" }, { value: "reduce", text: "减少动效" }]} /></Setting>
        <div className="appearance-preview"><span className="pill available">外观预览</span><p>理解一点，再亲手试一试。</p><code>01001110 · Nico</code></div>
      </section>
      <section className="panel settings-list" aria-labelledby="learning-title"><h2 id="learning-title">学习</h2>
        <Setting title="默认进入页面" description="只影响未带明确地址的新访问；首页按钮和已有课程链接始终按原地址打开。"><label className="sr-only" htmlFor="landing">默认进入页面</label><select id="landing" value={preferences.landing} onChange={e => setPreferences({ landing: e.target.value as typeof preferences.landing })}><option value="/">首页</option><option value="/paths">路线</option><option value="/courses">课程</option><option value="/me">我的</option></select></Setting>
        <Setting title="目录显示" description="统一影响课程目录、路线图和路线课程列表，不会更改课程真实开放状态。"><label className="setting-check"><input type="checkbox" checked={preferences.showPlanned} onChange={e => setPreferences({ showPlanned: e.target.checked })} />显示规划课程</label></Setting>
        <Setting title="首页推荐" description="开启时优先推荐上次未完成课程；关闭后推荐下一门。直接打开课程仍沿用原续学机制，不清除进度。"><label className="setting-check"><input type="checkbox" checked={preferences.resumeHome} onChange={e => setPreferences({ resumeHome: e.target.checked })} />首页优先继续上次学习</label></Setting>
        <p className="muted">下一课推荐会优先考虑你的偏好路线，可在个人资料中调整。</p>
      </section>
      <section className="panel settings-list" aria-labelledby="profile-title"><h2 id="profile-title">个人资料</h2><ProfileEditor /><Link to="/me" className="btn ghost">查看我的学习档案</Link></section>
      <section className="panel settings-list" aria-labelledby="ai-title"><h2 id="ai-title">AI 服务</h2>
        <Setting title="配置状态" description={ai ? "已配置服务地址，尚未检测连通性；实际调用仍可能失败，输出会标注AI生成。" : "尚未配置 AI 服务地址，AI 功能已关闭。本地指令检查仍可使用。"}><span className={`pill ${ai ? "available" : "draft"}`}>{ai ? "已配置 · 未检测连接" : "未配置"}</span></Setting>
        <Setting title="快捷入口" description="只控制实验台和课内AI快捷入口的显示；不代表连接、断开服务或删除AI数据。直接地址仍可访问。"><label className="setting-check"><input type="checkbox" checked={preferences.showAiLinks} onChange={e => setPreferences({ showAiLinks: e.target.checked })} />显示AI快捷入口</label></Setting>
        <Link to="/lab" className="btn secondary">打开实验台</Link>
      </section>
      <section className="panel settings-list" aria-labelledby="data-title"><h2 id="data-title">数据与隐私</h2>
        <Setting title="学习记录" description={`${Object.keys(progress.lessons).length} 个已完成课时 · 连续学习 ${streak(progress, new Date())} 天 · ${progress.activeDays.length} 个实际学习日`} />
        <Setting title="备份与恢复" description="沿用v1进度备份和只增不减的合并规则；同一课时保留更早的首次完成记录。导入前先校验并确认，不上传文件。"><div className="row"><button className="btn secondary" onClick={exportData}>导出</button><button className="btn secondary" onClick={() => fileRef.current?.click()}>导入</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPick} aria-label="选择要导入的学习记录文件" /></div></Setting>
        {incoming && <div className="data-confirm"><p>待合并备份：{Object.keys(incoming.lessons).length}门已完成课、{incoming.activeDays.length}个学习日。确认前当前记录不变。</p><div className="row"><button className="btn" onClick={merge}>确认合并导入</button><button className="btn ghost" onClick={() => { setIncoming(null); announce("已取消导入，当前记录未改动。"); }}>取消导入</button></div></div>}
        <Setting title="清除学习记录" description="只删除此浏览器中的课程进度、连续天数及由其得出的徽章；昵称和偏好保留。操作无法恢复，请先导出。">{confirming ? <div className="row"><button className="btn danger-button" onClick={() => { clearProgress(); setConfirming(false); setIncoming(null); announce("学习记录已清除，个人资料与偏好保留。"); }}>确认清除，无法恢复</button><button className="btn ghost" onClick={() => setConfirming(false)}>取消</button></div> : <button className="btn ghost" onClick={() => setConfirming(true)}>清除学习记录</button>}</Setting>
        <Setting title="清除本机个人资料" description="只清除昵称和偏好学习路线，学习记录及其他外观设置不变。">{clearProfile ? <div className="row"><button className="btn danger-button" onClick={() => { setPreferences({ nickname: "", learningPath: "" }); setClearProfile(false); announce("本机昵称与学习路线偏好已清除，学习记录未改动。"); }}>确认清除个人资料</button><button className="btn ghost" onClick={() => setClearProfile(false)}>取消清除个人资料</button></div> : <button className="btn ghost" onClick={() => setClearProfile(true)}>清除本机个人资料</button>}</Setting>
        {message && <p className={`settings-message ${message.kind}`} role="status">{message.text}</p>}
      </section>
      <section className="panel settings-list" aria-labelledby="about-title"><h2 id="about-title">关于 Nico</h2><p>Nico Academy · v{version}</p><p className="muted">React、TypeScript、Vite与现有开源编辑器构建。原版美术、Byte与课程设计持续保留。</p><div className="row"><a className="btn ghost" href="https://github.com/OsscarSon/Nico" target="_blank" rel="noopener noreferrer">源码 ↗</a><a className="btn ghost" href="https://github.com/OsscarSon/Nico/blob/main/docs/DEPENDENCIES.md" target="_blank" rel="noopener noreferrer">依赖与许可说明 ↗</a></div><p className="muted">尚未提供：账号和云同步、通知排程、学习时长统计、等级/XP、正式认证。已有课程质量以课内标记和真实试学记录为准。</p></section>
    </div>
  </>;
}
