import type { BuiltPrompt } from "../src/ai/prompts";

/**
 * 模型服务适配。只用 fetch，不装 SDK：这里一共两种协议、几十行代码，
 * 多一个依赖就多一份要在 Worker / Vercel 两个环境里验证的东西。
 * 以后要流式输出或工具调用（路线 C 的 Agent 课），再换成 Vercel AI SDK 也只改这个文件。
 */

export type ProviderConfig = {
  provider: "gemini" | "openai-compatible";
  apiKey: string;
  model: string;
  baseUrl?: string;
};

export type ModelReply = { text: string };

export class UpstreamError extends Error {
  constructor(
    public code: "upstream_error" | "quota_exhausted" | "bad_output" | "timeout",
    message: string,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;
type CallInput = Pick<BuiltPrompt, "system" | "user" | "json" | "maxOutputTokens" | "temperature">;

export async function callModel(
  cfg: ProviderConfig,
  p: CallInput,
  doFetch: Fetch,
  signal: AbortSignal,
): Promise<ModelReply> {
  return cfg.provider === "gemini" ? callGemini(cfg, p, doFetch, signal) : callOpenAiCompatible(cfg, p, doFetch, signal);
}

async function send(doFetch: Fetch, url: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await doFetch(url, init);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new UpstreamError("timeout", "upstream timeout");
    throw new UpstreamError("upstream_error", "upstream unreachable");
  }
  if (res.status === 429) throw new UpstreamError("quota_exhausted", "upstream 429");
  if (!res.ok) throw new UpstreamError("upstream_error", `upstream ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new UpstreamError("bad_output", "upstream returned non-JSON");
  }
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

async function callGemini(cfg: ProviderConfig, p: CallInput, doFetch: Fetch, signal: AbortSignal) {
  const base = (cfg.baseUrl ?? "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
  const url = `${base}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`;
  const data = (await send(doFetch, url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: p.system }] },
      contents: [{ role: "user", parts: [{ text: p.user }] }],
      generationConfig: {
        maxOutputTokens: p.maxOutputTokens,
        temperature: p.temperature,
        ...(p.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  })) as GeminiResponse;
  if (data.promptFeedback?.blockReason) throw new UpstreamError("bad_output", "blocked");
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("").trim();
  if (!text) throw new UpstreamError("bad_output", "empty reply");
  return { text };
}

type OpenAiResponse = { choices?: { message?: { content?: unknown } }[] };

async function callOpenAiCompatible(cfg: ProviderConfig, p: CallInput, doFetch: Fetch, signal: AbortSignal) {
  if (!cfg.baseUrl) throw new UpstreamError("upstream_error", "AI_BASE_URL missing");
  const url = `${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const data = (await send(doFetch, url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: p.system },
        { role: "user", content: p.user },
      ],
      max_tokens: p.maxOutputTokens,
      temperature: p.temperature,
      ...(p.json ? { response_format: { type: "json_object" } } : {}),
    }),
  })) as OpenAiResponse;
  const content = data.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content.trim() : "";
  if (!text) throw new UpstreamError("bad_output", "empty reply");
  return { text };
}
