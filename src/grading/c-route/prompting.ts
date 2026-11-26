import { select, type CLab } from "./types";

const samples = [
  { text: "礼堂场地预约", key: "预约", label: "预约" },
  { text: "取消活动报名", key: "取消", label: "取消" },
  { text: "明天的活动改时", key: "改时", label: "改期" },
];

export const examples: CLab = {
  title: "用留出样例检验示例",
  guide: "示例给出关键词和类别的对应关系。模拟分类器按关键词匹配，没见过的情况进入「待确认」。请选择三条示例的输出。",
  goal: "让预约、取消和改期三份留出样例都正确分类，陌生问候仍为待确认。",
  controls: [
    select("booking", "示例「预约图书室」", [["待确认", "省略"], ["预约", "预约"], ["取消", "取消"], ["改期", "改期"]]),
    select("cancel", "示例「取消练习」", [["待确认", "省略"], ["预约", "预约"], ["取消", "取消"], ["改期", "改期"]]),
    select("change", "示例「会议改时」", [["待确认", "省略"], ["预约", "预约"], ["取消", "取消"], ["改期", "改期"]]),
  ],
  run({ booking, cancel, change }) {
    const rules: Record<string, string | undefined> = { "预约": booking, "取消": cancel, "改时": change };
    const cases = [...samples, { text: "大家好", key: "", label: "待确认" }];
    const results = cases.map(test => ({ ...test, predicted: rules[test.key] ?? "待确认" }));
    const hits = results.filter(r => r.label === r.predicted).length;
    return {
      rows: results.map(r => `${r.text} → ${r.predicted}（预期：${r.label}）`),
      evidence: `留出样例通过 ${hits}/${results.length}。这是关键词演示，实际模型可能泛化也可能犯错。`,
      passed: hits === results.length,
    };
  },
};

export const format: CLab = {
  title: "让 JSON 同时可解析、可使用",
  guide: '接收方只接受对象，字段恰好为 title（字符串）和 minutes（数字）。源记录为「社团例会，耗时 30 分钟」。',
  goal: '提交合法 JSON，例如应有 title 对应「社团例会」，minutes 保持数值 30。',
  controls: [{ id: "json", label: "交给程序的文本", initial: '{"title":"社团例会","minutes":"30"}', multiline: true }],
  run({ json }) {
    let parsed: unknown;
    try { parsed = JSON.parse(json ?? ""); } catch {
      return { rows: ["JSON.parse 失败"], evidence: "先检查引号、括号和末尾逗号。", passed: false };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { rows: ["语法合法，根值不是对象"], evidence: "接收方要求一个包含指定字段的对象。", passed: false };
    }
    const data = parsed as Record<string, unknown>;
    const shaped = Object.keys(data).length === 2 && typeof data.title === "string" && typeof data.minutes === "number";
    const passed = shaped && data.title === "社团例会" && data.minutes === 30;
    return { rows: ["JSON.parse 成功", `字段约定${shaped ? "通过" : "不通过"}`, JSON.stringify(data)],
      evidence: passed ? "语法、类型、原始记录均吻合。" : "语法通过之后还要核对字段类型与来源内容。", passed };
  },
};

const steps = [["publish", "输出通知"], ["facts", "提取事实"], ["validate", "核对与标记缺项"]] as const;
export const pipeline: CLab = {
  title: "把步骤接成能运行的流程",
  guide: "资料：周六 14:00 举行摄影活动。缺少地点。输出端只接受已核对时间和显式未知地点。",
  goal: "先产生事实表，完成核对和缺项标记，再输出有正确时间且地点待定的通知。",
  controls: ["first", "second", "third"].map((id, index) => select(id, `第 ${index + 1} 步`, steps)),
  run(values) {
    let facts: { time: string; place?: string } | undefined;
    let validated = false;
    let notice: string | undefined;
    const rows = ["first", "second", "third"].map(id => {
      if (values[id] === "facts") {
        facts = { time: "周六 14:00" }; validated = false;
        return "提取 · 已得到时间，地点为空";
      }
      if (values[id] === "validate") {
        if (!facts) return "核对 · 缺少事实表";
        facts.place ??= "待定"; validated = true;
        return "核对 · 时间有来源，缺失地点写为待定";
      }
      if (!facts || !validated) return "输出 · 因缺少已核对的事实而停止";
      notice = `摄影活动：${facts.time}，地点${facts.place}。`;
      return notice;
    });
    return { rows, evidence: notice ? "通知使用的是前一阶段的已核对产物。" : "下游步骤需要明确的输入，检查最先失败的一行。", passed: Boolean(notice) };
  },
};

export const verify: CLab = {
  title: "用独立规则复查",
  guide: "通知需以「周六」开头，包含来自原文的「西门」，最多 12 个字符（含标点）。",
  goal: "修订通知，让格式、来源和长度都通过程序检查。",
  controls: [{ id: "draft", label: "待检查草稿", initial: "周六到东门集合，欢迎所有社员准时前来参加！", multiline: true }],
  run({ draft }) {
    const text = (draft ?? "").trim();
    const length = Array.from(text).length;
    const checks = [
      { ok: text.startsWith("周六"), label: "开头是周六" },
      { ok: text.includes("西门") && !text.includes("东门"), label: "保留来源西门且无冲突地点" },
      { ok: length > 0 && length <= 12, label: `长度 ${length}/12` },
    ];
    return { rows: checks.map(check => `${check.ok ? "通过" : "未过"} · ${check.label}`),
      evidence: "核对来自显式规则和原始来源。模型再次认可自己的回答不能替代这些证据。",
      passed: checks.every(check => check.ok) };
  },
};

export const iterate: CLab = {
  title: "一次改一项，记录两组结果",
  guide: "同一份四题样例回放。基线会答对直接问题，缺失信息会猜测，格式随机例失败。选择改动，查看各样例。",
  goal: "固定测试集，只添加「缺信息则标缺失」，让两条缺信息样例通过且保留已有的正确结果。",
  controls: [
    select("missing", "缺信息处理", [["guess", "基线：猜测"], ["mark", "标记缺失"]]),
    select("format", "输出格式", [["plain", "基线：短句"], ["structured", "结构化字段"]]),
  ],
  run({ missing, format }) {
    const baseline = [true, false, false, true];
    const current = [true, missing === "mark", missing === "mark", format !== "structured"];
    const labels = ["直接事实", "时间缺失", "地点缺失", "旧纯文本消费者"];
    const improved = current.filter(Boolean).length - baseline.filter(Boolean).length;
    const passed = improved === 2 && baseline.every((ok, i) => !ok || current[i]);
    return { rows: labels.map((label, i) => `${label} · ${baseline[i] ? "通过" : "未过"} → ${current[i] ? "通过" : "未过"}`),
      evidence: `同一测试集净变化 ${improved}。这里只回放预先定义的输出结果，实测要保存版本和真实输出。`, passed };
  },
};
