import type { AiErrorCode } from "./protocol";

/** 给学习者看的错误文案。服务端和浏览器共用，保证同一种失败说同一句话。 */
export const ERROR_TEXT: Record<AiErrorCode, string> = {
  disabled: "AI 功能还没有接上服务器，所以现在用不了。本地的检查不受影响。",
  not_configured: "AI 服务还没有配置完成。",
  origin_forbidden: "这个网页没有使用 AI 服务的权限。",
  bad_request: "这条请求的格式不对，请改短一点再试。",
  rate_limited: "问得太快了，等一会儿再试。",
  quota_exhausted: "今天的 AI 额度用完了，明天再来。",
  upstream_error: "AI 服务暂时出错了，稍后再试。",
  timeout: "AI 响应太慢，已经不等了。可以再试一次。",
  bad_output: "AI 这次回的内容不能用，可以再试一次。",
  network: "连不上 AI 服务。检查一下网络，再试一次。",
};

export const HTTP_STATUS: Record<AiErrorCode, number> = {
  disabled: 503,
  not_configured: 503,
  origin_forbidden: 403,
  bad_request: 400,
  rate_limited: 429,
  quota_exhausted: 429,
  upstream_error: 502,
  timeout: 504,
  bad_output: 502,
  network: 503,
};
