import { z } from "zod";
import { ELEMENT_IDS } from "./elements";

/**
 * 浏览器 ↔ 服务端代理的通信格式。两边共用同一份 Zod 校验，
 * 所以客户端发出的和服务端接受的不会悄悄漂移。
 */

export const LIMITS = {
  question: 600,
  prompt: 1200,
  context: 2000,
  scenario: 300,
  historyTurns: 4,
  historyText: 600,
  /** 请求体字符上限（服务端在解析 JSON 之前先检查） */
  body: 16_000,
} as const;

const elementId = z.enum(ELEMENT_IDS);

const turn = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(LIMITS.historyText),
});

export const tutorRequestSchema = z.object({
  kind: z.literal("tutor"),
  lessonTitle: z.string().min(1).max(120),
  /** 本课的讲解文字（不含答案）。对服务端来说它只是“参考资料”，不是指令。 */
  context: z.string().max(LIMITS.context),
  question: z.string().min(1).max(LIMITS.question),
  history: z.array(turn).max(LIMITS.historyTurns).optional(),
});

export const critiqueRequestSchema = z.object({
  kind: z.literal("critique"),
  prompt: z.string().min(1).max(LIMITS.prompt),
  scenario: z.string().max(LIMITS.scenario).optional(),
  /** 本地规则检查的结果，仅作参考 */
  local: z.array(z.object({ element: elementId, present: z.boolean() })).max(ELEMENT_IDS.length).optional(),
});

export const runRequestSchema = z.object({
  kind: z.literal("run"),
  prompt: z.string().min(1).max(LIMITS.prompt),
});

export const aiRequestSchema = z.discriminatedUnion("kind", [
  tutorRequestSchema,
  critiqueRequestSchema,
  runRequestSchema,
]);

export type AiRequest = z.infer<typeof aiRequestSchema>;
export type TutorRequest = z.infer<typeof tutorRequestSchema>;
export type CritiqueRequest = z.infer<typeof critiqueRequestSchema>;
export type RunRequest = z.infer<typeof runRequestSchema>;

/** 模型对“点评”任务必须返回的 JSON。校验失败就当作失败，不修补、不猜。 */
export const critiqueOutputSchema = z.object({
  summary: z.string().min(1).max(400),
  strengths: z.array(z.string().min(1).max(200)).max(4),
  fixes: z
    .array(z.object({ element: elementId, advice: z.string().min(1).max(240) }))
    .max(6),
  rewrite: z.string().min(1).max(1500),
});
export type CritiqueOutput = z.infer<typeof critiqueOutputSchema>;

export type AiErrorCode =
  | "disabled" // 前端没有配置服务地址
  | "not_configured" // 服务端没有配置密钥或模型
  | "origin_forbidden"
  | "bad_request"
  | "rate_limited" // 你问得太快了
  | "quota_exhausted" // 今日额度用完
  | "upstream_error" // 模型服务出错
  | "timeout"
  | "bad_output" // 模型回的东西不能用
  | "network"; // 浏览器连不上

export type AiFail = { ok: false; code: AiErrorCode; message: string; retryAfterSec?: number };
export type AiTextOk = { ok: true; kind: "tutor" | "run"; text: string; model: string };
export type AiCritiqueOk = { ok: true; kind: "critique"; data: CritiqueOutput; model: string };
export type AiResult = AiTextOk | AiCritiqueOk | AiFail;
