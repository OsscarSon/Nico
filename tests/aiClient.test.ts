import { describe, it, expect } from "vitest";
import { askAi } from "../src/ai/client";
import { ERROR_TEXT } from "../src/ai/messages";
import type { AiRequest } from "../src/ai/protocol";

const EP = "https://ai.example/";
const runReq: AiRequest = { kind: "run", prompt: "写个邮件" };
const critiqueReq: AiRequest = { kind: "critique", prompt: "写个邮件" };
const reply = (body: unknown, status = 200) => (async () => Response.json(body, { status })) as unknown as typeof fetch;

describe("askAi", () => {
  it("returns `disabled` without any network call when no endpoint is configured", async () => {
    let called = false;
    const r = await askAi(runReq, { endpoint: "", fetchImpl: (async () => { called = true; return Response.json({}); }) as unknown as typeof fetch });
    expect(called).toBe(false);
    expect(r).toEqual({ ok: false, code: "disabled", message: ERROR_TEXT.disabled });
  });

  it("posts JSON without credentials and returns text answers", async () => {
    let seen: RequestInit | undefined;
    const f = (async (_u: string, init: RequestInit) => { seen = init; return Response.json({ ok: true, kind: "run", text: "好的", model: "m" }); }) as unknown as typeof fetch;
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: f });
    expect(r).toEqual({ ok: true, kind: "run", text: "好的", model: "m" });
    expect(seen?.method).toBe("POST");
    expect(seen?.credentials).toBe("omit");
    expect(JSON.parse(String(seen?.body))).toEqual(runReq);
  });

  it("validates a critique again on the client", async () => {
    const data = { summary: "s", strengths: [], fixes: [], rewrite: "r" };
    const ok = await askAi(critiqueReq, { endpoint: EP, fetchImpl: reply({ ok: true, kind: "critique", data, model: "m" }) });
    expect(ok.ok && ok.kind === "critique" && ok.data.rewrite).toBe("r");
    const bad = await askAi(critiqueReq, { endpoint: EP, fetchImpl: reply({ ok: true, kind: "critique", data: { summary: "s" }, model: "m" }) });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe("bad_output");
  });

  it("passes through known error codes from the server, with the retry hint", async () => {
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: reply({ ok: false, code: "rate_limited", message: "x", retryAfterSec: 12 }, 429) });
    expect(r).toEqual({ ok: false, code: "rate_limited", message: ERROR_TEXT.rate_limited, retryAfterSec: 12 });
  });

  it("an unknown error code from the server becomes upstream_error", async () => {
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: reply({ ok: false, code: "who-knows" }, 500) });
    expect(r.ok === false && r.code).toBe("upstream_error");
  });

  it("does not trust a malformed or mismatched server reply", async () => {
    for (const body of [null, "text", [], { ok: true }, { ok: true, kind: "tutor", text: "x", model: "m" }, { ok: true, kind: "run", text: "  ", model: "m" }, { ok: true, kind: "run", text: "x" }]) {
      const r = await askAi(runReq, { endpoint: EP, fetchImpl: reply(body) });
      expect(r.ok).toBe(false);
    }
  });

  it("a non-JSON reply (for example an HTML error page) is upstream_error", async () => {
    const f = (async () => new Response("<html>502</html>", { status: 502 })) as unknown as typeof fetch;
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: f });
    expect(r.ok === false && r.code).toBe("upstream_error");
  });

  it("a network failure is `network`", async () => {
    const f = (async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch;
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: f });
    expect(r.ok === false && r.code).toBe("network");
  });

  it("gives up at the timeout and reports `timeout`", async () => {
    const f = ((_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" }))))) as unknown as typeof fetch;
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: f, timeoutMs: 20 });
    expect(r.ok === false && r.code).toBe("timeout");
  });

  it("never throws, whatever the transport does", async () => {
    const f = (async () => { throw "weird"; }) as unknown as typeof fetch;
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: f });
    expect(r.ok).toBe(false);
  });

  it("truncates an absurdly long answer", async () => {
    const r = await askAi(runReq, { endpoint: EP, fetchImpl: reply({ ok: true, kind: "run", text: "字".repeat(9000), model: "m" }) });
    expect(r.ok && r.kind === "run" && r.text.length).toBe(6000);
  });
});
