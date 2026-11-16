/**
 * DNS 查询模型（教学用）。名字和地址都是虚构的：example.com / example.org 是专门留给文档的域名，
 * 203.0.113.x、198.51.100.x 是专门留给文档的 IP 地址段。
 * 简化：只有两级域名；缓存不会过期（真实缓存按 TTL 过期，演示里用"清空缓存"代替）。
 */
export type Role = "你" | "解析器" | "根服务器" | "TLD 服务器" | "权威服务器";

export type DnsStep = {
  from: Role;
  to: Role;
  question: string;
  reply: string;
  /** 这一步有没有用到外面的服务器（根 / TLD / 权威） */
  asksServer: boolean;
  /** 本步得到的是"最终答案"还是"该去问谁" */
  kind: "query" | "referral" | "answer" | "cache" | "missing";
};

export type Cache = { answers: Record<string, string>; zones: string[] };
export const emptyCache = (): Cache => ({ answers: {}, zones: [] });

/** 权威服务器里的记录 */
const RECORDS: Record<string, string> = {
  "www.example.com": "203.0.113.10",
  "mail.example.com": "203.0.113.25",
  "www.example.org": "198.51.100.7",
};
export const dnsNames = Object.keys(RECORDS);

const labelsOf = (name: string) => name.toLowerCase().replace(/\.$/, "").split(".");
const tldOf = (name: string): string => labelsOf(name).at(-1) as string;
const domainOf = (name: string): string => labelsOf(name).slice(-2).join(".");

export type Resolution = { steps: DnsStep[]; ip: string | null; serversAsked: number; cache: Cache };

export function resolve(name: string, cache: Cache): Resolution {
  const n = name.toLowerCase();
  const tld = tldOf(n);
  const domain = domainOf(n);
  const steps: DnsStep[] = [
    { from: "你", to: "解析器", question: `${n} 的 IP 地址是什么？`, reply: "", asksServer: false, kind: "query" },
  ];
  const cached = cache.answers[n];
  if (cached !== undefined) {
    steps.push({
      from: "解析器", to: "你", question: "先看自己的缓存", asksServer: false, kind: "cache",
      reply: `缓存里有 ${n} 的答案：${cached}。不用问任何服务器，直接回答你。`,
    });
    return { steps, ip: cached, serversAsked: 0, cache };
  }

  const zones = new Set(cache.zones);
  if (!zones.has(domain)) {
    if (!zones.has(tld)) {
      steps.push({
        from: "解析器", to: "根服务器", question: `谁管 .${tld}？`, asksServer: true, kind: "referral",
        reply: `我不知道 ${n} 在哪，但 .${tld} 归 .${tld} 服务器管，去问它。`,
      });
      zones.add(tld);
    }
    steps.push({
      from: "解析器", to: "TLD 服务器", question: `谁管 ${domain}？`, asksServer: true, kind: "referral",
      reply: `我不直接存 ${n} 的地址，但 ${domain} 由它自己的权威服务器管，去问那一台。`,
    });
    zones.add(domain);
  }
  const ip = RECORDS[n] ?? null;
  steps.push({
    from: "解析器", to: "权威服务器", question: `${n} 的 IP 地址是什么？`, asksServer: true,
    kind: ip ? "answer" : "missing",
    reply: ip ? `${n} 的地址是 ${ip}。` : `${domain} 里没有 ${n} 这个名字。`,
  });
  steps.push({
    from: "解析器", to: "你", question: "把结果带回来", asksServer: false, kind: ip ? "answer" : "missing",
    reply: ip ? `${n} 的 IP 地址是 ${ip}。解析器把答案和\u201C该问谁\u201D都存进缓存。` : `没有找到 ${n}。`,
  });
  const next: Cache = {
    answers: ip ? { ...cache.answers, [n]: ip } : { ...cache.answers },
    zones: [...zones],
  };
  return { steps, ip, serversAsked: steps.filter((s) => s.asksServer).length, cache: next };
}

/** 预测挑战：缓存状态依次延续。答案由模型实际运行得出，不手写。 */
export const dnsScenario: string[] = ["www.example.com", "www.example.com", "mail.example.com", "www.example.org"];

export function scenarioAnswers(): number[] {
  let cache = emptyCache();
  return dnsScenario.map((name) => {
    const r = resolve(name, cache);
    cache = r.cache;
    return r.serversAsked;
  });
}
