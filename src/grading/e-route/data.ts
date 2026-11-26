export type Raw = { id: string; team: string; amount: string; day: string };
export const teams = ["科学", "艺术", "社区"] as const;
type Team = typeof teams[number];
export type Row = Omit<Raw, "team" | "amount"> & { team: Team; amount: number };
export type Cleaning = { trim: boolean; strict: boolean; dedup: boolean };

export const rawRows: readonly Raw[] = [
  { id: "s1", team: " 科学 ", amount: "12", day: "2026-11-03" },
  { id: "s2", team: "艺术", amount: "5", day: "2026-11-03" },
  { id: "s2", team: "艺术", amount: "5", day: "2026-11-03" },
  { id: "s3", team: "科学", amount: "9", day: "2026-11-04" },
  { id: "s4", team: "社区", amount: "0", day: "2026-11-04" },
  { id: "s5", team: "艺术", amount: "", day: "2026-11-05" },
  { id: "s6", team: "艺术", amount: "4x", day: "2026-11-05" },
  { id: "s7", team: "社区", amount: "8", day: "2026-11-06" },
];
export const checkedCleaning: Cleaning = { trim: true, strict: true, dedup: true };

export function cleanRows(raw: readonly Raw[], rules: Cleaning) {
  const seen = new Set<string>();
  const rows: Row[] = [];
  const rejected: { id: string; reason: string }[] = [];
  for (const item of raw) {
    const id = rules.trim ? item.id.trim() : item.id;
    const label = rules.trim ? item.team.trim() : item.team;
    const text = rules.trim ? item.amount.trim() : item.amount;
    const team = teams.find(value => value === label);
    const amount = rules.strict ? /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN : Number.parseFloat(text || "0");
    if (!id || !team || !Number.isFinite(amount) || amount < 0) {
      rejected.push({ id, reason: !id ? "缺少单号" : !team ? "队名不匹配" : "金额无效" });
      continue;
    }
    if (rules.dedup && seen.has(id)) {
      rejected.push({ id, reason: "重复单号" });
      continue;
    }
    seen.add(id);
    rows.push({ id, team, amount, day: item.day });
  }
  return { rows, rejected };
}
export const cleaned = cleanRows(rawRows, checkedCleaning).rows;
export const total = (rows: readonly Row[]) => rows.reduce((sum, row) => sum + row.amount, 0);
export type Metric = "sum" | "count";
export type Group = "team" | "day";
export type Point = { key: string; value: number };

export function summarize(rows: readonly Row[], group: Group, metric: Metric): Point[] {
  const values = new Map<string, number>();
  for (const row of rows) {
    const key = row[group];
    values.set(key, (values.get(key) ?? 0) + (metric === "sum" ? row.amount : 1));
  }
  return [...values].sort(([a], [b]) => a.localeCompare(b, "zh-CN")).map(([key, value]) => ({ key, value }));
}

export function batchReport(rows: readonly Row[], limit: number, width: number) {
  const matrix = rows.slice(0, limit).map(row => [row.id, row.amount * 2] as const);
  return { matrix, wrote: matrix.length > 0 && width === matrix[0]?.length };
}

type TriggerEvent = { key: string; kind: "clock" | "edit"; hour: number };
export const eventFixture: readonly TriggerEvent[] = [
  { key: "上午编辑", kind: "edit", hour: 8 },
  { key: "周一报告", kind: "clock", hour: 8 },
  { key: "周一报告", kind: "clock", hour: 8 },
  { key: "午间检查", kind: "clock", hour: 12 },
  { key: "周二报告", kind: "clock", hour: 8 },
];
export function dispatchTriggers(kind: TriggerEvent["kind"], hour: number, dedup: boolean) {
  const fired = new Set<string>();
  return eventFixture.map(event => {
    const matches = event.kind === kind && (kind === "edit" || event.hour === hour);
    const duplicate = matches && fired.has(event.key) && dedup;
    if (matches) fired.add(event.key);
    return { ...event, ran: matches && !duplicate, duplicate };
  });
}

export function simulateGemini(request: string, data: "summary" | "later" | "private") {
  if (data === "private") return { error: "含私人字段的样例被拦截，请只提供公开汇总。" };
  if (request.length > 600) return { error: "请把离线请求控制在 600 字内。" };
  let body: { contents?: unknown; generationConfig?: { responseMimeType?: string } } | null;
  try { body = JSON.parse(request); } catch { return { error: "请求不是合法 JSON。" }; }
  const content = Array.isArray(body?.contents) ? body.contents[0] : undefined;
  const text = Array.isArray(content?.parts) ? content.parts[0]?.text : undefined;
  if (content?.role !== "user" || typeof text !== "string" || !text.trim()) return { error: "请提供 contents[0] 的 user 角色和非空 parts[0].text。" };
  if (body?.generationConfig?.responseMimeType !== "application/json") return { error: "请请求 application/json。真实响应仍需校验。" };
  const selected = data === "later" ? cleaned.filter(row => row.day >= "2026-11-04") : cleaned;
  const response = { candidates: [{ content: { parts: [{ text: JSON.stringify({ amount: total(selected), rows: selected.length }) }] } }] };
  const result = JSON.parse(response.candidates[0]!.content.parts[0]!.text);
  return { response, result };
}

const later: readonly Row[] = [
  { id: "s3", team: "科学", amount: 11, day: "2026-11-04" },
  { id: "s8", team: "艺术", amount: 2, day: "2026-11-06" },
];
export function loadBatch(rows: readonly Row[], batch: readonly Row[], mode: "append" | "upsert") {
  if (mode === "append") return [...rows, ...batch];
  const map = new Map(rows.map(row => [row.id, row]));
  for (const row of batch) map.set(row.id, row);
  return [...map.values()];
}
export function pipeline(mode: "append" | "upsert") {
  const once = loadBatch(cleaned, later, mode);
  const twice = loadBatch(once, later, mode);
  return { once, twice };
}

export function prepareReport(rules: Cleaning) {
  const { rows, rejected } = cleanRows(rawRows, rules);
  const revised = cleanRows([...rawRows, { id: "s9", team: "科学", amount: "3", day: "2026-11-06" }], rules);
  const table = summarize(rows, "team", "sum");
  const amount = total(rows);
  const passing = rows.length === 5 && rejected.length === 3 && amount === 34
    && revised.rows.length === 6 && total(revised.rows) === 37 && table.reduce((sum, point) => sum + point.value, 0) === amount;
  return { table, amount, inputCount: rawRows.length, count: rows.length, rejected, revised: total(revised.rows), passing };
}
export type PreparedReport = ReturnType<typeof prepareReport>;
export function reportCsv(report: PreparedReport) {
  return [["队名", "金额"], ...report.table.map(row => [row.key, row.value]), ["合计", report.amount]]
    .map(row => row.join(",")).join("\r\n") + "\r\n";
}
