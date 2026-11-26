import { check, field, type Lab } from "./model";

const server = (path: string, second: number) => {
  if (path !== "/hours") return { status: 404, retryAfter: null };
  return second < 3 ? { status: 429, retryAfter: 3 - second } : { status: 200, retryAfter: null };
};

export const statusLab: Lab = {
  task: "旧书签出现 404，营业时间接口在第 3 秒恢复。查到正确路径，并按服务器给出的冷却时间恢复。对一直不存在的地址只发一次请求。",
  fields: [field("旧书签恢复", "继续访问 /hour", "修正为 /hours"), field("遇到 429", "立刻重试", "等 Retry-After", "直接放弃"), field("遇到 404", "同址再请求一次", "停止同址重试")],
  run: ([path, retry, stop]) => {
    const time = retry === 1 ? server("/hours", 0).retryAfter! : 0;
    const requests = [server("/hours", 0).status];
    if (retry !== 2) requests.push(server("/hours", time).status);
    const missingAttempts = stop === 1 ? 1 : 2;
    return [
      check("旧书签响应 / 修复后", "404 → " + server(path ? "/hours" : "/hour", 3).status, "404 → 200"),
      check("首次 429 的响应头", "Retry-After: " + server("/hours", 0).retryAfter, "Retry-After: 3"),
      check("营业时间访问（时间 / 状态）", "0s/" + requests[0] + (requests.length > 1 ? " → " + time + "s/" + requests[1] : ""), "0s/429 → 3s/200"),
      check("对不存在地址的请求次数", missingAttempts, 1),
    ];
  },
};

const events = [
  { ms: 43, id: "r92", source: "gateway", note: "已返回 503", order: 3 },
  { ms: 12, id: "r18", source: "gateway", note: "旧路径未找到", order: 1 },
  { ms: 10, id: "r92", source: "gateway", note: "接到请求", order: 1 },
  { ms: 22, id: "r18", source: "gateway", note: "已返回 404", order: 2 },
  { ms: 41, id: "r92", source: "catalog", note: "上游等待超时", order: 2 },
];
export const logsLab: Lab = {
  task: "网关报出 r92 的 503。按请求 ID 串起跨服务日志，确认哪条记录是先出现的故障证据，并量出这次请求的时长。",
  fields: [field("关联范围", "全部请求", "仅 r18", "仅 r92"), field("排序依据", "缓冲区读取顺序", "请求内事件编号"), field("归因证据", "网关已返回 503", "目录服务上游超时", "旧路径未找到")],
  run: ([filter, order, evidence]) => {
    const matching = events.filter(e => !filter || e.id === (filter === 1 ? "r18" : "r92"));
    const ordered = order ? [...matching].sort((a, b) => a.order - b.order || a.ms - b.ms) : matching;
    const root = matching.find(e => e.note === ["已返回 503", "上游等待超时", "旧路径未找到"][evidence!]);
    return [
      check("读取的事件（请求 / 编号 / 时间 / 服务 / 摘要）", ordered.map(e => [e.id, e.order, e.ms + "ms", e.source, e.note].join(" ")).join(" → "), "r92 1 10ms gateway 接到请求 → r92 2 41ms catalog 上游等待超时 → r92 3 43ms gateway 已返回 503"),
      check("报告的早期故障证据", root ? root.ms + "ms " + root.note : "选中的记录不在请求内", "41ms 上游等待超时"),
      check("起止事件差（同一实验时钟）", ordered.at(-1)!.ms - ordered[0]!.ms, 33),
    ];
  },
};

export const protocolLab: Lab = {
  task: "把双栈终端连到已有 IPv6 地址的图书馆。使用对应的本地邻居解析；发送 1200 字节时遵守接收窗口与拥塞窗口，并在建立 TLS 后发送 HTTP。",
  fields: [field("连接地址族", "IPv4", "IPv6"), field("本地下一跳解析", "ARP", "IPv6 邻居发现"), field("发送预算", "只看接收窗口", "取两个窗口的较小值"), field("HTTP 时机", "在 TLS 前发送", "在 TLS 后发送")],
  run: ([family, neighbor, budget, tls]) => {
    const answer = family ? "2001:db8::30" : "192.0.2.30";
    const resolved = family === neighbor;
    const receiver = 1200, congestion = 600;
    const length = budget ? Math.min(receiver, congestion) : receiver;
    return [
      check("DNS / 本地下一跳", answer + " / " + (resolved ? "已解析" : "地址族不匹配"), "2001:db8::30 / 已解析"),
      check("连接后的第一批在途数据", resolved ? length + " B" : "尚未连通", "600 B"),
      check("网页响应", resolved && tls ? "200 · TLS 后发送 HTTP" : "尚未建立受保护的 HTTP 会话", "200 · TLS 后发送 HTTP"),
    ];
  },
};

const routes = [{ prefix: [], via: "默认出口" }, { prefix: [10, 20], via: "访客网" }, { prefix: [10, 20, 30], via: "阅览室" }];
export const routingLab: Lab = {
  task: "将办公 VLAN 到阅览室的已授权服务流量送到 10.20.30.8。访客访问同一地址必须被拒绝，另确认允许访问外部服务时走默认路由。",
  fields: [field("路由查找", "遇到匹配便停止", "选择最长匹配前缀"), field("入站策略", "所有 VLAN 放行", "仅办公和已批准出口", "全部阻止"), field("地址转换范围", "所有转发都改源地址", "仅外部出口")],
  run: ([longest, policy, nat]) => {
    function forward(vlan: string, ip: number[]) {
      const matches = routes.filter(r => r.prefix.every((part, i) => ip[i] === part));
      const via = (longest ? matches.reduce((best, route) => route.prefix.length > best.prefix.length ? route : best) : matches[0]!).via;
      if (policy === 2 || policy === 1 && vlan === "访客") return "拒绝";
      const translated = !nat || via === "默认出口";
      return via + (translated ? " · 源地址已转换" : " · 保留内部源地址");
    }
    return [
      check("办公 → 10.20.30.8", forward("办公", [10, 20, 30, 8]), "阅览室 · 保留内部源地址"),
      check("访客 → 10.20.30.8", forward("访客", [10, 20, 30, 8]), "拒绝"),
      check("办公 → 192.0.2.50", forward("办公", [192, 0, 2, 50]), "默认出口 · 源地址已转换"),
    ];
  },
};
