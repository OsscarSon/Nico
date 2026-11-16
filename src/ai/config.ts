/**
 * AI 服务地址。构建时由环境变量 VITE_AI_ENDPOINT 提供（例如 https://nico-ai.你的账号.workers.dev）。
 * 没配置时 AI 功能整体关闭，界面如实说明，本地的指令检查等功能照常可用。
 */
export const aiEndpoint = (): string => String(import.meta.env.VITE_AI_ENDPOINT ?? "").trim();
export const aiEnabled = (): boolean => aiEndpoint() !== "";
