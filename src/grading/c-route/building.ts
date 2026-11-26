import { select, type CLab } from "./types";

export const library = [
  { id: "L1", tags: ["图书馆", "开放", "周六"], date: 2025, line: "周六 09:00–16:00 开放" },
  { id: "L2", tags: ["图书馆", "开放", "周六"], date: 2026, line: "周六 10:00–17:00 开放" },
  { id: "L3", tags: ["图书馆", "借阅", "期限"], date: 2026, line: "普通图书借阅期限为 14 天" },
];

export function searchLibrary(query: string, currentOnly: boolean) {
  const words = [...new Set(query.trim().split(/\s+/u).filter(Boolean))];
  return library
    .filter(doc => !currentOnly || doc.date === 2026)
    .map(doc => ({ ...doc, score: doc.tags.filter(word => words.includes(word)).length }))
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score);
}
export const retrieve: CLab = {
  title: "用检索和版本找到证据",
  guide: "资料库包含 2025、2026 版开放时间和借阅期限。模拟检索按空格隔开的词计算交集，分数相同时保持原顺序。",
  goal: "为「现在周六几点开门」取得 2026 版开放时间，并附来源编号。",
  controls: [
    { id: "query", label: "查询词（空格分隔）", initial: "图书馆" },
    select("edition", "资料范围", [["all", "全部版本"], ["current", "只看最新版"]]),
    select("cite", "证据标记", [["none", "不附编号"], ["source", "附来源编号"]]),
  ],
  run({ query, edition, cite }) {
    const hits = searchLibrary(query ?? "", edition === "current");
    const first = hits[0];
    return {
      rows: hits.map(row => `${row.id} · ${row.date} · 命中 ${row.score} · ${row.line}`),
      evidence: first ? `${first.line}${cite === "source" ? ` [${first.id}]` : ""}` : "没有证据，暂不回答。",
      passed: first?.id === "L2" && cite === "source" && first.score >= 2,
    };
  },
};

export const agent: CLab = {
  title: "在合适的权限内执行查询",
  guide: "请求「查普通图书借阅期限」。模拟助手先提出工具，再根据批准和参数决定是否读公开规则。写入操作永远不可执行。",
  goal: "经批准仅调用公开规则读取，拿到带来源的 14 天结论。",
  controls: [
    select("tool", "工具", [["none", "不调用"], ["rules", "读取公开规则"], ["write", "修改借阅记录"]]),
    select("arg", "参数", [["hours", "开放时间"], ["loan", "借阅期限"]]),
    select("consent", "人工确认", [["no", "尚未确认"], ["yes", "同意本次只读查询"]]),
  ],
  run({ tool, arg, consent }) {
    const trace = [`拟调用：${tool === "rules" ? "公开规则" : tool === "write" ? "修改记录" : "无"}`];
    if (tool !== "rules" || consent !== "yes") {
      return { rows: trace, evidence: "没有批准的只读工具，执行被拦截。", passed: false };
    }
    const doc = library[arg === "loan" ? 2 : 1]!;
    return { rows: [...trace, `已按参数取得公开记录 ${doc.id}`], evidence: `${doc.line} [${doc.id}]`, passed: doc.id === "L3" };
  },
};

export const evaluate: CLab = {
  title: "计算可比较的通过率",
  guide: "同一批题有 3 道普通题和 2 道边界题。方案 A 在普通题全过，边界题全错；B 普通题过 2 道，边界题全过。",
  goal: "在同一完整集合上比较两方案，找出至少通过 4 题的方案。",
  controls: [
    select("set", "评估样例", [["normal", "只看普通题"], ["edge", "只看边界题"], ["full", "全量（含两类）"]]),
    select("choose", "准备采用方案", [["a", "A"], ["b", "B"]]),
  ],
  run({ set, choose }) {
    const indexes = set === "normal" ? [0, 1, 2] : set === "edge" ? [3, 4] : [0, 1, 2, 3, 4];
    const outputs = [[true, true, true, false, false], [true, false, true, true, true]];
    const counts = outputs.map(result => indexes.filter(i => result[i]).length);
    const best = counts[1]! > counts[0]! ? "b" : "a";
    return { rows: counts.map((count, i) => `${i ? "B" : "A"} · ${count}/${indexes.length}（${Math.round(count / indexes.length * 100)}%）`),
      evidence: "两方案使用同一组题。完整样例能揭示普通题看不到的退步。",
      passed: indexes.length === 5 && counts[1]! >= 4 && choose === best };
  },
};

export const local: CLab = {
  title: "估算设备预算和数据去向",
  guide: "可用预算 4 GB。用参数数量 × 每参数比特 / 8 估算权重，并为运行和上下文固定预留 1.5 GB。资料要求只留本机。",
  goal: "选择至少 3B 参数的配置，估算总量不超过 4 GB，且关闭联网插件。",
  controls: [
    select("size", "参数规模", [["7", "7B"], ["3", "3B"], ["1", "1B"]]),
    select("bits", "权重精度", [["16", "16 位"], ["8", "8 位"], ["4", "4 位"]]),
    select("plugin", "联网插件", [["on", "开启"], ["off", "关闭"]]),
  ],
  run({ size, bits, plugin }) {
    const modelSize = Number(size);
    const weight = modelSize * Number(bits) / 8;
    const total = weight + 1.5;
    return { rows: [`权重 ${weight} GB，估算合计 ${total} GB / 4 GB`, plugin === "off" ? "教学配置：无联网插件" : "提示：联网插件可能把数据发出设备"],
      evidence: "这里只做简化预算，真实设备还要实测量化误差、缓存、日志和驱动开销。",
      passed: modelSize >= 3 && total <= 4 && plugin === "off" };
  },
};
