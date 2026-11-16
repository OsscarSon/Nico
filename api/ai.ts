import { handleAiRequest, type Env } from "../server/core";
import { MemoryStore } from "../server/quota";

// 不依赖 @types/node：只读环境变量，用 globalThis 取，避免 tsconfig 里没有 node 类型时报错。
const env = (): Env =>
  ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}) as Env;

/**
 * Vercel 入口（Node.js 运行时，放在 /api 目录即可，不需要额外配置）。
 * 额度计数在内存里：Vercel 会按需启动多个实例，所以这里的限额只是“大致有效”。
 * 想要更准的计数，需要接一个外部存储（例如 Upstash Redis），实现 server/quota.ts 里的 QuotaStore 接口。
 */
const store = new MemoryStore();

export default {
  async fetch(request: Request): Promise<Response> {
    return handleAiRequest(request, env(), {
      fetch: (input, init) => fetch(input, init),
      now: Date.now,
      store,
    });
  },
};
