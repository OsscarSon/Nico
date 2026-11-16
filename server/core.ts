import { ERROR_TEXT, HTTP_STATUS } from "../src/ai/messages";
import { cleanText, leaksCanary, parseJsonLoose, randomHex } from "../src/ai/guard";
import { buildCritiquePrompt, buildRunPrompt, buildTutorPrompt, PROMPT_VERSION, type BuiltPrompt } from "../src/ai/prompts";
import { aiRequestSchema, critiqueOutputSchema, LIMITS, type AiErrorCode, type AiRequest } from "../src/ai/protocol";
import { callModel, UpstreamError, type ProviderConfig } from "./providers";
import { checkQuota, limitsFromEnv, type QuotaStore } from "./quota";

/**
 * AI 代理的核心：只依赖 Web 标准的 Request / Response / fetch / crypto，
 * 所以同一份代码可以挂在 Cloudflare Workers（server/worker.ts）或 Vercel（api/ai.ts）上。
 * 密钥只存在服务端环境变量里；这里不会把密钥、系统提示词或上游错误原文发给浏览器。
 */

export type Env = {
  AI_PROVIDER?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
  /** 允许调用的网页来源，逗号分隔，例如 https://你的用户名.github.io */
  ALLOWED_ORIGINS?: string;
  /** 用来给访客标识加盐的随机字符串；不设就退回用 AI_API_KEY */
  QUOTA_SALT?: string;
  LIMIT_PER_MINUTE?: string;
  LIMIT_PER_DAY?: string;
  LIMIT_GLOBAL_PER_DAY?: string;
};

export type Deps = {
  fetch: typeof fetch;
  now: () => number;
  store: QuotaStore;
  /** 生成一次请求用的随机串（围栏编号、暗号）；测试时可固定 */
  random?: () => string;
  timeoutMs?: number;
};

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function originAllowed(origin: string, env: Env): boolean {
  const list = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  // 没配置白名单时只放行本机开发，而不是放行所有人
  return list.length ? list.includes(origin) : LOCAL_ORIGIN.test(origin);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  if (!origin || !originAllowed(origin, env)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function fail(code: AiErrorCode, headers: Record<string, string>, retryAfterSec?: number): Response {
  return new Response(
    JSON.stringify({ ok: false, code, message: ERROR_TEXT[code], ...(retryAfterSec ? { retryAfterSec } : {}) }),
    {
      status: HTTP_STATUS[code],
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...(retryAfterSec ? { "Retry-After": String(retryAfterSec) } : {}),
        ...headers,
      },
    },
  );
}

const ok = (body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });

export function providerFromEnv(env: Env): ProviderConfig | null {
  const provider = env.AI_PROVIDER ?? "gemini";
  if (provider !== "gemini" && provider !== "openai-compatible") return null;
  if (!env.AI_MODEL) return null;
  if (provider === "gemini" && !env.AI_API_KEY) return null;
  if (provider === "openai-compatible" && !env.AI_BASE_URL) return null;
  return { provider, apiKey: env.AI_API_KEY ?? "", model: env.AI_MODEL, baseUrl: env.AI_BASE_URL };
}

async function visitorId(request: Request, env: Env): Promise<string> {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const data = new TextEncoder().encode(`${env.QUOTA_SALT ?? env.AI_API_KEY ?? ""}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

function build(req: AiRequest, nonce: string, canary: string): BuiltPrompt {
  switch (req.kind) {
    case "tutor":
      return buildTutorPrompt(
        { ...req, context: cleanText(req.context, LIMITS.context), question: cleanText(req.question, LIMITS.question) },
        nonce,
        canary,
      );
    case "critique":
      return buildCritiquePrompt({ ...req, prompt: cleanText(req.prompt, LIMITS.prompt) }, nonce, canary);
    case "run":
      return buildRunPrompt({ ...req, prompt: cleanText(req.prompt, LIMITS.prompt) }, nonce, canary);
  }
}

export async function handleAiRequest(request: Request, env: Env, deps: Deps): Promise<Response> {
  const origin = request.headers.get("Origin");
  const cors = corsHeaders(origin, env);

  if (origin && !originAllowed(origin, env)) return fail("origin_forbidden", {});
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST, OPTIONS", ...cors } });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > LIMITS.body * 4) return fail("bad_request", cors);
  const raw = await request.text();
  if (raw.length > LIMITS.body) return fail("bad_request", cors);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail("bad_request", cors);
  }
  const parsed = aiRequestSchema.safeParse(json);
  if (!parsed.success) return fail("bad_request", cors);
  const req = parsed.data;

  const cfg = providerFromEnv(env);
  if (!cfg) return fail("not_configured", cors);

  const quota = await checkQuota(deps.store, await visitorId(request, env), limitsFromEnv(env as Record<string, string | undefined>), deps.now());
  if (!quota.ok) return fail(quota.code, cors, quota.retryAfterSec);

  const random = deps.random ?? (() => randomHex(8));
  const nonce = random();
  const canary = `nico-canary-${random()}`;
  const prompt = build(req, nonce, canary);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 20_000);
  try {
    const reply = await callModel(cfg, prompt, deps.fetch, controller.signal);
    if (leaksCanary(reply.text, canary)) return fail("bad_output", cors);

    if (req.kind === "critique") {
      const data = critiqueOutputSchema.safeParse(parseJsonLoose(reply.text));
      if (!data.success) return fail("bad_output", cors);
      return ok({ ok: true, kind: "critique", data: data.data, model: cfg.model, promptVersion: PROMPT_VERSION }, cors);
    }
    return ok({ ok: true, kind: req.kind, text: reply.text.slice(0, 4000), model: cfg.model, promptVersion: PROMPT_VERSION }, cors);
  } catch (e) {
    if (e instanceof UpstreamError) {
      console.error(`[ai] ${e.code}: ${e.message}`); // 只记错误类别，不记学习者写了什么
      return fail(e.code, cors);
    }
    console.error("[ai] unexpected error");
    return fail("upstream_error", cors);
  } finally {
    clearTimeout(timer);
  }
}
