import { aiEndpoint } from "./config";
import { ERROR_TEXT } from "./messages";
import { critiqueOutputSchema, type AiErrorCode, type AiFail, type AiRequest, type AiResult } from "./protocol";

export type ClientOptions = {
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const KNOWN: AiErrorCode[] = [
  "disabled", "not_configured", "origin_forbidden", "bad_request", "rate_limited",
  "quota_exhausted", "upstream_error", "timeout", "bad_output", "network",
];

const fail = (code: AiErrorCode, retryAfterSec?: number): AiFail => ({
  ok: false,
  code,
  message: ERROR_TEXT[code],
  ...(retryAfterSec ? { retryAfterSec } : {}),
});

/**
 * 向 AI 代理发一个请求。永远不抛错：失败一律返回 { ok: false, code, message }，
 * 调用方据此显示诚实的失败说明，而不是编一个“看起来像 AI 回答”的内容。
 * 对服务端返回的内容也不盲信：形状不对就当失败。
 */
export async function askAi(req: AiRequest, opts: ClientOptions = {}): Promise<AiResult> {
  const endpoint = (opts.endpoint ?? aiEndpoint()).trim();
  if (!endpoint) return fail("disabled");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25_000);
  try {
    let res: Response;
    try {
      res = await (opts.fetchImpl ?? fetch)(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: controller.signal,
        credentials: "omit",
      });
    } catch (e) {
      return fail(e instanceof Error && e.name === "AbortError" ? "timeout" : "network");
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return fail("upstream_error");
    }
    if (typeof body !== "object" || body === null) return fail("upstream_error");
    const b = body as Record<string, unknown>;

    if (b.ok === false) {
      const code = KNOWN.includes(b.code as AiErrorCode) ? (b.code as AiErrorCode) : "upstream_error";
      return fail(code, typeof b.retryAfterSec === "number" ? b.retryAfterSec : undefined);
    }
    if (b.ok !== true || b.kind !== req.kind || typeof b.model !== "string") return fail("upstream_error");

    if (req.kind === "critique") {
      const data = critiqueOutputSchema.safeParse(b.data);
      return data.success ? { ok: true, kind: "critique", data: data.data, model: b.model } : fail("bad_output");
    }
    if (typeof b.text !== "string" || b.text.trim() === "") return fail("bad_output");
    return { ok: true, kind: req.kind, text: b.text.slice(0, 6000), model: b.model };
  } finally {
    clearTimeout(timer);
  }
}
