/**
 * 额度限制：每分钟、每人每天、全站每天三道。
 * 这是“软限制”：存储用读—改—写，不是原子操作，并发时可能多放过几次。
 * 它的目的是防止误用和免费额度被刷光，不是计费级别的计量。
 */

export type Limits = { perMinute: number; perDay: number; globalPerDay: number };
export const DEFAULT_LIMITS: Limits = { perMinute: 6, perDay: 30, globalPerDay: 500 };

export interface QuotaStore {
  /** 计数加一并返回新值；ttlSec 之后自动过期 */
  incr(key: string, ttlSec: number): Promise<number>;
}

/** 单个实例内存里的计数。重启或多实例时会各算各的，只适合开发和小流量。 */
export class MemoryStore implements QuotaStore {
  private map = new Map<string, { n: number; exp: number }>();
  constructor(private now: () => number = Date.now) {}
  async incr(key: string, ttlSec: number): Promise<number> {
    const t = this.now();
    for (const [k, v] of this.map) if (v.exp <= t) this.map.delete(k);
    const cur = this.map.get(key);
    const n = (cur?.n ?? 0) + 1;
    this.map.set(key, { n, exp: cur?.exp ?? t + ttlSec * 1000 });
    return n;
  }
}

/** Cloudflare KV 的最小接口（不用引入 @cloudflare/workers-types）。 */
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export class KvStore implements QuotaStore {
  constructor(private kv: KvLike) {}
  async incr(key: string, ttlSec: number): Promise<number> {
    const n = (Number(await this.kv.get(key)) || 0) + 1;
    // Cloudflare KV 要求 expirationTtl 至少 60 秒
    await this.kv.put(key, String(n), { expirationTtl: Math.max(60, ttlSec) });
    return n;
  }
}

const UTC_OFFSET_HOURS = 8; // 学习者主要在 UTC+8（中国、马来西亚），“每天”按这个时区算

const dayKey = (ms: number) => new Date(ms + UTC_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
const secondsToNextDay = (ms: number) => {
  const local = ms + UTC_OFFSET_HOURS * 3600_000;
  return Math.max(1, Math.ceil((86_400_000 - (local % 86_400_000)) / 1000));
};

export type QuotaResult =
  | { ok: true }
  | { ok: false; code: "rate_limited" | "quota_exhausted"; retryAfterSec: number };

/** who 是已经哈希过的访客标识（不是原始 IP）。 */
export async function checkQuota(
  store: QuotaStore,
  who: string,
  limits: Limits,
  nowMs: number,
): Promise<QuotaResult> {
  const minute = Math.floor(nowMs / 60_000);
  if ((await store.incr(`m:${who}:${minute}`, 120)) > limits.perMinute)
    return { ok: false, code: "rate_limited", retryAfterSec: Math.max(1, 60 - Math.floor((nowMs / 1000) % 60)) };
  const day = dayKey(nowMs);
  if ((await store.incr(`d:${who}:${day}`, 90_000)) > limits.perDay)
    return { ok: false, code: "quota_exhausted", retryAfterSec: secondsToNextDay(nowMs) };
  if ((await store.incr(`g:${day}`, 90_000)) > limits.globalPerDay)
    return { ok: false, code: "quota_exhausted", retryAfterSec: secondsToNextDay(nowMs) };
  return { ok: true };
}

/** 读环境变量里的额度；写错了（不是正整数）就用默认值，而不是静默变成 0。 */
export function limitsFromEnv(env: Record<string, string | undefined>): Limits {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : d;
  };
  return {
    perMinute: num(env.LIMIT_PER_MINUTE, DEFAULT_LIMITS.perMinute),
    perDay: num(env.LIMIT_PER_DAY, DEFAULT_LIMITS.perDay),
    globalPerDay: num(env.LIMIT_GLOBAL_PER_DAY, DEFAULT_LIMITS.globalPerDay),
  };
}
