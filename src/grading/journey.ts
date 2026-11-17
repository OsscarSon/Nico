/** Composite navigation: actual DNS plan + old TCP state machine + TLS/HTTP models. */
import { resolve, emptyCache, type Cache, type Resolution } from "./dns";
import { initialTcp, dropTcp, tickTcp, type TcpState } from "./tcp";
import { applyTcpCommand, connectedTcp, type TcpCommand } from "./connection";
import { initialHttp, stepHttpTls, restartHttpTls, sendHttp, processHttp, receiveHttp, type HttpSession, type HttpMethod } from "./http";
import { tlsProtected, type CertificateCase, type TlsAction } from "./tls";
export const DNS_ANSWER_TTL = 5;
export const serviceAddresses: Record<string, string> = { "www.example.com": "203.0.113.10", "www.example.org": "198.51.100.7" };
export type JourneyScenario = "free" | "cache" | "loss" | "http";
export const journeyTasks: { id: Exclude<JourneyScenario, "free">; title: string }[] = [
  { id: "cache", title: "旧DNS答案：先观察错误目标连接失败，清除答案或等TTL到期，再访问正确页面" },
  { id: "loss", title: "握手丢包：丢弃任一握手报文，到期重传恢复，再完成HTTPS访问" },
  { id: "http", title: "404：先接收并显示错误页，再修正网址路径，显示正确页面" },
];
export type ParsedJourneyUrl = { scheme: "http" | "https"; hostname: string; target: string };
export function parseJourneyUrl(input: string): ParsedJourneyUrl {
  if (input.length > 240) throw Error("网址最多240字符。");
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw Error("请输入完整http://或https://网址。"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) throw Error("本模型只支持HTTP/HTTPS默认端口，不接受凭据或自定义端口。");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(hostname) || !hostname.includes(".") || !/[a-z]/.test(hostname)) throw Error("本实验输入完整域名，不使用单标签主机名、IP字面量或IPv6网址。");
  return { scheme: url.protocol === "https:" ? "https" : "http", hostname, target: url.pathname + url.search };
}
export type JourneyState = {
  scenario: JourneyScenario; url: string; parsed: ParsedJourneyUrl | null;
  phase: "idle" | "dns" | "dns-error" | "connect" | "tls" | "http" | "display";
  clock: number; cache: Cache; expires: Record<string, number>; resolution: Resolution | null; dnsCursor: number; externalQueries: number; resolvedIp: string | null;
  tcp: TcpState; http: HttpSession; attempt: number;
  evidence: { staleAddressTried: boolean; invalidated: boolean; freshLookup: boolean; saw404: boolean; displayed404: boolean; cacheHits: number };
  rendered: { kind: "document" | "error" | "data"; text: string; sourceBody: string; status: number; attempt: number } | null;
  note: string; error: boolean; trace: string[];
};
// The old TCP constructor requires a payload; here it is unused because only
// its handshake is modeled. Full HTTP messages belong to HttpSession below.
export function initialJourney(scenario: JourneyScenario = "free"): JourneyState {
  const stale = scenario === "cache";
  return { scenario, url: `https://www.example.com/${scenario === "http" ? "missing" : "lesson"}`, parsed: null, phase: "idle", clock: 0,
    cache: stale ? { answers: { "www.example.com": "203.0.113.99" }, zones: ["com", "example.com"] } : emptyCache(), expires: stale ? { "www.example.com": DNS_ANSWER_TTL } : {},
    resolution: null, dnsCursor: 0, externalQueries: 0, resolvedIp: null, tcp: initialTcp("GET"), http: initialHttp("https", "www.example.com", false), attempt: 0,
    evidence: { staleAddressTried: false, invalidated: false, freshLookup: false, saw404: false, displayed404: false, cacheHits: 0 }, rendered: null, note: "输入网址后开始访问；每个协议阶段都有自己的完成条件。", error: false, trace: [] };
}
const note = (s: JourneyState, text: string, error = false): JourneyState => ({ ...s, note: text, error, trace: [...s.trace, `[t=${s.clock}] ${text}`].slice(-100) });
export function navigateJourney(s: JourneyState, url: string): JourneyState {
  let parsed: ParsedJourneyUrl;
  try { parsed = parseJourneyUrl(url); } catch (e) { return note(s, (e as Error).message, true); }
  const expired = Object.keys(s.cache.answers).filter(name => (s.expires[name] ?? -1) <= s.clock);
  const answers = Object.fromEntries(Object.entries(s.cache.answers).filter(([name]) => !expired.includes(name)));
  const cache = { answers, zones: [...s.cache.zones] };
  const resolution = resolve(parsed.hostname, cache);
  return note({ ...s, url: url.trim(), parsed, phase: "dns", cache, resolution, dnsCursor: 0, resolvedIp: null,
    tcp: initialTcp("GET"), http: initialHttp(parsed.scheme, parsed.hostname, false), rendered: null, attempt: s.attempt + 1,
    evidence: { ...s.evidence, invalidated: s.evidence.invalidated || expired.includes("www.example.com") } },
  `访问${parsed.scheme}://${parsed.hostname}${parsed.target}；片段#不会发送给HTTP服务器。${expired.length ? "已剔除到期DNS答案。" : ""}先完成DNS，尚无可用地址或连接。`);
}
export function stepJourneyDns(s: JourneyState): JourneyState {
  if (s.phase !== "dns" || !s.resolution || !s.parsed) return note(s, "当前没有待处理DNS步骤。", true);
  const step = s.resolution.steps[s.dnsCursor];
  if (!step) return note(s, "DNS步骤已经结束。", true);
  const dnsCursor = s.dnsCursor + 1;
  let next = { ...s, dnsCursor, externalQueries: s.externalQueries + Number(step.asksServer) };
  if (dnsCursor === s.resolution.steps.length) {
    const ip = s.resolution.ip, cached = s.resolution.steps.some(x => x.kind === "cache");
    next = { ...next, phase: ip ? "connect" : "dns-error", resolvedIp: ip, cache: s.resolution.cache,
      // A cache hit does not extend the original answer's TTL.
      expires: ip && !cached ? { ...s.expires, [s.parsed.hostname]: s.clock + DNS_ANSWER_TTL } : s.expires,
      evidence: { ...s.evidence, cacheHits: s.evidence.cacheHits + Number(cached), freshLookup: s.evidence.freshLookup || (!cached && !!ip && s.parsed.hostname === "www.example.com") } };
  }
  return note(next, `DNS ${step.from} → ${step.to}：${step.reply || step.question}`, next.phase === "dns-error");
}
export function clearJourneyAnswers(s: JourneyState): JourneyState {
  return note({ ...s, cache: { answers: {}, zones: [...s.cache.zones] }, expires: {}, evidence: { ...s.evidence, invalidated: s.evidence.invalidated || Object.hasOwn(s.cache.answers, "www.example.com") } }, "已清除DNS答案缓存，保留区指引。已选定的地址和现有连接不会被魔法改写，请重新访问网址触发查询。");
}
export function tickJourney(s: JourneyState): JourneyState {
  return note({ ...s, clock: s.clock + 1, tcp: tickTcp(s.tcp) }, "推进一个教学逻辑时刻：DNS答案会到期，未确认握手报文可能达到重传阈值；不自动投递。");
}
export function commandJourneyTcp(s: JourneyState, command: TcpCommand): JourneyState {
  if (command.type === "tick") return tickJourney(s);
  if (s.phase !== "connect" || !s.parsed || !s.resolvedIp) return note(s, "先取得DNS地址，且只能在连接阶段操作握手。", true);
  if (command.type === "data") return note(s, "本课数据阶段使用完整HTTP消息抽象；TCP数据分段/重传见A14和A15。", true);
  const packet = command.type === "deliver" ? s.tcp.channel.find(p => p.id === command.id) : null;
  if (packet?.kind === "SYN" && packet.availableAt <= s.tcp.clock && (!Object.hasOwn(serviceAddresses, s.parsed.hostname) || s.resolvedIp !== serviceAddresses[s.parsed.hostname])) {
    const tcp = dropTcp(s.tcp, packet.id);
    const wasCached = s.resolution?.steps.some(step => step.kind === "cache") ?? false;
    return note({ ...s, tcp, evidence: { ...s.evidence, staleAddressTried: s.evidence.staleAddressTried || (wasCached && s.parsed.hostname === "www.example.com") } }, `SYN到达${s.resolvedIp}，该地址没有本站教学服务，收不到SYN-ACK。DNS有答复不等于地址仍正确；清除答案或等到期后重新访问。`, true);
  }
  const tcp = applyTcpCommand(s.tcp, command);
  const established = connectedTcp(tcp);
  return note({ ...s, tcp, http: { ...s.http, connected: established }, phase: established ? s.parsed.scheme === "https" ? "tls" : "http" : "connect" }, tcp.note);
}
export function stepJourneyTls(s: JourneyState, action: TlsAction): JourneyState {
  if (s.phase !== "tls" || !connectedTcp(s.tcp)) return note(s, "先完成双方TCP建立，才能继续本次TLS握手。", true);
  const http = stepHttpTls(s.http, action);
  return note({ ...s, http, phase: tlsProtected(http.tls) ? "http" : "tls" }, http.note, http.error);
}
export function restartJourneyTls(s: JourneyState, certificateCase: CertificateCase): JourneyState {
  if (!connectedTcp(s.tcp) || s.parsed?.scheme !== "https") return note(s, "先建立本次HTTPS的TCP连接。", true);
  return note({ ...s, http: restartHttpTls(s.http, "https", certificateCase), phase: "tls", rendered: null }, "重新建立本次TLS会话，旧握手状态不会沿用。");
}
export function sendJourneyHttp(s: JourneyState, method: HttpMethod, headers: string, body = ""): JourneyState {
  if (s.phase !== "http" || !s.parsed || !connectedTcp(s.tcp) || !Object.hasOwn(serviceAddresses, s.parsed.hostname) || s.resolvedIp !== serviceAddresses[s.parsed.hostname]) return note(s, "DNS目标、TCP或TLS阶段尚未完成，不能跳到HTTP请求。", true);
  const http = sendHttp(s.http, method, s.parsed.target, headers, body);
  return note({ ...s, http, rendered: null }, http.note, http.error);
}
export function processJourneyHttp(s: JourneyState): JourneyState {
  if (s.phase !== "http") return note(s, "尚未进入HTTP阶段。", true);
  const http = processHttp(s.http); return note({ ...s, http }, http.note, http.error);
}
export function receiveJourneyHttp(s: JourneyState): JourneyState {
  if (s.phase !== "http") return note(s, "尚未进入HTTP阶段。", true);
  const http = receiveHttp(s.http);
  return note({ ...s, http, evidence: { ...s.evidence, saw404: s.evidence.saw404 || (!http.error && http.response?.status === 404) } }, http.note, http.error);
}
export function renderJourney(s: JourneyState): JourneyState {
  const response = s.http.response;
  if (s.phase !== "http" || s.http.stage !== "received" || !response) return note(s, "必须先接收本次实际响应，不能提前显示预制页面。", true);
  if (!response.body) return note(s, "HEAD/304没有响应体；本实验不提供HTTP缓存副本，不能凭空生成页面。", true);
  const isHtml = response.headers["content-type"]?.startsWith("text/html");
  const kind = response.status >= 400 ? "error" : isHtml ? "document" : "data";
  // Only a text preview of the virtual server's fixed HTML templates; no script execution/DOM engine.
  const text = isHtml ? response.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : response.body;
  return note({ ...s, phase: "display", evidence: { ...s.evidence, displayed404: s.evidence.displayed404 || response.status === 404 }, rendered: { kind, text, sourceBody: response.body, status: response.status, attempt: s.attempt } }, kind === "error" ? `显示真实${response.status}错误页；连接与TLS成功不保证资源路径存在。` : "从实际收到的响应体显示内容，不是播放预制访问动画。", kind === "error");
}
export function gradeJourney(s: JourneyState, scenario: JourneyScenario = s.scenario) {
  if (s.phase !== "display" || s.rendered?.kind !== "document" || s.rendered.status !== 200 || s.rendered.attempt !== s.attempt || s.rendered.sourceBody !== s.http.response?.body || s.parsed?.hostname !== "www.example.com" || new URL(s.parsed.target, "http://example.com").pathname !== "/lesson" || s.parsed.scheme !== "https" || s.resolvedIp !== serviceAddresses[s.parsed.hostname] || !connectedTcp(s.tcp) || !tlsProtected(s.http.tls) || !s.http.protectedRequest || s.http.request?.method !== "GET") return { ok: false, message: "尚未用正确DNS地址、双方TCP连接、已核验TLS和实际GET /lesson响应显示200页面。" };
  if (scenario === "cache" && !(s.evidence.staleAddressTried && s.evidence.invalidated && s.evidence.freshLookup)) return { ok: false, message: "需要先实际尝试旧缓存地址并失败，再使答案失效并重新查询成功；不能绕过故障直接完成。" };
  if (scenario === "loss" && !(s.tcp.lost.some(k => ["SYN", "SYN-ACK", "ACK"].includes(k)) && s.tcp.retransmitted.some(k => k === "SYN" || k === "SYN-ACK"))) return { ok: false, message: "本次成功连接还缺少实际握手丢失与到期重传恢复的证据。" };
  if (scenario === "http" && !(s.evidence.saw404 && s.evidence.displayed404)) return { ok: false, message: "需要先实际接收并显示404，再修改网址路径重新访问成功。" };
  return { ok: true, message: "实际DNS→TCP→TLS→HTTP→响应→页面链路完成，且本情景故障与修复证据成立。" };
}
