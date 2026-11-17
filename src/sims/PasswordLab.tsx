import { useEffect, useRef, useState } from "react";
import { Feedback } from "../components/ui";
import { DEMO_PASSWORDS, DEMO_SALTS, accountLabels, initialPasswordLab, chooseDemo, enrollDemo, verifyDemo, setManager, storeDemoInVault, setDemoMfa, setRecoveryPlace, presentDemoFactor, gradePassword, type PasswordLabState, type AccountId, type DemoPasswordId, type DemoSaltId, type RecoveryPlace, type PasswordTask } from "../grading/password";
import { LabTasks, LabTrace, type LabProps, type LabGrade } from "./NetworkLabUI";
import "../styles/security-labs.css";
const tasks: { id: PasswordTask; text: string }[] = [
  { id: "salt", text: "同一公开样本、不同Salt，分别实际注册两个账户；对任一账户提交一个错误候选和正确候选，比较实际派生记录。" },
  { id: "unique", text: "把两账户改为不同的管理器生成流程公开样本，保留不同Salt并重新注册；启用演示密码库，分别保存当前版本。上一任务的成果保留供你修改。" },
  { id: "mfa", text: "两账户登记演示MFA，恢复资料存独立离线位置；对任一账户实际验证口令、拒绝陌生钥匙，再使用登记钥匙完成登录。" },
];
const authLabels = { none: "尚未验证", rejected: "口令不匹配", "factor-needed": "口令正确，等待第二因子", "signed-in": "登录完成" };
export function PasswordLab({ mode, onSolved }: LabProps) {
  const [s, setS] = useState(initialPasswordLab), [account, setAccount] = useState<AccountId>("mail"), [candidate, setCandidate] = useState<DemoPasswordId>("reused");
  const [index, setIndex] = useState(0), [grade, setGrade] = useState<LabGrade | null>(null), [done, setDone] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const checkpoint = useRef(s), operation = useRef(0);
  useEffect(() => () => { operation.current++; }, []);
  const frozen = done || grade?.ok === true, a = s.accounts[account];
  const change = (fn: (s: PasswordLabState) => PasswordLabState) => { setS(fn); setGrade(null); setError(""); };
  const calculate = async (fn: (s: PasswordLabState) => Promise<PasswordLabState>) => {
    if (busy || frozen) return; const token = ++operation.current; setBusy(true); setError(""); setGrade(null);
    try { const next = await fn(s); if (operation.current === token) setS(next); }
    catch (e) { if (operation.current === token) setError((e as Error).message); }
    finally { if (operation.current === token) setBusy(false); }
  };
  const reset = () => { operation.current++; setBusy(false); setS(mode === "challenge" ? checkpoint.current : initialPasswordLab()); setGrade(null); setError(""); };
  const next = () => { if (!grade?.ok) return; if (index === tasks.length - 1) { setDone(true); onSolved?.(); } else { checkpoint.current = s; setIndex(index + 1); setGrade(null); } };
  return <div className="net-lab security-lab password-lab" aria-label="密码安全实验">
    {mode === "challenge" && <p className="net-mission">任务：{tasks[index]!.text}</p>}
    <p className="security-warning">公开样本实验 · 不输入真实密码 · 派生运算在本机进行，无网络请求。样本公开，不能用于真实账户。</p>
    <fieldset className="security-controls" disabled={busy || frozen}>
      <div className="net-fields"><label>演示账户<select value={account} onChange={e => setAccount(e.target.value as AccountId)}>{Object.entries(accountLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>待注册公开样本<select value={a.draft} onChange={e => change(s => chooseDemo(s, account, e.target.value as DemoPasswordId, a.salt))}>{Object.entries(DEMO_PASSWORDS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}</select></label><label>演示 Salt<select value={a.salt} onChange={e => change(s => chooseDemo(s, account, a.draft, e.target.value as DemoSaltId))}><option value="A">A · {DEMO_SALTS.A}</option><option value="B">B · {DEMO_SALTS.B}</option></select></label></div>
      <p>待注册公开值：<code>{DEMO_PASSWORDS[a.draft].value}</code>。选择尚不会修改已注册记录。</p>
      <button className="btn" onClick={() => void calculate(s => enrollDemo(s, account))}>实际派生并注册当前样本</button>
      <section className="security-record" aria-label="派生验证记录"><h4>{accountLabels[account]} · 记录v{a.version}</h4>{a.verifier ? <dl><dt>算法 / 成本</dt><dd>{a.verifier.algorithm} · {a.verifier.iterations}次</dd><dt>公开 Salt</dt><dd><code>{a.verifier.salt}</code></dd><dt>派生结果（256位）</dt><dd><code>{a.verifier.digest}</code></dd></dl> : <p>尚无验证材料，需要实际派生。</p>}</section>
      <div className="net-fields"><label>登录候选公开样本<select value={candidate} onChange={e => setCandidate(e.target.value as DemoPasswordId)}>{Object.entries(DEMO_PASSWORDS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}</select></label><button className="btn secondary" onClick={() => void calculate(s => verifyDemo(s, account, candidate))}>重新派生并验证候选</button></div>
      <p aria-label="演示登录状态">{authLabels[a.auth.stage]}{a.auth.factorPassed ? " · 第二因子已通过" : ""}</p>
      <div className="security-checks"><label><input type="checkbox" checked={s.manager} onChange={e => change(s => setManager(s, e.target.checked))} />启用演示密码库</label><label><input type="checkbox" checked={a.mfa} onChange={e => change(s => setDemoMfa(s, account, e.target.checked))} />当前账户登记演示MFA</label></div>
      <button className="btn secondary" onClick={() => change(s => storeDemoInVault(s, account))}>保存当前记录到演示密码库</button><p>当前账户密码库：{a.vaultVersion === a.version && a.verifier ? `已保存v${a.version}` : "未保存当前版本"}</p>
      <div className="net-fields"><label>当前账户恢复资料位置<select value={a.recovery} onChange={e => change(s => setRecoveryPlace(s, account, e.target.value as RecoveryPlace))}><option value="none">未保管</option><option value="same-device">同一设备</option><option value="offline">独立离线位置</option></select></label></div>
      <div className="row"><button className="btn secondary" onClick={() => change(s => presentDemoFactor(s, account, "stranger"))}>提交陌生演示钥匙</button><button className="btn secondary" onClick={() => change(s => presentDemoFactor(s, account, "registered"))}>提交登记演示钥匙</button></div>
    </fieldset>
    <p className="net-note" role="status">{busy ? "正在进行真实PBKDF2派生，请稍候……" : s.note}</p>{error && <Feedback ok={false}>{error}</Feedback>}
    <p className="muted">PBKDF2-HMAC-SHA-256是真实算法；600,000次是本演示固定成本，不是对所有生产环境的性能建议。固定盐只为可复现实验，真实系统每个记录应用安全随机Salt，并评估Argon2id等适当方案。密码库仅存公开样本引用，MFA钥匙与恢复位置仅为状态模型，不实现加密库、WebAuthn、TOTP或账户恢复服务。</p>
    <LabTrace events={s.trace} />
    <fieldset className="security-controls" disabled={busy}>{mode === "challenge" ? <LabTasks index={index} total={tasks.length} grade={grade} done={done} onCheck={() => setGrade(gradePassword(s, tasks[index]!.id))} onNext={next} onReset={reset} /> : <button className="btn ghost" onClick={reset}>重置实验</button>}</fieldset>
  </div>;
}
