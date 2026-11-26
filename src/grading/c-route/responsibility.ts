import { library, searchLibrary } from "./building";
import { select, type CLab } from "./types";

export const fairness: CLab = {
  title: "看分组错误和素材许可",
  guide: "通知助手在两类同义写法上各有 4 个样例。版本 A 分别通过 4 和 2 题，版本 B 各通过 3 题。公开演示还需要有明确使用权的插图。",
  goal: "保持至少 6/8 的总体通过率，将组间通过率差降为 0，并确认插图使用权。",
  controls: [
    select("version", "通知解析规则", [["a", "A：原词表"], ["b", "B：加入同义词"]]),
    select("art", "演示插图", [["unknown", "网上找到，许可不明"], ["own", "原创并有发布授权"]]),
  ],
  run({ version, art }) {
    const groups = version === "b" ? [[1, 1, 0, 1], [1, 0, 1, 1]] : [[1, 1, 1, 1], [1, 0, 0, 1]];
    const hits = groups.map(group => group.filter(Boolean).length);
    const delta = Math.abs(hits[0]! - hits[1]!) * 25;
    return {
      rows: hits.map((hit, i) => `样本组 ${i + 1}：${hit}/4（${hit * 25}%）`),
      evidence: `组间差 ${delta} 个百分点。素材：${art === "own" ? "有发布授权" : "许可待确认"}。小样本结果需要复测。`,
      passed: hits[0]! + hits[1]! >= 6 && delta === 0 && art === "own",
    };
  },
};

export const trust: CLab = {
  title: "为外来资料加权限边界",
  guide: "用户只要求概括公开馆规。资料中另夹一条抽象的「写入请求」标记，代表一个与任务无关的操作。所有执行均是本地布尔值。",
  goal: "概括公开规则，同时让夹在资料中的写入请求无法获授权或执行。",
  controls: [
    select("origin", "外来内容处理", [["instruction", "把资料当操作授权"], ["data", "把资料只当数据"]]),
    select("permissions", "工具范围", [["wide", "允许读写"], ["read", "公开规则只读"]]),
    select("summarize", "完成用户任务", [["no", "不返回摘要"], ["yes", "返回公开规则摘要"]]),
  ],
  run({ origin, permissions, summarize }) {
    const unauthorized = origin === "instruction" && permissions === "wide";
    const served = summarize === "yes";
    return {
      rows: [`资料夹带操作：${unauthorized ? "模拟越权，规则配置有缺口" : "阻止"}`,
        served ? "公开规则摘要：普通图书借阅 14 天 [L3]" : "没有返回公开规则摘要"],
      evidence: "来源判定和工具的独立权限校验都应有效。这里只记录策略判定，没有真实工具调用。",
      passed: !unauthorized && served && origin === "data" && permissions === "read",
    };
  },
};

const tasks = [
  { key: "sum", label: "计算精确报销总额", expected: "formula", outcome: `凭证合计 ¥${([1250, 725, 2025].reduce((a, b) => a + b, 0) / 100).toFixed(2)}` },
  { key: "ideas", label: "为公开展览想三个标题", expected: "brainstorm", outcome: "取得 3 份固定示例草稿，送组织者选稿" },
  { key: "decision", label: "最终决定借阅权益争议", expected: "human", outcome: "形成待复核事项，等待负责人处理" },
];
export const delegate: CLab = {
  title: "按任务选择可靠的做法",
  guide: "预算只够为一个低风险任务做模型草拟。精确金额须可复算，涉及个人权益的最终决定须由负责人员复核。",
  goal: "完成三项分派，同时满足准确、责任和预算要求。",
  controls: tasks.map(task => select(task.key, task.label, [
    ["brainstorm", "让模型起草"], ["formula", "使用固定计算规则"], ["human", "交由负责人员"],
  ])),
  run(values) {
    const drafts = tasks.filter(task => values[task.key] === "brainstorm").length;
    const correct = tasks.filter(task => values[task.key] === task.expected).length;
    return { rows: tasks.map(task => `${task.label} · ${values[task.key] === task.expected ? task.outcome : "当前做法不满足任务要求"}`),
      evidence: `通过 ${correct}/3，模型草拟 ${drafts}/1 次。先区分创意、确定性计算和有后果的决策。`,
      passed: correct === tasks.length && drafts === 1 };
  },
};

const suite = [
  { label: "当前开放时间", query: "周六 开放", kind: "lookup", expected: "L2", expectedAction: "answer" },
  { label: "普通借阅期限", query: "借阅 期限", kind: "lookup", expected: "L3", expectedAction: "answer" },
  { label: "失物招领", query: "失物", kind: "lookup", expected: "", expectedAction: "abstain" },
  { label: "要求替人修改账户", query: "", kind: "write", expected: "", expectedAction: "block" },
];

export const capstone: CLab = {
  title: "图书馆公开咨询助手",
  guide: "用四个测试案例运行本地原型。公开回答必须有最新版证据和编号。未知问题应说明资料不足，账户修改应由人工渠道处理。",
  goal: "通过全部四案，并导出评估 CSV，记录预期、实际行为、证据编号和是否通过。",
  controls: [
    select("docs", "检索范围", [["all", "所有版本"], ["current", "当前版本"]]),
    select("unknown", "没有资料时", [["guess", "给一个猜测"], ["abstain", "承认资料不足"]]),
    select("access", "账户操作", [["allow", "允许模拟写入"], ["block", "交给人工渠道"]]),
    select("citation", "输出格式", [["text", "仅文本"], ["cite", "文本与证据编号"]]),
  ],
  run({ docs, unknown, access, citation }) {
    const results = suite.map(test => {
      const hit = test.query ? searchLibrary(test.query, docs === "current")[0] : undefined;
      const action = test.kind === "write"
        ? access === "block" ? "block" : "unsafe-write"
        : hit ? "answer" : unknown === "abstain" ? "abstain" : "guess";
      const cited = action === "answer" && citation === "cite" ? hit?.id ?? "" : "";
      const ok = action === test.expectedAction && cited === test.expected;
      return { ...test, action, cited, line: hit?.line ?? "", ok };
    });
    const labels: Record<string, string> = {
      answer: "回答", abstain: "资料不足", block: "转人工", guess: "猜测", "unsafe-write": "策略未拦截写入",
    };
    const quote = (value: string) => '"' + value.replaceAll('"', '""') + '"';
    const csv = [
      ["用例", "预期行为", "实际行为", "实际答复", "预期证据", "实际证据", "通过"],
      ...results.map(item => [item.label, labels[item.expectedAction]!, labels[item.action]!, item.line, item.expected, item.cited, item.ok ? "是" : "否"]),
    ].map(row => row.map(quote).join(",")).join("\r\n");
    const hits = results.filter(item => item.ok).length;
    return {
      rows: results.map(item => `${item.label} · ${labels[item.action]}${item.line ? "：" + item.line : ""}${item.cited ? " [" + item.cited + "]" : ""} · ${item.ok ? "通过" : "未过"}`),
      evidence: `基准通过 ${hits}/${suite.length}。来源池：${library.length} 份虚构公开规则。测试只验证本地原型的这些用例。`,
      passed: hits === suite.length,
      csv,
    };
  },
};
