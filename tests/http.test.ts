import { describe, it, expect } from "vitest";
import { initialHttp, initialServer, parseHttpRequest, serveHttp, sendHttp, processHttp, receiveHttp, stepHttpTls, restartHttpTls, gradeHttp, type HttpSession, type HttpMethod } from "../src/grading/http";
const HOST = "Host: www.example.com";
const exchange = (s: HttpSession, method: HttpMethod = "GET", path = "/lesson", headers = HOST, body = "") => receiveHttp(processHttp(sendHttp(s, method, path, headers, body)));
const tls = (s: HttpSession) => (["hello", "server", "verify", "finish"] as const).reduce(stepHttpTls, s);
describe("HTTP requests, representations and virtual server", () => {
  it("uses case-insensitive fields and path routing independent of query", () => {
    const r = parseHttpRequest("GET", "/lesson?unit=a", "hOsT: WWW.EXAMPLE.COM\r\nAccept: text/html");
    expect(serveHttp(initialServer(), r).response.status).toBe(200); expect(r.headers.accept).toBe("text/html");
  });
  it.each(["", "Host: wrong.example.com"])("returns 400 for missing or mismatched Host: %s", headers => expect(exchange(initialHttp(), "GET", "/lesson", headers).response?.status).toBe(400));
  it.each(["http", "https"] as const)("accepts the explicitly written default %s authority port", scheme => {
    const request = parseHttpRequest("GET", "/lesson", `Host: www.example.com:${scheme === "https" ? 443 : 80}`);
    expect(serveHttp(initialServer(), request, "www.example.com", scheme).response.status).toBe(200);
  });
  it("rejects a Host port that does not match this virtual service", () => expect(serveHttp(initialServer(), parseHttpRequest("GET", "/lesson", "Host: www.example.com:8787")).response.status).toBe(400));
  it("HEAD has GET's representation length and metadata but never a response body", () => {
    const get = exchange(initialHttp()), head = exchange(initialHttp(), "HEAD");
    expect(head.response?.status).toBe(200); expect(head.response?.body).toBe(""); expect(head.response?.headers["content-length"]).toBe(String(new TextEncoder().encode(get.response!.body).length));
  });
  it("conditional GET returns 304 without synthesizing cached content", () => {
    const first = exchange(initialHttp()); const etag = first.response!.headers.etag;
    const second = exchange(first, "GET", "/lesson", `${HOST}\nIf-None-Match: ${etag}`);
    expect(second.response?.status).toBe(304); expect(second.response?.body).toBe(""); expect(second.response?.headers["content-length"]).toBeUndefined();
  });
  it("valid JSON POST creates a real resource available through its Location", () => {
    const s = exchange(initialHttp(), "POST", "/api/note", `${HOST}\nContent-Type: application/json; charset=utf-8`, '{"note":"你好"}');
    expect(s.response?.status).toBe(201); expect(s.server.notes).toEqual([{ id: 1, text: "你好" }]);
    const get = exchange(s, "GET", s.response!.headers.location!); expect(JSON.parse(get.response!.body)).toEqual({ id: 1, text: "你好" });
  });
  it.each([['text/plain', '{"note":"hello"}', 415], ['application/json', '{broken', 400], ['application/json', '{"note":"  "}', 400], ['application/json', '{"note":10}', 400]] as const)("diagnoses %s with %s", (type, body, code) => {
    const s = exchange(initialHttp(), "POST", "/api/note", `${HOST}\nContent-Type: ${type}`, body); expect(s.response?.status).toBe(code); expect(s.server.notes).toEqual([]);
  });
  it("distinguishes a missing path from a method the resource disallows", () => {
    expect(exchange(initialHttp(), "GET", "/missing").response?.status).toBe(404);
    const bad = exchange(initialHttp(), "DELETE", "/lesson"); expect(bad.response?.status).toBe(405); expect(bad.response?.headers.allow).toBe("GET, HEAD");
    expect(exchange(initialHttp(), "HEAD", "/missing").response?.body).toBe("");
  });
  it("does not repeat POST side effects when server-processing is clicked twice", () => {
    const s = processHttp(sendHttp(initialHttp(), "POST", "/api/note", `${HOST}\nContent-Type: application/json`, '{"note":"once"}'));
    expect(s.server.notes).toHaveLength(1); expect(processHttp(s).server.notes).toHaveLength(1); expect(s.receipts).toEqual([]);
    expect(receiveHttp(receiveHttp(s)).receipts).toHaveLength(1);
  });
  it("uses the submitted request snapshot and exposes a response only when received", () => {
    const s = sendHttp(initialHttp(), "GET", "/missing", HOST); expect(s.response).toBeNull(); expect(s.pendingResponse).toBeNull();
    const processed = processHttp(s); expect(processed.response).toBeNull(); expect(processed.pendingResponse?.status).toBe(404);
    expect(sendHttp(processed, "GET", "/lesson", HOST).request?.path).toBe("/missing"); expect(receiveHttp(processed).response?.status).toBe(404);
  });
  it("cannot send HTTPS merely by selecting a scheme or deriving unverified keys", () => {
    let s = initialHttp("https"); expect(sendHttp(s, "GET", "/lesson", HOST).request).toBeNull();
    s = stepHttpTls(stepHttpTls(s, "hello"), "server"); expect(sendHttp(s, "GET", "/lesson", HOST).request).toBeNull();
    expect(sendHttp(initialHttp("http", "www.example.com", false), "GET", "/lesson", HOST).stage).toBe("ready");
  });
  it("rejects incorrect identity, resets only TLS/exchange, then accepts a protected real response", () => {
    let s = tls(initialHttp("https", "www.example.com", true, "wrong-name")); expect(s.identityRejected).toBe(true);
    expect(sendHttp(s, "GET", "/lesson", HOST).request).toBeNull(); s = tls(restartHttpTls(s, "https", "valid")); s = exchange(s);
    expect(s.receipts.at(-1)?.protected).toBe(true); expect(gradeHttp(s, "tls").ok).toBe(true);
    expect(gradeHttp(exchange(tls(initialHttp("https"))), "tls").ok).toBe(false);
  });
  it("grades each challenge from observed faults and actual outcomes", () => {
    expect(gradeHttp(exchange(initialHttp()), "path").ok).toBe(false);
    const fixed = exchange(exchange(initialHttp(), "GET", "/missing")); expect(gradeHttp(fixed, "path").ok).toBe(true);
    let post = exchange(initialHttp(), "POST", "/api/note", HOST, '{"note":"hello"}'); post = exchange(post, "POST", "/api/note", `${HOST}\nContent-Type: application/json`, '{"note":"hello"}');
    expect(gradeHttp(post, "post").ok).toBe(true); for (const task of ["path", "post", "tls"] as const) expect(gradeHttp(initialHttp(), task).ok).toBe(false);
  });
  it.each([["GET", "lesson", HOST], ["GET", "//elsewhere", HOST], ["GET", "/x#frag", HOST], ["GET", "/lesson", "Host: a\nHOST: b"], ["GET", "/lesson", "Host a"], ["GET", "/lesson", "Host: a\rbroken"], ["GET", "/lesson", "X: \u0000"], ["BOGUS", "/", HOST]] as const)("diagnoses construction errors: %s %s %s", (method, path, headers) => expect(() => parseHttpRequest(method as HttpMethod, path, headers)).toThrow());
  it("handles reserved field names as data and bounds request sizes", () => {
    const r = parseHttpRequest("GET", "/", `${HOST}\n__proto__: data\nconstructor: value`); expect(r.headers.__proto__).toBe("data"); expect(Object.getPrototypeOf(r.headers)).toBeNull();
    expect(() => parseHttpRequest("GET", "/", "x".repeat(1001))).toThrow(); expect(() => parseHttpRequest("POST", "/api/note", HOST, "x".repeat(1001))).toThrow();
  });
  it("bounds virtual records and keeps prior server snapshots immutable", () => {
    let s = initialHttp(); const original = structuredClone(s);
    for (let i = 0; i < 33; i++) s = exchange(s, "POST", "/api/note", `${HOST}\nContent-Type: application/json`, '{"note":"n"}');
    expect(s.server.notes).toHaveLength(32); expect(s.response?.status).toBe(400); expect(original.server.notes).toEqual([]);
    const untouched = initialHttp(), before = structuredClone(untouched); exchange(untouched); expect(untouched).toEqual(before);
  });
});
