import { useRef, useState } from "react";
import { initialPrivilege, permissionLabels, appLabels, purposeText, inspectPurpose, changeGrant, revokeApp, changeMeetingMode, selectNoteDraft, runApp, setAutoUpdate, installUpdate, setScreenLock, lockDevice, probeDevice, backupNotes, loseNotes, restoreNotes, gradePrivilege, publicNotes, type PrivilegeState, type AppId, type Permission, type PrivilegeTask } from "../grading/leastPrivilege";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
import "../styles/security-labs.css";
const tasks: { id: PrivilegeTask; text: string; app: AppId }[] = [
  { id: "scanner", text: "检查扫描器需求，撤销多余权限，只保留必要授权，实际拍摄并保存收据。全部撤销但功能失败也不能通过。", app: "scanner" },
  { id: "meeting", text: "先以最少授权接通语音，再切换视频任务、重新检查需求，只增补必要授权并接通视频。扫描器的最小权限成果要保留。", app: "meeting" },
  { id: "defense", text: "笔记同样缩小授权并实际运行；安装补丁、验证锁屏阻止访问。把当前笔记复制到独立离线位置，模拟故障、恢复同版本并重新运行。", app: "notes" },
];
export function PrivilegeLab({ mode, onSolved }: LabProps) {
  const [s, setS] = useState(initialPrivilege), [id, setId] = useState<AppId>("scanner"), [index, setIndex] = useState(0), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const checkpoint = useRef(s), a = s.apps[id], frozen = done || grade?.ok === true;
  const change = (fn: (s: PrivilegeState) => PrivilegeState) => { setS(fn); setGrade(null); };
  const reset = () => { setS(mode === "challenge" ? checkpoint.current : initialPrivilege()); setGrade(null); };
  const next = () => { if (!grade?.ok) return; if (index === tasks.length - 1) { setDone(true); onSolved?.(); } else { checkpoint.current = s; setId(tasks[index + 1]!.app); setIndex(index + 1); setGrade(null); } };
  return <div className="net-lab security-lab privilege-lab" aria-label="最小权限实验">
    {mode === "challenge" && <p className="net-mission">任务：{tasks[index]!.text}</p>}
    <p className="security-warning">全部是内存中的虚构应用、文件与设备 · 不申请真实相机、麦克风或文件权限，不修改操作系统。</p>
    <fieldset className="security-controls" disabled={frozen}>
      <div className="net-fields"><label>虚构应用<select value={id} onChange={e => setId(e.target.value as AppId)}>{Object.entries(appLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>{id === "meeting" && <label>课堂任务<select value={s.meetingMode} onChange={e => change(s => changeMeetingMode(s, e.target.value as "audio" | "video"))}><option value="audio">仅语音</option><option value="video">视频与语音</option></select></label>}</div>
      <button className="btn secondary" onClick={() => change(s => inspectPurpose(s, id))}>检查当前应用需求</button>
      <p aria-label="实际应用需求">{a.inspectedPurpose === a.purpose ? purposeText(id, s.meetingMode) : "当前任务需求尚未检查；先看任务，再决定授权。"}</p>
      <div className="security-checks" aria-label="应用权限">{(Object.keys(permissionLabels) as Permission[]).map(p => <label key={p}><input type="checkbox" checked={a.grants.includes(p)} onChange={e => change(s => changeGrant(s, id, p, e.target.checked))} />{permissionLabels[p]}</label>)}</div>
      <div className="row"><button className="btn ghost" onClick={() => change(s => revokeApp(s, id))}>撤销该应用全部授权</button><button className="btn" onClick={() => change(s => runApp(s, id))}>运行当前应用功能</button></div>
      <section className="security-record" aria-label="当前功能验证"><h4>{appLabels[id]} · 授权版本v{a.revision}</h4><p>{a.proof ? `${a.proof.output}；${a.proof.minimal ? "当前授权最小" : "仍存在多余授权"}` : "当前授权或任务下尚无成功功能结果"}</p></section>
      {id === "notes" && <div className="net-fields"><label>待保存公开笔记<select value={s.noteDraft} onChange={e => change(s => selectNoteDraft(s, e.target.value))}>{publicNotes.map(text => <option key={text}>{text}</option>)}</select></label></div>}
      {(mode === "free" || index === 2) && <section className="security-defense" aria-label="综合日常防护"><h4>设置要有效，也要亲手验证</h4>
        <div className="security-checks"><label><input type="checkbox" checked={s.autoUpdate} onChange={e => change(s => setAutoUpdate(s, e.target.checked))} />保持自动更新</label><label><input type="checkbox" checked={s.lockEnabled} onChange={e => change(s => setScreenLock(s, e.target.checked))} />启用锁屏策略</label></div>
        <div className="row"><button className="btn secondary" onClick={() => change(installUpdate)}>安装模拟补丁v2</button><button className="btn secondary" onClick={() => change(s => lockDevice(s, true))}>锁定模拟设备</button><button className="btn secondary" onClick={() => change(probeDevice)}>模拟陌生人读取</button><button className="btn secondary" onClick={() => change(s => lockDevice(s, false))}>拥有者解锁</button></div>
        <p aria-label="设备防护状态">已安装v{s.installed} · {s.locked ? "已锁定" : "未锁定"} · {s.blockedProbe === s.lockRevision ? "当前策略已实际阻止陌生人读取" : "尚无当前锁屏的阻止证明"}</p>
        <h4>备份不是“按过按钮”</h4><p aria-label="实际笔记内容">当前笔记：{s.notes ?? "已丢失，不能凭空生成"}</p><p aria-label="实际备份内容">备份：{s.backup ? `${s.backup.location === "offline" ? "独立离线" : "同一存储区"} · ${s.backup.data}` : "没有可用副本"}</p>
        <div className="row"><button className="btn secondary" onClick={() => change(s => backupNotes(s, "same-device"))}>复制到同一存储区</button><button className="btn secondary" onClick={() => change(s => backupNotes(s, "offline"))}>复制到独立离线位置</button><button className="btn secondary" onClick={() => change(loseNotes)}>模拟笔记存储故障</button><button className="btn secondary" onClick={() => change(restoreNotes)}>从实际副本恢复</button></div>
        <p aria-label="实际恢复结果">{s.restored === null ? "尚未实际恢复" : s.restored === s.lossTarget && s.notes === s.lossTarget ? "恢复内容与故障前版本一致；还须重新运行笔记功能" : "恢复内容与故障前版本不一致，不能宣称完整恢复"}</p>
      </section>}
    </fieldset>
    <p className="net-note" role="status">{s.note}</p><p className="muted">教学简化：这里只模拟任务能力检查，不映射某个系统的完整权限模型。应用清单可信；真实系统还需判断来源、更新和用途。锁屏测试不代表磁盘加密；故障只破坏笔记存储区，不代表整台设备。离线副本保留实际样本文字，未实现生产备份、加密、补丁下载或安全认证。</p><LabTrace events={s.trace} />
    {mode === "challenge" ? <LabTasks index={index} total={tasks.length} grade={grade} done={done} onCheck={() => setGrade(gradePrivilege(s, tasks[index]!.id))} onNext={next} onReset={reset} /> : <button className="btn ghost" onClick={reset}>重置实验</button>}
  </div>;
}
