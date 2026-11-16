import { handleAiRequest, type Env } from "./core";
import { KvStore, MemoryStore, type KvLike } from "./quota";

/**
 * Cloudflare Workers 入口。
 * 可选：绑定一个名为 QUOTA 的 KV 命名空间，额度计数就能跨实例共享；不绑定则用内存计数。
 */
const memory = new MemoryStore();

export default {
  async fetch(request: Request, env: Env & { QUOTA?: KvLike }): Promise<Response> {
    return handleAiRequest(request, env, {
      fetch: (input, init) => fetch(input, init),
      now: Date.now,
      store: env.QUOTA ? new KvStore(env.QUOTA) : memory,
    });
  },
};
