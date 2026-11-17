import { useState } from "react";
import { initialPhishing, messageCases, evidenceLabels, decisionLabels, inspectEvidence, verifyContact, decidePhishing, gradePhishing, type CaseId, type EvidenceKind, type Decision, type PhishingState } from "../grading/phishing";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
import "../styles/security-labs.css";
const tasks: { id: CaseId; text: string }[] = [{ id: "aid", text: "助学通知：检查四类证据，通过既有通讯录核实，再作风险决策。" }, { id: "urgent", text: "紧急维护：不要只凭“紧急”二字下结论，用实际证据区分合法通知与诈骗。" }, { id: "partner", text: "新报销流程：认证通过、没有威胁，是否已经足够提交资料？查明授权是否获得独立确认。" }];
export function PhishingLab({ mode, onSolved }: LabProps) {
  const [s, setS] = useState(initialPhishing), [index, setIndex] = useState(0), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false);
  const c = messageCases[s.caseId], frozen = done || (mode === "challenge" && grade?.ok === true);
  const change = (fn: (s: PhishingState) => PhishingState) => { setS(fn); setGrade(null); };
  const reset = () => { setS(initialPhishing(mode === "challenge" ? tasks[index]!.id : s.caseId)); setGrade(null); };
  const next = () => { if (!grade?.ok) return; if (index === tasks.length - 1) { setDone(true); onSolved?.(); } else { setS(initialPhishing(tasks[index + 1]!.id)); setIndex(index + 1); setGrade(null); } };
  return <div className="net-lab security-lab phishing-lab" aria-label="钓鱼核查实验">
    {mode === "challenge" && <p className="net-mission">任务：{tasks[index]!.text}</p>}
    <p className="security-warning">虚构收件箱 · 所有身份和.example域名均为演示 · 链接仅显示文本，不打开网站。</p>
    <fieldset className="security-controls" disabled={frozen}>
      {mode === "free" && <div className="net-fields"><label>虚构邮件<select value={s.caseId} onChange={e => { setS(initialPhishing(e.target.value as CaseId)); setGrade(null); }}>{Object.values(messageCases).map(c => <option key={c.id} value={c.id}>{c.subject}</option>)}</select></label></div>}
      <section className="security-record" aria-label="虚构邮件正文"><h4>{c.subject}</h4><p>{c.body}</p><p>邮件按钮显示文字：<code>{c.visibleLink}</code></p></section>
      <h4>先检查证据，再决定</h4><div className="row">{(Object.keys(evidenceLabels) as EvidenceKind[]).map(k => <button key={k} className="btn secondary" aria-pressed={s.inspected[k] !== undefined} onClick={() => change(s => inspectEvidence(s, k))}>检查{evidenceLabels[k]}</button>)}</div>
      <dl className="security-evidence" aria-label="已查看邮件证据">{(Object.keys(evidenceLabels) as EvidenceKind[]).map(k => <div key={k}><dt>{evidenceLabels[k]}</dt><dd>{s.inspected[k] ?? "尚未检查"}</dd></div>)}</dl>
      <h4>选择核实渠道</h4><div className="row"><button className="btn secondary" onClick={() => change(s => verifyContact(s, "message"))}>询问邮件提供的联系人</button><button className="btn" onClick={() => change(s => verifyContact(s, "directory"))}>用既有通讯录独立核实</button></div>
      <p aria-label="独立核实结果">{s.verification?.result ?? "尚无核实结果"}</p>
      <h4>提交你的风险决策</h4><div className="row">{(Object.keys(decisionLabels) as Decision[]).map(d => <button key={d} className="btn secondary" onClick={() => change(s => decidePhishing(s, d))}>{decisionLabels[d]}</button>)}</div>
      <p aria-label="风险决策记录">{s.decision ? `已提交：${decisionLabels[s.decision.choice]}；当时查看${Object.keys(s.decision.evidence).length}/4类证据；渠道：${s.decision.verification?.channel === "directory" ? "既有通讯录" : "缺少独立渠道"}` : "尚未提交决策"}</p>
    </fieldset>
    <p className="net-note" role="status">{s.note}</p><p className="muted">教学模型显示预设的邮件网关认证摘要，不执行SPF/DKIM/DMARC验证，也不是垃圾邮件检测器。“通过”不等于内容可信，“未通过”也可能受转发影响。核实结果来自本情景已知通讯录，不把邮件自称的身份当作证据。本实验从不提交密码、验证码、资金或个人资料。</p>
    <LabTrace events={s.trace} />
    {mode === "challenge" ? <LabTasks index={index} total={tasks.length} grade={grade} done={done} onCheck={() => setGrade(gradePhishing(s, tasks[index]!.id))} onNext={next} onReset={reset} /> : <><button className="btn secondary" onClick={() => setGrade(gradePhishing(s, s.caseId))}>评估当前决策</button>{grade && <p className="net-note" role="status">{grade.message}</p>}<button className="btn ghost" onClick={reset}>重置实验</button></>}
  </div>;
}
