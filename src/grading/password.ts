/** Public-fixture password lab: genuine native PBKDF2; no user passwords, cracking or network IO. */
export const DEMO_PASSWORDS = {
  reused: { label: "短且重复的公开样本", value: "nico1234", kind: "predictable" },
  long: { label: "长但可预测的公开样本", value: "nico-nico-nico-2026", kind: "predictable" },
  managerA: { label: "管理器生成流程样本A（公开）", value: "T7!qN4#vL9@rS2$xK6pB", kind: "generated-sample" },
  managerB: { label: "管理器生成流程样本B（公开）", value: "R8%wD3!mZ5&hC9@jF2sV", kind: "generated-sample" },
} as const;
export type DemoPasswordId = keyof typeof DEMO_PASSWORDS;
export const DEMO_SALTS = { A: "00112233445566778899aabbccddeeff", B: "ffeeddccbbaa99887766554433221100" } as const;
export type DemoSaltId = keyof typeof DEMO_SALTS;
export const KDF_ITERATIONS = 600_000;
export type PasswordVerifier = { algorithm: "PBKDF2-HMAC-SHA-256"; iterations: number; salt: string; digest: string };
async function derive(id: DemoPasswordId, salt: string): Promise<PasswordVerifier> {
  if (!Object.hasOwn(DEMO_PASSWORDS, id) || !/^[a-f0-9]{32}$/.test(salt)) throw Error("只允许公开演示口令与16字节演示Salt，不接受真实口令。");
  if (!globalThis.crypto?.subtle) throw Error("此环境不支持Web Crypto；不能用假哈希替代真实派生运算。");
  const key = await globalThis.crypto.subtle.importKey("raw", new TextEncoder().encode(DEMO_PASSWORDS[id].value), "PBKDF2", false, ["deriveBits"]);
  const saltBytes = Uint8Array.from(salt.match(/../g)!, h => Number.parseInt(h, 16));
  const bits = await globalThis.crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations: KDF_ITERATIONS, salt: saltBytes }, key, 256);
  return { algorithm: "PBKDF2-HMAC-SHA-256", iterations: KDF_ITERATIONS, salt, digest: Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("") };
}
export function deriveDemoVerifier(id: DemoPasswordId, salt: DemoSaltId): Promise<PasswordVerifier> {
  if (!Object.hasOwn(DEMO_SALTS, salt)) return Promise.reject(Error("未知演示Salt。"));
  return derive(id, DEMO_SALTS[salt]);
}
// Compares derived bytes, never plaintext passwords. No production timing guarantee is claimed for JS.
const sameDigest = (a: string, b: string): boolean => {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  let difference = 0; for (let i = 0; i < 64; i += 2) difference |= Number.parseInt(a.slice(i, i + 2), 16) ^ Number.parseInt(b.slice(i, i + 2), 16);
  return difference === 0;
};
export type AccountId = "mail" | "photos";
export const accountLabels: Record<AccountId, string> = { mail: "校园演示邮箱", photos: "相册演示账号" };
export type RecoveryPlace = "none" | "same-device" | "offline";
type AuthState = { stage: "none" | "rejected" | "factor-needed" | "signed-in"; version: number; factorPassed: boolean };
export type DemoAccount = { draft: DemoPasswordId; salt: DemoSaltId; version: number; verifier: PasswordVerifier | null; enrolledFrom: DemoPasswordId | null; vaultVersion: number | null; mfa: boolean; recovery: RecoveryPlace; auth: AuthState };
type Event = { account: AccountId; version: number; kind: "password-fail" | "mfa-required" | "factor-reject" | "signed-in"; factor: boolean };
export type PasswordLabState = { accounts: Record<AccountId, DemoAccount>; manager: boolean; events: Event[]; note: string; trace: string[] };
const blankAccount = (): DemoAccount => ({ draft: "reused", salt: "A", version: 0, verifier: null, enrolledFrom: null, vaultVersion: null, mfa: false, recovery: "none", auth: { stage: "none", version: 0, factorPassed: false } });
export const initialPasswordLab = (): PasswordLabState => ({ accounts: { mail: blankAccount(), photos: blankAccount() }, manager: false, events: [], note: "仅使用公开样本，不输入、保存或发送你的真实密码。", trace: [] });
const note = (s: PasswordLabState, text: string): PasswordLabState => ({ ...s, note: text, trace: [...s.trace, text].slice(-40) });
const update = (s: PasswordLabState, id: AccountId, value: DemoAccount, text: string): PasswordLabState => note({ ...s, accounts: { ...s.accounts, [id]: value } }, text);
export function chooseDemo(s: PasswordLabState, id: AccountId, draft: DemoPasswordId, salt: DemoSaltId): PasswordLabState {
  if (!Object.hasOwn(DEMO_PASSWORDS, draft) || !Object.hasOwn(DEMO_SALTS, salt)) return note(s, "只能选择公开样本与演示Salt。");
  return update(s, id, { ...s.accounts[id], draft, salt }, "已更改待注册样本；旧验证材料不会被输入选择自动改写，需要重新注册。");
}
export async function enrollDemo(s: PasswordLabState, id: AccountId): Promise<PasswordLabState> {
  const a = s.accounts[id], verifier = await deriveDemoVerifier(a.draft, a.salt), version = a.version + 1;
  return update(s, id, { ...a, verifier, version, enrolledFrom: a.draft, vaultVersion: null, auth: { stage: "none", version, factorPassed: false } }, `${accountLabels[id]}已实际派生并保存验证材料v${version}，没有把口令明文存入服务端记录；旧登录和演示密码库版本失效。`);
}
export async function verifyDemo(s: PasswordLabState, id: AccountId, candidate: DemoPasswordId): Promise<PasswordLabState> {
  const a = s.accounts[id]; if (!a.verifier) return note(s, "先实际注册演示账户，不能凭空验证。");
  const derived = await derive(candidate, a.verifier.salt);
  const matches = a.verifier.algorithm === derived.algorithm && a.verifier.iterations === derived.iterations && sameDigest(a.verifier.digest, derived.digest);
  const stage = !matches ? "rejected" : a.mfa ? "factor-needed" : "signed-in";
  const kind: Event["kind"] = !matches ? "password-fail" : a.mfa ? "mfa-required" : "signed-in";
  const next = update(s, id, { ...a, auth: { stage, version: a.version, factorPassed: false } }, !matches ? "重新派生的结果不匹配，拒绝候选；未进行猜测循环或破解。" : a.mfa ? "口令派生验证正确，但仍需登记的第二因子，不能仅凭口令登录。" : "重新派生结果匹配，完成本演示的口令验证；尚未配置MFA。");
  return { ...next, events: [...s.events, { account: id, version: a.version, kind, factor: false }].slice(-32) };
}
export function setManager(s: PasswordLabState, enabled: boolean): PasswordLabState { return note({ ...s, manager: enabled }, enabled ? "演示密码库已启用；只保存公开样本引用，不是实际加密保险库。" : "演示密码库已关闭。"); }
export function storeDemoInVault(s: PasswordLabState, id: AccountId): PasswordLabState {
  const a = s.accounts[id]; if (!s.manager || !a.verifier) return note(s, "先启用演示密码库并注册账户。");
  return update(s, id, { ...a, vaultVersion: a.version }, `已把${accountLabels[id]}当前v${a.version}样本引用放入演示库。`);
}
export function setDemoMfa(s: PasswordLabState, id: AccountId, enabled: boolean): PasswordLabState {
  const a = s.accounts[id]; return update(s, id, { ...a, mfa: enabled, auth: { stage: "none", version: a.version, factorPassed: false } }, enabled ? "已登记本账户的演示安全钥匙；这不是WebAuthn/TOTP实现，旧登录证明已清除。" : "已移除演示MFA，需重新验证登录。");
}
export function setRecoveryPlace(s: PasswordLabState, id: AccountId, recovery: RecoveryPlace): PasswordLabState {
  return update(s, id, { ...s.accounts[id], recovery }, recovery === "offline" ? "演示恢复资料已存入独立离线保管位置。" : "恢复资料尚未放在独立离线位置；同一设备丢失可能同时失去因子与恢复资料。");
}
export function presentDemoFactor(s: PasswordLabState, id: AccountId, key: "registered" | "stranger"): PasswordLabState {
  const a = s.accounts[id]; if (!a.mfa || a.auth.stage !== "factor-needed" || a.auth.version !== a.version) return note(s, "先通过本账户当前版本的口令验证，并处于等待第二因子的状态。");
  const passed = key === "registered";
  const next = update(s, id, { ...a, auth: { ...a.auth, stage: passed ? "signed-in" : "factor-needed", factorPassed: passed } }, passed ? "演示登记钥匙匹配，本账户MFA登录完成。此处仅模拟因子状态，不执行真实硬件认证。" : "陌生演示钥匙不匹配，仍不能登录。");
  const event: Event = { account: id, version: a.version, kind: passed ? "signed-in" : "factor-reject", factor: passed };
  return { ...next, events: [...s.events, event].slice(-32) };
}
export type PasswordTask = "salt" | "unique" | "mfa";
const managed = (s: PasswordLabState): boolean => {
  const a = s.accounts.mail, b = s.accounts.photos;
  return s.manager && !!a.verifier && !!b.verifier && a.verifier.salt !== b.verifier.salt && a.enrolledFrom !== null && b.enrolledFrom !== null && a.enrolledFrom !== b.enrolledFrom && DEMO_PASSWORDS[a.enrolledFrom].kind === "generated-sample" && DEMO_PASSWORDS[b.enrolledFrom].kind === "generated-sample" && a.vaultVersion === a.version && b.vaultVersion === b.version;
};
export function gradePassword(s: PasswordLabState, task: PasswordTask) {
  const a = s.accounts.mail, b = s.accounts.photos;
  if (task === "salt") {
    const verified = (["mail", "photos"] as const).some(id => s.events.some(e => e.account === id && e.version === s.accounts[id].version && e.kind === "password-fail") && s.events.some(e => e.account === id && e.version === s.accounts[id].version && e.kind === "signed-in"));
    if (!(a.verifier && b.verifier && a.enrolledFrom === b.enrolledFrom && a.verifier.salt !== b.verifier.salt && a.verifier.digest !== b.verifier.digest && verified)) return { ok: false, message: "用同一公开口令、不同Salt实际注册两个账户，再对任一当前记录实际验证一个错误候选和一个正确候选。" };
  } else if (!managed(s)) return { ok: false, message: "需要两个不同的管理器生成流程样本、不同Salt，实际注册并保存当前版本到演示库；长但可预测或重复样本不满足目标。" };
  if (task === "mfa") {
    const proved = (["mail", "photos"] as const).some(id => { const x = s.accounts[id]; return x.auth.stage === "signed-in" && x.auth.version === x.version && x.auth.factorPassed && ["mfa-required", "factor-reject"].every(kind => s.events.some(e => e.account === id && e.version === x.version && e.kind === kind)); });
    if (!(a.mfa && b.mfa && a.recovery === "offline" && b.recovery === "offline" && proved)) return { ok: false, message: "两账户登记MFA并独立保存恢复资料；对任一当前账户，实际经历口令正确仍需因子、拒绝陌生钥匙、登记钥匙登录。" };
  }
  return { ok: true, message: "当前账户、真实派生结果和验证/配置记录符合本任务，未使用真实用户口令。" };
}
