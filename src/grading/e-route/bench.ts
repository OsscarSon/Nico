import {
  batchReport, cleanRows, cleaned, dispatchTriggers, pipeline, rawRows, simulateGemini, summarize, total,
  type Cleaning, type Group, type Metric, type Point,
} from "./data";

type Values = Record<string, string>;
type Field = { key: string; label: string; initial: string; options?: [string, string][] };
type Check = { label: string; observed: string; ok: boolean };
export type Report = {
  checks: Check[];
  table?: { headers: string[]; rows: (string | number)[][] };
  chart?: { kind: "bar" | "line"; points: Point[] };
  code?: string;
};
type Bench = { fields: Field[]; run: (values: Values) => Report };
const select = (key: string, label: string, initial: string, options: [string, string][]): Field => ({ key, label, initial, options });
const toggle = (key: string, label: string) => select(key, label, "off", [["off", "不启用"], ["on", "启用"]]);
const check = (label: string, observed: string, ok: boolean): Check => ({ label, observed, ok });
const on = (value: string | undefined) => value === "on";
export const rulesFrom = (v: Values): Cleaning => ({ trim: on(v.trim), strict: on(v.strict), dedup: on(v.dedup) });
export const cleaningFields = [toggle("trim", "去首尾空格"), toggle("strict", "严格金额检查"), toggle("dedup", "按单号去重")];
export const passed = (report: Report | null) => Boolean(report?.checks.length && report.checks.every(c => c.ok));

