import { describe, it, expect } from "vitest";
import { initialJourney, navigateJourney, stepJourneyDns, commandJourneyTcp, stepJourneyTls, restartJourneyTls, sendJourneyHttp, processJourneyHttp, receiveJourneyHttp, renderJourney, gradeJourney, clearJourneyAnswers, tickJourney, parseJourneyUrl, type JourneyState } from "../src/grading/journey";
const dns = (s: JourneyState, url = s.url) => { s = navigateJourney(s, url); let guard = 0; while (s.phase === "dns" && guard++ < 20) s = stepJourneyDns(s); if (guard >= 20) throw Error("DNS stuck"); return s; };
const connect = (s: JourneyState) => { s = commandJourneyTcp(s, { type: "start" }); let guard = 0; while (s.phase === "connect" && s.tcp.channel.length && guard++ < 20) s = commandJourneyTcp(s, { type: "deliver", id: s.tcp.channel[0]!.id }); if (guard >= 20) throw Error("TCP stuck"); return s; };
const tls = (s: JourneyState) => (["hello", "server", "verify", "finish"] as const).reduce(stepJourneyTls, s);
const exchange = (s: JourneyState, method: "GET" | "HEAD" = "GET", extra = "") => receiveJourneyHttp(processJourneyHttp(sendJourneyHttp(s, method, `Host: ${s.parsed!.hostname}${extra}`)));
const page = (s: JourneyState) => renderJourney(exchange(s));
const complete = (s: JourneyState) => page(tls(connect(dns(s))));
describe("composite website navigation", () => {
  it("requires real DNS, both TCP endpoints, authenticated TLS, HTTP response reception and rendering", () => {
    const s = complete(initialJourney()); expect(s.phase).toBe("display"); expect(s.externalQueries).toBe(3); expect(s.rendered?.text).toContain("Nico Academy"); expect(s.rendered?.sourceBody).toBe(s.http.response?.body); expect(gradeJourney(s).ok).toBe(true);
  });
  it("does not permit static playback or skipping protocol stages", () => {
    const s = initialJourney(); expect(commandJourneyTcp(s, { type: "start" }).tcp.client).toBe("CLOSED"); expect(stepJourneyTls(s, "finish").http.tls.phase).toBe("idle");
    expect(sendJourneyHttp(s, "GET", "Host: www.example.com").http.request).toBeNull(); expect(processJourneyHttp(s).http.response).toBeNull(); expect(receiveJourneyHttp(s).http.response).toBeNull(); expect(renderJourney(s).rendered).toBeNull(); expect(gradeJourney(s).ok).toBe(false);
  });
  it("commits resolution only at actual final-answer processing, not when a plan was created", () => {
    let s = navigateJourney(initialJourney(), "https://www.example.com/lesson"); expect(s.resolvedIp).toBeNull(); expect(s.cache.answers).toEqual({});
    s = stepJourneyDns(s); expect(s.externalQueries).toBe(0); expect(s.resolvedIp).toBeNull(); s = stepJourneyDns(s); expect(s.externalQueries).toBe(1); expect(s.resolvedIp).toBeNull();
    while (s.phase === "dns") s = stepJourneyDns(s); expect(s.resolvedIp).toBe("203.0.113.10"); expect(s.cache.answers["www.example.com"]).toBe(s.resolvedIp);
  });
  it("cache hits avoid server queries without extending TTL", () => {
    let s = dns(initialJourney()); const expiry = s.expires["www.example.com"];
    for (let i = 0; i < 4; i++) s = tickJourney(s); s = dns(s); expect(s.externalQueries).toBe(3); expect(s.evidence.cacheHits).toBe(1); expect(s.expires["www.example.com"]).toBe(expiry);
  });
  it("expires an answer at the exact TTL while preserving zone referrals and querying authority only", () => {
    let s = dns(initialJourney()); for (let i = 0; i < 5; i++) s = tickJourney(s); s = dns(s);
    expect(s.resolution?.serversAsked).toBe(1); expect(s.externalQueries).toBe(4); expect(s.expires["www.example.com"]).toBe(10);
  });
  it("a stale but unexpired DNS answer cannot create a fake server or progress through TLS", () => {
    let s = connect(dns(initialJourney("cache"))); expect(s.resolvedIp).toBe("203.0.113.99"); expect(s.tcp.server).toBe("LISTEN"); expect(s.tcp.client).toBe("SYN-SENT"); expect(s.evidence.staleAddressTried).toBe(true); expect(stepJourneyTls(s, "hello").http.tls.phase).toBe("idle");
    const cleared = clearJourneyAnswers(s); expect(cleared.resolvedIp).toBe("203.0.113.99"); s = complete(cleared); expect(s.resolution?.serversAsked).toBe(1); expect(gradeJourney(s, "cache").ok).toBe(true);
  });
  it("can recover stale DNS by waiting for expiry instead of clearing it", () => {
    let s = connect(dns(initialJourney("cache"))); for (let i = 0; i < 5; i++) s = tickJourney(s); s = complete(s);
    expect(gradeJourney(s, "cache").ok).toBe(true);
  });
  it("does not satisfy the diagnostic cache task by clearing it before ever observing the bad address", () => {
    const s = complete(clearJourneyAnswers(initialJourney("cache"))); expect(s.rendered?.status).toBe(200); expect(gradeJourney(s, "cache").ok).toBe(false);
  });
  it.each([0, 1, 2])("recovers actual handshake loss at packet position %s", position => {
    let s = commandJourneyTcp(dns(initialJourney("loss")), { type: "start" });
    for (let i = 0; i < position; i++) s = commandJourneyTcp(s, { type: "deliver", id: s.tcp.channel[0]!.id });
    s = commandJourneyTcp(s, { type: "drop", id: s.tcp.channel[0]!.id });
    const side = position === 0 ? "client" : "server";
    const premature = commandJourneyTcp(s, { type: "retry", side }); expect(premature.tcp.channel).toHaveLength(0);
    for (let i = 0; i < 3; i++) s = tickJourney(s); s = commandJourneyTcp(s, { type: "retry", side });
    while (s.phase === "connect" && s.tcp.channel.length) s = commandJourneyTcp(s, { type: "deliver", id: s.tcp.channel[0]!.id });
    s = page(tls(s)); expect(gradeJourney(s, "loss").ok).toBe(true);
  });
  it("normal successful navigation does not fabricate a loss-recovery proof", () => expect(gradeJourney(complete(initialJourney("loss")), "loss").ok).toBe(false));
  it("respects delayed availability even when the destination IP is wrong", () => {
    let s = commandJourneyTcp(dns(initialJourney("cache")), { type: "start" }); s = commandJourneyTcp(s, { type: "delay", id: 1 });
    s = commandJourneyTcp(s, { type: "deliver", id: 1 }); expect(s.tcp.channel).toHaveLength(1); expect(s.evidence.staleAddressTried).toBe(false);
    s = tickJourney(tickJourney(s)); s = commandJourneyTcp(s, { type: "deliver", id: 1 }); expect(s.evidence.staleAddressTried).toBe(true);
  });
  it("shows actual 404, then repairs the URL while reusing DNS cache", () => {
    let s = complete(initialJourney("http")); expect(s.rendered?.kind).toBe("error"); expect(s.rendered?.text).toContain("404"); expect(gradeJourney(s, "http").ok).toBe(false);
    const queries = s.externalQueries; s = navigateJourney(s, "https://www.example.com/lesson?unit=network"); while (s.phase === "dns") s = stepJourneyDns(s); s = page(tls(connect(s)));
    expect(s.externalQueries).toBe(queries); expect(gradeJourney(s, "http").ok).toBe(true);
  });
  it("404 proof is recorded when received, not merely prepared at the server", () => {
    let s = tls(connect(dns(initialJourney("http")))); s = sendJourneyHttp(s, "GET", "Host: www.example.com"); s = processJourneyHttp(s);
    expect(s.http.pendingResponse?.status).toBe(404); expect(s.evidence.saw404).toBe(false); s = receiveJourneyHttp(s); expect(s.evidence.saw404).toBe(true);
  });
  it("the HTTP scenario also requires actually displaying the received error page", () => {
    let s = exchange(tls(connect(dns(initialJourney("http")))));
    expect(s.evidence.saw404).toBe(true); expect(s.evidence.displayed404).toBe(false);
    s = page(tls(connect(dns(s, "https://www.example.com/lesson"))));
    expect(s.rendered?.status).toBe(200); expect(gradeJourney(s, "http").ok).toBe(false);
  });
  it("does not render a correct page without receiving its response or from an old navigation", () => {
    let s = tls(connect(dns(initialJourney()))); s = processJourneyHttp(sendJourneyHttp(s, "GET", "Host: www.example.com")); expect(renderJourney(s).rendered).toBeNull();
    s = renderJourney(receiveJourneyHttp(s)); const fresh = navigateJourney(s, "https://www.example.com/missing"); expect(fresh.rendered).toBeNull(); expect(gradeJourney(fresh).ok).toBe(false);
    expect(gradeJourney({ ...s, rendered: { ...s.rendered!, sourceBody: "invented" } }).ok).toBe(false);
  });
  it("rejects bad certificates and allows a new verified TLS session on the established connection", () => {
    let s = connect(dns(initialJourney())); s = tls(restartJourneyTls(s, "wrong-name")); expect(s.phase).toBe("tls"); expect(sendJourneyHttp(s, "GET", "Host: www.example.com").http.request).toBeNull();
    s = page(tls(restartJourneyTls(s, "valid"))); expect(gradeJourney(s).ok).toBe(true);
  });
  it("HEAD and 304 cannot synthesize a page with no response body", () => {
    const ready = tls(connect(dns(initialJourney()))); expect(renderJourney(exchange(ready, "HEAD")).rendered).toBeNull();
    const unchanged = exchange(ready, "GET", '\nIf-None-Match: "nico-lesson-v1"'); expect(unchanged.http.response?.status).toBe(304); expect(renderJourney(unchanged).rendered).toBeNull();
  });
  it("handles unknown DNS names without inventing an IP or connection", () => {
    const s = dns(initialJourney(), "https://unknown.example.com/lesson"); expect(s.phase).toBe("dns-error"); expect(s.resolvedIp).toBeNull(); expect(commandJourneyTcp(s, { type: "start" }).tcp.client).toBe("CLOSED");
  });
  it("supports plaintext HTTP as a different experiment, but cannot bypass HTTPS challenge requirements", () => {
    const s = page(connect(dns(initialJourney(), "http://www.example.com/lesson"))); expect(s.http.tls.phase).toBe("idle"); expect(s.rendered?.status).toBe(200); expect(gradeJourney(s).ok).toBe(false);
  });
  it("normalizes URL host/default port, transmits query but not fragment", () => expect(parseJourneyUrl("https://WWW.EXAMPLE.COM:443/lesson?q=1#intro")).toEqual({ scheme: "https", hostname: "www.example.com", target: "/lesson?q=1" }));
  it.each(["bad", "javascript:alert(1)", "ftp://www.example.com/lesson", "https://user:pass@www.example.com", "https://www.example.com:8787/", "https://203.0.113.10/", "https://constructor/", "https://localhost/"])("diagnoses unsupported URL %s", url => { expect(() => parseJourneyUrl(url)).toThrow(); expect(navigateJourney(initialJourney(), url).phase).toBe("idle"); });
  it("bounds trace and preserves original nested cache/session snapshots", () => {
    const s = initialJourney("cache"), before = structuredClone(s); complete(clearJourneyAnswers(s)); expect(s).toEqual(before);
    let long = s; for (let i = 0; i < 150; i++) long = tickJourney(long); expect(long.trace).toHaveLength(100);
  });
});
