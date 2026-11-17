/** Entirely fictional inbox. Reserved .example domains are text evidence, never navigated. */
export type CaseId = "aid" | "urgent" | "partner" | "quiet" | "survey";
export type EvidenceKind = "sender" | "link" | "request" | "pressure";
export type Decision = "report" | "hold" | "official";
type MessageCase = {
  id: CaseId; subject: string; body: string; from: string; replyTo: string; auth: "pass" | "fail";
  visibleLink: string; target: string; request: "credentials" | "unknown-process" | "known-process";
  requestText: string; pressure: string; directory: "confirmed" | "denied" | "unknown"; directoryText: string;
};
export const messageCases: Record<CaseId, MessageCase> = {
  aid: { id: "aid", subject: "星桥校园：助学名额即将失效", body: "请按邮件按钮补交资料，逾期名额自动转给他人。", from: "aid@campus.example", replyTo: "help@account-check.example", auth: "fail", visibleLink: "https://campus.example/aid", target: "https://campus.example.account-check.example/claim", request: "credentials", requestText: "要求在链接中输入校园密码与当前MFA验证码。", pressure: "声称只剩15分钟，要求不要联系学校。", directory: "denied", directoryText: "校内通讯录中的助学办公室：没有该活动，从不索要密码或MFA码。" },
  urgent: { id: "urgent", subject: "星桥校园：紧急维护通知", body: "今晚维护。请自行从原有书签打开校园门户查看公告，无须回复本邮件。", from: "security@campus.example", replyTo: "security@campus.example", auth: "pass", visibleLink: "https://campus.example/security", target: "https://campus.example/security", request: "known-process", requestText: "只要求从已有书签查看公告，不索要口令、验证码或转账。", pressure: "今晚开始维护，时间紧；允许按通讯录联系核实。", directory: "confirmed", directoryText: "校内通讯录中的服务台：公告编号M-42真实，可从已有校园书签查看；不通过邮件收取秘密。" },
  partner: { id: "partner", subject: "云杉合作社：新的报销资料流程", body: "请使用新表单提交报销材料，具体流程尚未在校内门户发布。", from: "office@partner.example", replyTo: "office@partner.example", auth: "pass", visibleLink: "https://forms.partner.example/new", target: "https://forms.partner.example/new", request: "unknown-process", requestText: "要求向新的外部表单提交报销资料；暂未核实该流程授权。", pressure: "下周前处理，没有紧急威胁，也没有索要密码。", directory: "unknown", directoryText: "校内通讯录中的财务窗口：暂未确认这套新流程，需进一步核实授权；当前无法作真伪结论。" },
  quiet: { id: "quiet", subject: "校园账号例行资料同步", body: "有空时同步一下资料即可，没有截止日期。", from: "accounts@campus-support.example", replyTo: "accounts@campus-support.example", auth: "pass", visibleLink: "https://campus-support.example/profile", target: "https://campus-support.example/profile", request: "credentials", requestText: "要求提供校园密码与MFA验证码，以便工作人员代为同步。", pressure: "语气平和，无紧急关键词。", directory: "denied", directoryText: "已知校园服务台：该域名不属于学校，也没有代收密码和MFA验证码的流程。" },
  survey: { id: "survey", subject: "云杉合作社：匿名阅读调查", body: "自愿填写课程阅读偏好，不登录，不提交个人资料。", from: "research@partner.example", replyTo: "research@partner.example", auth: "pass", visibleLink: "https://forms.partner.example/reading", target: "https://forms.partner.example/reading", request: "known-process", requestText: "只收匿名阅读偏好，不索要身份信息、密码或MFA码。", pressure: "自愿参与，可随时拒绝。", directory: "confirmed", directoryText: "已知校园教务窗口：该合作调查已获授权；可从校内门户的合作项目入口独立进入。" },
};
export const evidenceLabels: Record<EvidenceKind, string> = { sender: "发件身份", link: "链接目标", request: "请求内容", pressure: "施压方式" };
export const decisionLabels: Record<Decision, string> = { report: "拒绝并报告", hold: "暂缓并继续核实", official: "从已知官方入口处理" };
export function belongsToDomain(host: string, domain: string): boolean {
  const h = host.toLowerCase(), d = domain.toLowerCase(); return h === d || h.endsWith(`.${d}`);
}
export function evidenceFor(c: MessageCase, kind: EvidenceKind): string {
  if (kind === "sender") return `From: ${c.from}；Reply-To: ${c.replyTo}；教学邮件网关的SPF/DKIM/DMARC结果：${c.auth === "pass" ? "通过（仅说明相关域的认证通过，不保证请求可信）" : "未通过（需结合其他证据，转发等也可能影响认证）"}`;
  if (kind === "link") return `显示文字：${c.visibleLink}；实际目标：${c.target}；主机名：${new URL(c.target).hostname}`;
  return kind === "request" ? c.requestText : c.pressure;
}
type Verification = { caseId: CaseId; channel: "directory" | "message"; result: string };
type DecisionRecord = { caseId: CaseId; choice: Decision; evidence: Partial<Record<EvidenceKind, string>>; verification: Verification | null };
export type PhishingState = { caseId: CaseId; inspected: Partial<Record<EvidenceKind, string>>; verification: Verification | null; decision: DecisionRecord | null; note: string; trace: string[] };
export const initialPhishing = (caseId: CaseId = "aid"): PhishingState => ({ caseId, inspected: {}, verification: null, decision: null, note: "全部为虚构邮件与保留域名；不发送信息、不打开外部网站。", trace: [] });
const say = (s: PhishingState, text: string): PhishingState => ({ ...s, note: text, trace: [...s.trace, text].slice(-24) });
export function inspectEvidence(s: PhishingState, kind: EvidenceKind): PhishingState {
  const text = evidenceFor(messageCases[s.caseId], kind); return say({ ...s, inspected: { ...s.inspected, [kind]: text } }, `已查看${evidenceLabels[kind]}：${text}`);
}
export function verifyContact(s: PhishingState, channel: "directory" | "message"): PhishingState {
  const result = channel === "directory" ? messageCases[s.caseId].directoryText : "邮件自带的联络方式自称：一切正常，请照做。它不是独立核实渠道。";
  return say({ ...s, verification: { caseId: s.caseId, channel, result } }, result);
}
export function decidePhishing(s: PhishingState, choice: Decision): PhishingState {
  return say({ ...s, decision: { caseId: s.caseId, choice, evidence: { ...s.inspected }, verification: s.verification ? { ...s.verification } : null } }, `已提交“${decisionLabels[choice]}”，保存的是决策当时实际查看的证据；补查后须重新决策。`);
}
/** Evidence-derived policy for these fixtures, not a general spam classifier or keyword detector. */
export function recommendedDecision(c: MessageCase): Decision {
  const host = new URL(c.target).hostname;
  if (c.request === "credentials" || c.directory === "denied") return "report";
  const recognized = belongsToDomain(host, "campus.example") || belongsToDomain(host, "forms.partner.example");
  return c.directory === "confirmed" && c.request === "known-process" && recognized ? "official" : "hold";
}
export function gradePhishing(s: PhishingState, requiredCase: CaseId) {
  const c = messageCases[requiredCase], d = s.decision;
  if (s.caseId !== requiredCase || !d || d.caseId !== requiredCase) return { ok: false, message: "先在当前情景查看证据并提交风险决策；换情景后的旧记录不算数。" };
  if (!(Object.keys(evidenceLabels) as EvidenceKind[]).every(k => d.evidence[k] === evidenceFor(c, k))) return { ok: false, message: "决策记录缺少真实的发件身份、链接目标、请求内容或施压证据；只反复检查同一项不够，补查后重新提交。" };
  if (d.verification?.channel !== "directory" || d.verification.caseId !== requiredCase || d.verification.result !== c.directoryText) return { ok: false, message: "需要使用既有通讯录的独立核实结果；邮件提供的联系方式不能为自己担保。" };
  const expected = recommendedDecision(c);
  if (d.choice !== expected) return { ok: false, message: expected === "report" ? "实际请求索要秘密或已被独立渠道否认，应拒绝并报告；认证通过、语气平和也不能抵消这些证据。" : expected === "hold" ? "当前授权仍未确认，不能武断宣布安全或确定诈骗；暂缓提交资料并继续核实。" : "独立渠道已确认正常流程且没有索要秘密；无需仅因“紧急”二字判成诈骗，应从已知官方入口处理。" };
  return { ok: true, message: `实际检查记录与独立核实支持“${decisionLabels[expected]}”。这只是本情景的有依据决策，不是自动识别所有诈骗的算法。` };
}