const cleaning: Bench = {
  fields: cleaningFields,
  run(v) {
    const r = cleanRows(rawRows, rulesFrom(v));
    return {
      checks: [
        check("有效数据", r.rows.length + " 条；合计 " + total(r.rows), r.rows.length === 5 && total(r.rows) === 34),
        check("异常记录", r.rejected.length + " 条；" + r.rejected.map(item => item.id + " " + item.reason).join("、"),
          r.rejected.some(item => item.reason === "重复单号") && r.rejected.filter(item => item.reason === "金额无效").length === 2),
        check("有效的零", r.rows.some(row => row.id === "s4" && row.amount === 0) ? "保留 s4 的零" : "零记录缺失",
          r.rows.some(row => row.id === "s4" && row.amount === 0)),
      ],
      table: { headers: ["单号", "队名", "金额", "日期"], rows: r.rows.map(row => [row.id, row.team, row.amount, row.day]) },
    };
  },
};
const groupField = select("group", "分组字段", "day", [["day", "日期"], ["team", "队名"]]);
const metricField = select("metric", "汇总方式", "count", [["count", "记录数"], ["sum", "金额求和"]]);
const toGroup = (v: string | undefined): Group => v === "team" ? "team" : "day";
const toMetric = (v: string | undefined): Metric => v === "sum" ? "sum" : "count";
const pointTable = (points: Point[], heading: string) => ({ headers: [heading, "结果"], rows: points.map(p => [p.key, p.value]) });
const pivot: Bench = {
  fields: [groupField, metricField],
  run(v) {
    const points = summarize(cleaned, toGroup(v.group), toMetric(v.metric));
    const sum = points.reduce((a, p) => a + p.value, 0);
    return {
      checks: [
        check("科学队", String(points.find(p => p.key === "科学")?.value ?? "未按队分组"), points.some(p => p.key === "科学" && p.value === 21)),
        check("汇总总计", String(sum), sum === total(cleaned)),
      ],
      table: pointTable(points, v.group === "team" ? "队名" : "日期"),
    };
  },
};
const chart: Bench = {
  fields: [groupField, select("kind", "图形", "line", [["line", "折线"], ["bar", "柱状"]])],
  run(v) {
    const grouped = toGroup(v.group);
    const points = summarize(cleaned, grouped, "sum");
    const kind = v.kind === "bar" ? "bar" : "line";
    return {
      checks: [
        check("数据系列", points.length + " 个" + (grouped === "team" ? "队名类别" : "日期"), grouped === "team" && points.length === 3),
        check("编码方式", kind === "bar" ? "从零起算的柱高" : "点与点依次连线", kind === "bar"),
      ],
      chart: { kind, points }, table: pointTable(points, grouped === "team" ? "队名" : "日期"),
    };
  },
};
const script: Bench = {
  fields: [
    select("limit", "读取行数", "2", [["2", "2"], ["3", "3"], ["5", "5"]]),
    select("width", "写入列数", "1", [["1", "1"], ["2", "2"]]),
  ],
  run(v) {
    const count = Number(v.limit ?? 2), width = Number(v.width ?? 1);
    const r = batchReport(cleaned, count, width);
    return {
      checks: [
        check("批量读取与计算", r.matrix.length + " 行 × 2 列", r.matrix.length === 3 && r.matrix[2]?.[1] === 18),
        check("批量写入", r.wrote ? "目标范围形状吻合，已写入本地输出预览" : "目标范围宽度和二维数组不匹配", r.wrote),
      ],
      table: { headers: ["单号", "加倍金额"], rows: r.wrote ? r.matrix.map(row => [...row]) : [] },
      code: [
        "function copyReport() {",
        "  const sheet = SpreadsheetApp.getActiveSheet();",
        "  const rows = sheet.getRange(2, 1, " + count + ", 2).getValues();",
        "  const report = rows.map(([id, amount]) => [id, amount * 2]);",
        "  sheet.getRange(2, 4, report.length, " + width + ").setValues(report);",
        "}",
      ].join("\n"),
    };
  },
};
const triggers: Bench = {
  fields: [
    select("kind", "触发类型", "edit", [["edit", "编辑事件"], ["clock", "时钟事件"]]),
    select("hour", "模拟时段", "12", [["8", "08:00"], ["12", "12:00"]]),
    toggle("dedup", "同一报告只执行一次"),
  ],
  run(v) {
    const events = dispatchTriggers(v.kind === "clock" ? "clock" : "edit", Number(v.hour), on(v.dedup));
    const completed = events.filter(event => event.ran);
    return {
      checks: [
        check("运行记录", completed.map(e => e.key).join("、") || "无匹配任务",
          completed.map(e => e.key).join(",") === "周一报告,周二报告"),
        check("重试去重", events.some(e => e.duplicate) ? "重复报告已跳过" : "未记录重复跳过", events.some(e => e.duplicate)),
      ],
      table: { headers: ["事件", "时间", "处理"], rows: events.map(e => [e.key, e.hour + ":00", e.ran ? "运行" : e.duplicate ? "重复" : "忽略"]) },
    };
  },
};
export const exampleRequest = JSON.stringify({ contents: [{ role: "user", parts: [{ text: "只整理公开活动汇总。" }] }], generationConfig: { responseMimeType: "application/json" } });
const gemini: Bench = {
  fields: [
    select("data", "数据范围", "private", [["private", "含私人字段的模拟样例"], ["summary", "公开活动汇总"], ["later", "较晚日期的公开汇总"]]),
    { key: "request", label: "离线请求 JSON", initial: "{}" },
  ],
  run(v) {
    const r = simulateGemini(v.request ?? "", v.data === "summary" || v.data === "later" ? v.data : "private");
    if ("error" in r) return { checks: [check("请求检查", r.error ?? "未能验证", false)] };
    return {
      checks: [
        check("模拟响应", "从 candidates[0].content.parts[0].text 读取 JSON", !!r.response),
        check("本地对账", "合计 " + r.result.amount + "；记录 " + r.result.rows,
          r.result.amount === total(cleaned) && r.result.rows === cleaned.length),
      ],
      code: JSON.stringify(r.response, null, 2),
    };
  },
};
const dashboard: Bench = {
  fields: [
    select("team", "看板队名筛选", "all", [["all", "全部"], ["science", "科学"]]),
    select("day", "日期窗口", "all", [["all", "全部"], ["later", "11 月 4 日起"]]),
    metricField,
  ],
  run(v) {
    const rows = cleaned.filter(r => (v.team !== "science" || r.team === "科学") && (v.day !== "later" || r.day >= "2026-11-04"));
    const value = v.metric === "sum" ? total(rows) : rows.length;
    return {
      checks: [
        check("过滤后明细", rows.length + " 条；" + rows.map(r => r.id).join("、"), rows.length === 1 && rows[0]?.id === "s3"),
        check("指标卡", String(value), v.metric === "sum" && value === 9),
      ],
      table: { headers: ["单号", "队名", "金额", "日期"], rows: rows.map(r => [r.id, r.team, r.amount, r.day]) },
    };
  },
};
const pipelineBench: Bench = {
  fields: [select("load", "装载策略", "append", [["append", "逐行追加"], ["upsert", "按单号插入或更新"]])],
  run(v) {
    const r = pipeline(v.load === "upsert" ? "upsert" : "append");
    return {
      checks: [
        check("首次更新", r.once.length + " 条；合计 " + total(r.once), r.once.length === 6 && total(r.once) === 38),
        check("重放同一批次", r.twice.length + " 条；合计 " + total(r.twice), r.twice.length === 6 && total(r.twice) === 38
          && JSON.stringify(r.once) === JSON.stringify(r.twice)),
      ],
      table: { headers: ["单号", "队名", "金额"], rows: r.twice.map(r => [r.id, r.team, r.amount]) },
    };
  },
};
export const benches = { cleaning, pivot, chart, script, triggers, gemini, dashboard, pipeline: pipelineBench };
export type BenchKey = keyof typeof benches;
