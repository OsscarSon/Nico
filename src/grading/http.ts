/** Virtual HTTP/1.1 service and TLS-gated exchange. Whole-message abstraction, no sockets/crypto. */
import { initialTls, tlsStep, tlsProtected, type CertificateCase, type TlsAction, type TlsState } from "./tls";
export type HttpMethod = "GET" | "HEAD" | "POST" | "DELETE";
export type HttpRequest = { method: HttpMethod; path: string; headers: Record<string, string>; body: string };
export type HttpResponse = { status: number; reason: string; headers: Record<string, string>; body: string };
export type VirtualServer = { notes: { id: number; text: string }[]; nextId: number };
export const initialServer = (): VirtualServer => ({ notes: [], nextId: 1 });
const reasons: Record<number, string> = { 200: "OK", 201: "Created", 304: "Not Modified", 400: "Bad Request", 404: "Not Found", 405: "Method Not Allowed", 415: "Unsupported Media Type" };
export function parseHttpRequest(method: HttpMethod, path: string, headerText: string, body = ""): HttpRequest {
  if (!["GET", "HEAD", "POST", "DELETE"].includes(method)) throw Error("本实验支持GET、HEAD、POST、DELETE。");
  if (!path.startsWith("/") || path.startsWith("//") || /[\s#]/.test(path) || Array.from(path).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) || path.length > 200) throw Error("路径需以单个/开头，不含空格、片段#或控制字符，最多200字符。");
  if (headerText.length > 1000 || body.length > 1000) throw Error("Headers与请求体各最多1000字符。");
  const headers = Object.create(null) as Record<string, string>;
  const lines = headerText.replace(/\r\n/g, "\n").split("\n").filter(line => line.trim());
  if (lines.length > 12) throw Error("本实验最多12个Header字段。");
  for (const line of lines) {
    if (Array.from(line).some(c => (c.charCodeAt(0) < 32 && c !== "\t") || c.charCodeAt(0) === 127)) throw Error("Header值不允许控制字符。");
    const match = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*(.*)$/.exec(line);
    if (!match) throw Error("Header须逐行写成名称: 值，不允许控制字符。");
    const key = match[1]!.toLowerCase();
    if (Object.hasOwn(headers, key)) throw Error("本教学解析器不接受重复Header字段。");
    // A null-prototype map avoids special object keys becoming executable structure.
    Object.defineProperty(headers, key, { value: match[2]!.trim(), enumerable: true, configurable: true });
  }
  return { method, path, headers, body };
}
const html = (title: string, text: string) => `<h1>${title}</h1><p>${text}</p>`;
export function serveHttp(server: VirtualServer, request: HttpRequest, hostname = "www.example.com", scheme: "http" | "https" = "http"): { server: VirtualServer; response: HttpResponse } {
  const { method, headers } = request;
  const path = new URL(request.path, "http://www.example.com").pathname;
  const make = (status: number, body: string, type = "text/html; charset=utf-8", extra: Record<string, string> = {}) => ({ server, response: { status, reason: reasons[status]!, headers: { "content-type": type, ...(status === 304 ? {} : { "content-length": String(new TextEncoder().encode(body).length) }), ...extra }, body: method === "HEAD" || status === 304 ? "" : body } });
  const authority = headers.host?.toLowerCase(), host = hostname.toLowerCase();
  if (authority !== host && authority !== `${host}:${scheme === "https" ? 443 : 80}`) return make(400, html("400 Bad Request", "HTTP/1.1需要与本站默认端口匹配的Host字段。"));
  const item = /^\/api\/note\/(\d+)$/.exec(path);
  if (!["/", "/lesson", "/api/note"].includes(path) && !item) return make(404, html("404 Not Found", "服务器已回应，但这个资源路径不存在。"));
  const allowed = path === "/api/note" ? ["GET", "HEAD", "POST"] : ["GET", "HEAD"];
  if (!allowed.includes(method)) return make(405, html("405 Method Not Allowed", "资源不接受该方法。"), "text/html; charset=utf-8", { allow: allowed.join(", ") });
  if (method === "POST") {
    if (headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") return make(415, html("415 Unsupported Media Type", "此接口接收application/json，请修改Content-Type。"));
    let note: unknown;
    try { note = (JSON.parse(request.body) as { note?: unknown } | null)?.note; } catch { return make(400, html("400 Bad Request", "请求体不是合法JSON。")); }
    if (typeof note !== "string" || !note.trim() || Array.from(note).length > 80) return make(400, html("400 Bad Request", "JSON需有1–80码点的非空note字符串。"));
    if (server.notes.length >= 32) return make(400, html("400 Bad Request", "本实验最多32条记录，重置实验后再试。"));
    const record = { id: server.nextId, text: note };
    const result = make(201, JSON.stringify(record), "application/json", { location: `/api/note/${record.id}` });
    return { ...result, server: { notes: [...server.notes, record], nextId: server.nextId + 1 } };
  }
  let body: string, type: string, etag: string;
  if (path === "/api/note" || item) {
    const value = item ? server.notes.find(n => n.id === Number(item[1])) : server.notes;
    if (!value) return make(404, html("404 Not Found", "该记录不存在。"));
    body = JSON.stringify(value); type = "application/json"; etag = `"notes-${server.nextId}"`;
  } else {
    body = path === "/lesson" ? html("Nico Academy", "从真正收到的HTTP响应显示这门网络实验页面。") : html("Nico Home", "这是虚构教学站点的首页。");
    type = "text/html; charset=utf-8"; etag = path === "/lesson" ? '"nico-lesson-v1"' : '"nico-home-v1"';
  }
  if (headers["if-none-match"] === etag) return make(304, "", type, { etag });
  return make(200, body, type, { etag });
}
export type HttpReceipt = { request: HttpRequest; response: HttpResponse; protected: boolean };
export type HttpSession = {
  scheme: "http" | "https"; hostname: string; connected: boolean; tls: TlsState; identityRejected: boolean;
  stage: "ready" | "sent" | "processed" | "received"; server: VirtualServer;
  request: HttpRequest | null; pendingResponse: HttpResponse | null; response: HttpResponse | null; protectedRequest: boolean;
  receipts: HttpReceipt[]; error: boolean; note: string; trace: string[];
};
export function initialHttp(scheme: "http" | "https" = "http", hostname = "www.example.com", connected = true, certificateCase: CertificateCase = "valid"): HttpSession {
  return { scheme, hostname, connected, tls: initialTls(hostname, certificateCase), identityRejected: false, stage: "ready", server: initialServer(), request: null, pendingResponse: null, response: null, protectedRequest: false, receipts: [], error: false, note: "编辑请求；发送后还要让服务器处理，并接收响应。", trace: [] };
}
const note = (s: HttpSession, text: string, error = false): HttpSession => ({ ...s, error, note: text, trace: [...s.trace, text].slice(-60) });
export function restartHttpTls(s: HttpSession, scheme: "http" | "https", certificateCase: CertificateCase = "valid"): HttpSession {
  return { ...initialHttp(scheme, s.hostname, s.connected, certificateCase), server: s.server, receipts: s.receipts, identityRejected: s.identityRejected };
}
export function stepHttpTls(s: HttpSession, action: TlsAction): HttpSession {
  const tls = tlsStep(s.tls, action, s.connected);
  return note({ ...s, tls, identityRejected: s.identityRejected || tls.phase === "failed" }, tls.note, tls.phase === "failed");
}
export function sendHttp(s: HttpSession, method: HttpMethod, path: string, headers: string, body = ""): HttpSession {
  if (!s.connected) return note(s, "TCP连接尚未建立，不能发送HTTP请求。", true);
  if (s.scheme === "https" && !tlsProtected(s.tls)) return note(s, "HTTPS需要已核验并完成Finished的TLS会话，不能只切换https名称就发送。", true);
  if (s.stage === "sent" || s.stage === "processed") return note(s, "当前请求尚未接收响应，先处理本次交换。", true);
  try {
    const request = parseHttpRequest(method, path, headers, body);
    return note({ ...s, request, response: null, pendingResponse: null, stage: "sent", protectedRequest: s.scheme === "https" }, `已发送${method} ${path}，请求快照固定；${s.scheme === "https" ? "HTTP内容在受保护TLS应用记录中（教学模型，不生成密文）" : "本次HTTP请求内容可被被动观察者读取"}。`);
  } catch (e) { return note(s, (e as Error).message, true); }
}
export function processHttp(s: HttpSession): HttpSession {
  if (s.stage !== "sent" || !s.request) return note(s, "没有待处理的新请求；不会重复执行POST。", true);
  const result = serveHttp(s.server, s.request, s.hostname, s.scheme);
  return note({ ...s, server: result.server, pendingResponse: result.response, stage: "processed" }, `服务器按实际请求生成${result.response.status} ${result.response.reason}；浏览器还未接收。`);
}
export function receiveHttp(s: HttpSession): HttpSession {
  if (s.stage !== "processed" || !s.request || !s.pendingResponse) return note(s, "还没有可接收的服务器响应。", true);
  const response = s.pendingResponse;
  return note({ ...s, response, pendingResponse: null, stage: "received", receipts: [...s.receipts, { request: s.request, response, protected: s.protectedRequest }].slice(-16) }, `浏览器收到${response.status}；${response.body ? "现在才有实际响应体" : "响应体为空（HEAD/304不会带回表示正文）"}。`);
}
export type HttpTask = "path" | "post" | "tls";
export function gradeHttp(s: HttpSession, task: HttpTask) {
  const last = s.receipts.at(-1);
  if (!last || s.stage !== "received" || !s.response) return { ok: false, message: "还没有完成一次实际请求、服务器处理和响应接收。" };
  if (task === "path" && !(s.receipts.some(r => r.response.status === 404) && last.response.status === 200 && last.request.method === "GET" && new URL(last.request.path, "http://example.com").pathname === "/lesson")) return { ok: false, message: "先实际观察404，再修正为GET /lesson并接收200页面。" };
  if (task === "post" && !(s.receipts.some(r => r.response.status === 415) && last.response.status === 201 && last.request.method === "POST" && s.server.notes.length > 0)) return { ok: false, message: "先观察错误媒体类型415，再用application/json与有效note实际创建记录并接收201。" };
  if (task === "tls" && !(s.identityRejected && tlsProtected(s.tls) && s.scheme === "https" && last.protected && last.response.status === 200 && last.request.method === "GET" && new URL(last.request.path, "http://example.com").pathname === "/lesson")) return { ok: false, message: "需要实际拒绝错误身份，重建正确TLS，再通过该会话接收GET /lesson的200响应。" };
  return { ok: true, message: "实际请求与服务器响应符合任务，故障证据和修复结果均已记录。" };
}
