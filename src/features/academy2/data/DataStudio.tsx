import { lazy, Suspense, useMemo, useState } from "react";
import { z } from "zod";
import {
  clean,
  filterSort,
  grouped,
  pairsFor,
  maxColumns,
  maxImport,
  maxRows,
  parseCSV,
  parseJSON,
  profile,
  tableCSV,
  tableJSON,
  validateTable,
  type Cleaning,
  type Table,
} from "../../../grading/academy2/data/table";
import {
  airSource,
  airTable,
  irisSource,
  irisTable,
} from "../../../content/academy2/data/datasets";
import {
  pythonExamples,
  sqlExamples,
} from "../../../content/academy2/data/notebooks";
import type { TeachingPackage } from "../../../runtime/notebookPython";
import { downloadText } from "../study/files";
import { DataChart, type PlotKind } from "./Plots";
import { benchmarkSQL, runSQL } from "./sqlClient";
import { LabReturn, saveReport, saveWorkspace, Workspaces } from "./workspaces";
import "./data.css";

const Python = lazy(() => import("../teaching/TeachingPython"));
const tableSchema = z.object({
  columns: z.array(z.string().max(64)).min(1).max(maxColumns),
  rows: z
    .array(
      z
        .array(
          z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]),
        )
        .max(maxColumns),
    )
    .max(maxRows),
});
const cellSchema = z.object({
  id: z.number().int(),
  type: z.enum(["sql", "python"]),
  code: z.string().max(16_000),
});
const charts = z.enum(["scatter", "line", "histogram", "box", "heatmap"]);
const view = z.object({
  chart: charts,
  axisX: z.string(),
  axisY: z.string(),
  column: z.string(),
  search: z.string(),
  order: z.enum(["none", "asc", "desc"]),
  pivotKey: z.string(),
  pivot: z.boolean(),
  shownCharts: z.array(charts).max(5),
});
const snapshot = z.object({
  version: z.literal(1),
  table: tableSchema,
  source: z.enum(["iris", "air", "local"]),
  cells: z.array(cellSchema).min(1).max(10),
  steps: z.array(z.string().max(180)).max(100),
  view: view.optional(),
  library: z
    .array(
      z.enum([
        "numpy",
        "pandas",
        "polars",
        "matplotlib",
        "seaborn",
        "scikit-learn",
      ]),
    )
    .max(6)
    .optional(),
});
type Block = z.infer<typeof cellSchema>;
export type DataEvidence = {
  table: Table;
  source: "iris" | "air" | "local";
  steps: string[];
  charts: PlotKind[];
  pivot: boolean;
  result?: Table;
  queries?: string[];
};
const typeLabels: { [key in Cleaning]: string } = {
  trim: "清理字符串前后空格",
  "drop-missing": "删除本列缺失行",
  median: "用本列中位数填补",
  dedupe: "移除整行重复",
  "as-number": "显式转换为数值",
  scale: "进行样本标准化",
  "drop-outliers": "删除 Tukey 围栏之外的数值行",
};
const chartChoices: Record<PlotKind, string> = {
  scatter: "散点图",
  line: "折线图",
  histogram: "直方图",
  box: "箱线图",
  heatmap: "相关热力图",
};
const packagesByExample: Record<string, TeachingPackage[]> = {
  numpy: ["numpy"],
  pandas: ["pandas"],
  polars: ["polars", "pandas"],
  matplotlib: ["numpy", "matplotlib"],
  seaborn: ["pandas", "seaborn", "matplotlib"],
};
const pretty = (value: number | null | undefined) =>
  value == null ? "—" : Number(value.toPrecision(6)).toString();
const identify = (source: "iris" | "air" | "local") =>
  source === "iris"
    ? "UCI Iris"
    : source === "air"
      ? "纽约 Air Quality（1973）"
      : "本地导入";
let nextCell = 20;

function ScrollTable({
  table,
  label,
  caption,
}: {
  table: Table;
  label: string;
  caption?: string;
}) {
  const [page, setPage] = useState(0);
  const total = Math.max(1, Math.ceil(table.rows.length / 12)),
    current = Math.min(page, total - 1);
  return (
    <div className="p3-tables">
      <div
        className="p3-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={label + "，可横向滚动"}
      >
        <table aria-label={label}>
          <caption>
            {caption ??
              table.rows.length + " 行 · " + table.columns.length + " 列"}
          </caption>
          <thead>
            <tr>
              {table.columns.map((column, i) => (
                <th key={i} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows
              .slice(current * 12, current * 12 + 12)
              .map((line, i) => (
                <tr key={i}>
                  {line.map((value, j) => (
                    <td key={j}>
                      {value === null ? (
                        <span className="muted">NULL</span>
                      ) : (
                        String(value)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {total > 1 && (
        <div className="row">
          <button
            className="btn secondary"
            type="button"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            上一页
          </button>
          <small>
            {current + 1} / {total}
          </small>
          <button
            className="btn secondary"
            type="button"
            disabled={current + 1 >= total}
            onClick={() => setPage(current + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
function ColumnPicker({
  columns,
  label,
  value,
  change,
}: {
  columns: string[];
  label: string;
  value: string;
  change: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => change(e.target.value)}>
        {columns.map((key) => (
          <option key={key}>{key}</option>
        ))}
      </select>
    </label>
  );
}

export default function DataStudio({
  scenario = "eda",
  topic,
  onEvidence,
  kind = "lab",
}: {
  scenario?: string;
  topic?: string;
  onEvidence?: (value: DataEvidence) => void;
  kind?: "lab" | "dashboard" | "database";
}) {
  const useAir =
    scenario === "dashboard" ||
    ["missing", "cleaning", "air", "outliers"].includes(scenario);
  const [table, setTable] = useState(useAir ? airTable : irisTable);
  const [source, setSource] = useState<"iris" | "air" | "local">(
    useAir ? "air" : "iris",
  );
  const [steps, setSteps] = useState<string[]>([]);
  const [savedTables, setSavedTables] = useState<
    { table: Table; step: string }[]
  >([]);
  const [operation, setOperation] = useState<Cleaning>("trim"),
    [column, setColumn] = useState("");
  const [order, setOrder] = useState<"none" | "asc" | "desc">("none"),
    [search, setSearch] = useState("");
  const [chart, setChart] = useState<PlotKind>("scatter"),
    [axisX, setAxisX] = useState(useAir ? "temp" : "petal_length"),
    [axisY, setAxisY] = useState(useAir ? "ozone" : "petal_width");
  const [pivotKey, setPivotKey] = useState(useAir ? "month" : "species"),
    [pivot, setPivot] = useState(false);
  const [shownCharts, setShownCharts] = useState<PlotKind[]>([]);
  const [cells, setCells] = useState<Block[]>(() => {
    const sql = {
      id: 1,
      type: "sql" as const,
      code:
        sqlExamples[scenario] ??
        (useAir
          ? "SELECT month, COUNT(ozone), AVG(ozone) FROM dataset GROUP BY month ORDER BY month"
          : sqlExamples.sql!),
    };
    const py = pythonExamples[scenario];
    return py ? [sql, { id: 2, type: "python", code: py }] : [sql];
  });
  const [openPython, setOpenPython] = useState(false),
    [library, setLibrary] = useState<string[]>(
      packagesByExample[scenario] ?? [],
    );
  const [result, setResult] = useState<{
    id: number;
    tables: Table[];
    elapsed: number;
    queries: string[];
  }>();
  const [timing, setTiming] =
    useState<Awaited<ReturnType<typeof benchmarkSQL>>>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv"),
    [pasted, setPasted] = useState(""),
    [infer, setInfer] = useState(true);
  const key = table.columns.includes(column) ? column : table.columns[0]!;
  const x = table.columns.includes(axisX) ? axisX : key,
    y = table.columns.includes(axisY) ? axisY : (table.columns[1] ?? x);
  const group = table.columns.includes(pivotKey)
    ? pivotKey
    : table.columns.at(-1)!;
  const visible = useMemo(
    () => filterSort(table, key, search, order),
    [table, key, search, order],
  );
  const summaries = useMemo(() => profile(visible), [visible]);
  function evidence(override: Partial<DataEvidence> = {}) {
    onEvidence?.({
      table,
      source,
      steps,
      charts: shownCharts,
      pivot,
      result: result?.tables.at(-1),
      queries: result?.queries,
      ...override,
    });
  }
  function reset() {
    setError("");
    setMessage("");
    setTiming(undefined);
  }
  function load(next: Table, origin: typeof source) {
    const repaired = validateTable(next);
    setTable(repaired);
    setSource(origin);
    setSteps([]);
    setSavedTables([]);
    setShownCharts([]);
    setPivot(false);
    setResult(undefined);
    setMessage("已载入 " + repaired.rows.length + " 行。");
    evidence({
      table: repaired,
      source: origin,
      steps: [],
      charts: [],
      pivot: false,
      result: undefined,
      queries: undefined,
    });
  }
  function change(code: string, id: number) {
    setResult(undefined);
    evidence({ result: undefined, queries: undefined });
    setCells((current) =>
      current.map((cell) => (cell.id === id ? { ...cell, code } : cell)),
    );
  }
  async function execute(id: number) {
    reset();
    setBusy(true);
    setResult(undefined);
    evidence({ result: undefined, queries: undefined });
    try {
      const index = cells.findIndex((cell) => cell.id === id);
      const queries = cells
        .slice(0, index + 1)
        .filter((cell) => cell.type === "sql")
        .map((cell) => cell.code);
      const output = await runSQL(table, queries);
      const next = {
        id,
        tables: output.result,
        elapsed: output.elapsedMs,
        queries,
      };
      setResult(next);
      evidence({ result: next.tables.at(-1), queries });
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "SQL 执行失败。");
    } finally {
      setBusy(false);
    }
  }
  function report() {
    const text = [
      "# " + identify(source) + " · 数据分析记录",
      "## 数据质量",
      ...summaries.map(
        (item) =>
          "- " +
          item.name +
          " · 缺失 " +
          item.missing +
          " · 均值 " +
          pretty(item.summary?.mean),
      ),
      "## 操作",
      ...steps.map((step) => "- " + step),
      "## SQL",
      ...(result?.queries ?? []).map((query) => "\n```sql\n" + query + "\n```"),
      ...(result?.tables.at(-1)
        ? [
            "## 查询结果预览",
            "\n```csv\n" +
              tableCSV({
                ...result.tables.at(-1)!,
                rows: result.tables.at(-1)!.rows.slice(0, 20),
              }) +
              "\n```",
          ]
        : []),
    ].join("\n");
    setMessage(
      saveReport(
        "experiment",
        topic ?? "data",
        identify(source) + " · Data Studio",
        text,
      )
        ? "已保存并下载分析报告。"
        : "已下载报告。浏览器存储不可用。",
    );
  }
  return (
    <div className="p3-lab">
      <LabReturn topic={topic} />
      <section className="a2-panel p3-card p3-import">
        <div>
          <h2>数据来源</h2>
          <p>
            {identify(source)} · {table.rows.length} 条记录
            {source !== "local" && (
              <>
                {" "}
                ·{" "}
                <a
                  href={source === "iris" ? irisSource : airSource}
                  target="_blank"
                  rel="noreferrer"
                >
                  原始数据说明 ↗
                </a>
              </>
            )}
          </p>
        </div>
        <div className="row">
          <button
            className="btn secondary"
            disabled={busy}
            type="button"
            onClick={() => {
              reset();
              load(irisTable, "iris");
            }}
          >
            使用 Iris
          </button>
          <button
            className="btn secondary"
            disabled={busy}
            type="button"
            onClick={() => {
              reset();
              load(airTable, "air");
            }}
          >
            使用 Air Quality
          </button>
        </div>
        <details>
          <summary>导入 CSV 或 JSON</summary>
          <div className="p3-fields">
            <label>
              数据格式
              <select
                value={importFormat}
                onChange={(e) =>
                  setImportFormat(e.target.value as typeof importFormat)
                }
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </label>
            <label className="p3-check">
              <input
                type="checkbox"
                checked={infer}
                onChange={(e) => setInfer(e.target.checked)}
              />
              CSV 推断数字并保留前导零 ID
            </label>
          </div>
          <label>
            粘贴数据
            <textarea
              rows={4}
              maxLength={maxImport}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
          </label>
          <div className="row">
            <button
              className="btn"
              type="button"
              disabled={busy || !pasted.trim()}
              onClick={() => {
                reset();
                try {
                  load(
                    importFormat === "csv"
                      ? parseCSV(pasted, infer)
                      : parseJSON(pasted),
                    "local",
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "导入失败。");
                }
              }}
            >
              导入文本
            </button>
            <label>
              选择数据文件
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  reset();
                  try {
                    if (file.size > maxImport * 4)
                      throw Error("导入文件太大。");
                    const input = await file.text();
                    load(
                      file.name.toLowerCase().endsWith(".json")
                        ? parseJSON(input)
                        : parseCSV(input, infer),
                      "local",
                    );
                  } catch (error) {
                    setError(
                      error instanceof Error ? error.message : "导入失败。",
                    );
                  }
                }}
              />
            </label>
          </div>
        </details>
        {error && (
          <p role="alert" className="feedback bad">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <div className="p3-grid">
        <section className="a2-panel p3-card">
          <h2>预览、筛选和清洗</h2>
          <div className="p3-fields">
            <ColumnPicker
              columns={table.columns}
              label="操作列"
              value={key}
              change={setColumn}
            />
            <label>
              包含文本
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              排序
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as typeof order)}
              >
                <option value="none">原顺序</option>
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
            </label>
          </div>
          <ScrollTable table={visible} label="数据预览" />
          <div className="p3-fields">
            <label>
              清洗操作
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as Cleaning)}
              >
                {Object.entries(typeLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                reset();
                try {
                  const next = clean(table, operation, key);
                  if (
                    JSON.stringify(next.rows) === JSON.stringify(table.rows)
                  ) {
                    setMessage("这项操作没有改变数据。");
                    return;
                  }
                  const label =
                    typeLabels[operation] +
                    " · " +
                    key +
                    " · " +
                    table.rows.length +
                    " → " +
                    next.rows.length;
                  const history = [...steps, label].slice(-100);
                  setSavedTables((previous) =>
                    [...previous, { table, step: label }].slice(-10),
                  );
                  setTable(next);
                  setSteps(history);
                  setResult(undefined);
                  setMessage(label);
                  evidence({
                    table: next,
                    steps: history,
                    result: undefined,
                    queries: undefined,
                  });
                } catch (e) {
                  setError(e instanceof Error ? e.message : "操作失败。");
                }
              }}
            >
              应用清洗
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy || !savedTables.length}
              onClick={() => {
                const latest = savedTables.at(-1)!;
                const rest = steps.slice(0, -1);
                setTable(latest.table);
                setSteps(rest);
                setSavedTables((previous) => previous.slice(0, -1));
                setResult(undefined);
                setMessage("已撤销 " + latest.step);
                evidence({
                  table: latest.table,
                  steps: rest,
                  result: undefined,
                  queries: undefined,
                });
              }}
            >
              撤销上一步
            </button>
          </div>
          <div className="row">
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                downloadText(
                  "nico-dataset.csv",
                  tableCSV(visible),
                  "text/csv;charset=utf-8",
                )
              }
            >
              导出 CSV
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                downloadText(
                  "nico-dataset.json",
                  tableJSON(visible),
                  "application/json",
                )
              }
            >
              导出 JSON
            </button>
          </div>
          {!!steps.length && (
            <details>
              <summary>查看清洗步骤</summary>
              <ol>
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </details>
          )}
        </section>
        <section className="a2-panel p3-card">
          <h2>探索性分析</h2>
          <div className="p3-fields">
            <label>
              图表类型
              <select
                value={chart}
                onChange={(e) => setChart(e.target.value as PlotKind)}
              >
                {Object.entries(chartChoices).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <ColumnPicker
              columns={table.columns}
              label="横轴或分析列"
              value={x}
              change={setAxisX}
            />
            <ColumnPicker
              columns={table.columns}
              label="纵轴或聚合列"
              value={y}
              change={setAxisY}
            />
          </div>
          <DataChart kind={chart} table={visible} x={x} y={y} />
          <button
            type="button"
            className="btn secondary"
            disabled={shownCharts.includes(chart)}
            onClick={() => {
              const numeric = summaries
                .filter((item) => item.summary)
                .map((item) => item.name);
              if (
                !numeric.includes(x) ||
                (["scatter", "line"].includes(chart) &&
                  !pairsFor(visible, x, y).length)
              ) {
                setError("图表需要有效数值列。");
                return;
              }
              const next = [...shownCharts, chart];
              setShownCharts(next);
              evidence({ charts: next });
              setMessage("已记录 " + chartChoices[chart]);
            }}
          >
            记录本次图表
          </button>
          <details>
            <summary>缺失值和描述统计</summary>
            <ScrollTable
              label="列统计摘要"
              table={{
                columns: [
                  "列",
                  "类型",
                  "缺失",
                  "不同值",
                  "均值",
                  "中位数",
                  "样本标准差",
                  "IQR",
                ],
                rows: summaries.map((item) => [
                  item.name,
                  item.types,
                  item.missing,
                  item.unique,
                  pretty(item.summary?.mean),
                  pretty(item.summary?.median),
                  pretty(item.summary?.sd),
                  item.summary
                    ? pretty(item.summary.q3 - item.summary.q1)
                    : "—",
                ]),
              }}
            />
          </details>
          <details>
            <summary>分组和透视汇总</summary>
            <ColumnPicker
              columns={table.columns}
              label="分组列"
              value={group}
              change={setPivotKey}
            />
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setPivot(true);
                evidence({ pivot: true });
              }}
            >
              生成透视汇总
            </button>
            {pivot && (
              <ScrollTable
                label="透视汇总"
                table={{
                  columns: [group, "总记录", "有效数值", "均值"],
                  rows: grouped(visible, group, y).map((row) => [
                    row.group,
                    row.rows,
                    row.valid,
                    row.mean,
                  ]),
                }}
              />
            )}
          </details>
        </section>
      </div>
      {kind !== "dashboard" && (
        <section className="a2-panel p3-card">
          <h2>SQLite 与 Python Notebook</h2>
          <p>
            SQL 单元读取清洗后全表 <code>dataset</code>，运行时依序重放此前 SQL
            单元。Python 单元使用同一表的 <code>columns</code> 与{" "}
            <code>rows</code>，重放此前 Python 单元。
          </p>
          {scenario === "polars" && (
            <p>
              首次运行会下载 Polars 与
              Pandas。比较同一批记录的实际查询耗时，数据构造在计时前完成。
            </p>
          )}
          <div className="row">
            <button
              className="btn secondary"
              type="button"
              disabled={busy || cells.length >= 10}
              onClick={() =>
                setCells((current) => [
                  ...current,
                  {
                    id: nextCell++,
                    type: "sql",
                    code: "SELECT * FROM dataset LIMIT 8",
                  },
                ])
              }
            >
              添加 SQL 单元
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={busy || cells.length >= 10}
              onClick={() => {
                setOpenPython(true);
                setCells((current) => [
                  ...current,
                  { id: nextCell++, type: "python", code: "print(len(rows))" },
                ]);
              }}
            >
              添加 Python 单元
            </button>
          </div>
          {cells.map((cell, index) => (
            <section className="p3-notebook-cell" key={cell.id}>
              <div className="row">
                <h3>
                  {index + 1} · {cell.type.toUpperCase()}
                </h3>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={busy || cells.length === 1}
                  onClick={() => {
                    setCells((current) =>
                      current.filter((value) => value.id !== cell.id),
                    );
                    setResult(undefined);
                    evidence({ result: undefined, queries: undefined });
                  }}
                >
                  移除单元 {index + 1}
                </button>
              </div>
              {cell.type === "sql" ? (
                <>
                  <label>
                    SQL 单元 {index + 1}
                    <textarea
                      rows={5}
                      spellCheck={false}
                      value={cell.code}
                      maxLength={16000}
                      disabled={busy}
                      onChange={(e) => change(e.target.value, cell.id)}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || !cell.code.trim()}
                    onClick={() => void execute(cell.id)}
                  >
                    执行 SQL
                  </button>
                  {result?.id === cell.id && (
                    <div role="status">
                      <p>SQLite 本次执行 {result.elapsed.toFixed(1)} ms</p>
                      {result.tables.length ? (
                        result.tables.map((table, i) => (
                          <ScrollTable
                            key={i}
                            table={table}
                            label={"SQL 结果 " + (i + 1)}
                          />
                        ))
                      ) : (
                        <p>语句已执行，未返回数据表。</p>
                      )}
                      <button
                        className="btn secondary"
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          reset();
                          setBusy(true);
                          try {
                            const bytes = await runSQL(
                              table,
                              result.queries,
                              true,
                            );
                            const url = URL.createObjectURL(
                                new Blob([new Uint8Array(bytes)], {
                                  type: "application/vnd.sqlite3",
                                }),
                              ),
                              a = document.createElement("a");
                            a.href = url;
                            a.download = "nico-analysis.sqlite";
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 0);
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "导出数据库失败。",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        导出 SQLite 数据库
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <details
                  open={openPython || undefined}
                  onToggle={(e) => {
                    if (e.currentTarget.open) setOpenPython(true);
                  }}
                >
                  <summary>打开 Python 编辑器</summary>
                  <label className="p3-check">
                    <input
                      type="checkbox"
                      checked={library.includes("numpy")}
                      onChange={(e) =>
                        setLibrary((current) =>
                          e.target.checked
                            ? [...new Set([...current, "numpy"])]
                            : current.filter((name) => name !== "numpy"),
                        )
                      }
                    />
                    加载 NumPy
                  </label>
                  <label className="p3-check">
                    <input
                      type="checkbox"
                      checked={library.includes("pandas")}
                      onChange={(e) =>
                        setLibrary((current) =>
                          e.target.checked
                            ? [...new Set([...current, "pandas"])]
                            : current.filter((name) => name !== "pandas"),
                        )
                      }
                    />
                    加载 Pandas
                  </label>
                  {openPython && (
                    <Suspense
                      fallback={<p role="status">正在加载 Python 编辑器…</p>}
                    >
                      <Python
                        initial={cell.code}
                        packages={library as TeachingPackage[]}
                        onCode={(code) => change(code, cell.id)}
                        transform={(code) => {
                          const input = JSON.stringify(JSON.stringify(table));
                          const before = cells
                            .slice(0, index)
                            .filter((cell) => cell.type === "python")
                            .map((cell) => cell.code);
                          return [
                            "import json\n_data=json.loads(" +
                              input +
                              ")\ncolumns, rows = _data['columns'], _data['rows']",
                            ...before,
                            code,
                          ].join("\n\n");
                        }}
                      />
                    </Suspense>
                  )}
                </details>
              )}
            </section>
          ))}
          {error && (
            <p role="alert" className="feedback bad">
              {error}
            </p>
          )}
        </section>
      )}
      {kind !== "dashboard" && (
        <details className="a2-panel p3-card">
          <summary>比较全表扫描与索引</summary>
          <p>
            用当前操作列的首个非空值重复 200 次等值计数。检查 SQL
            查询计划、结果行数、索引构建与查询耗时。
          </p>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={async () => {
              reset();
              setBusy(true);
              try {
                setTiming(await benchmarkSQL(table, key));
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "性能比较失败。",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            测量查询性能
          </button>
          {timing && (
            <dl className="p3-values">
              <div>
                <dt>相同行数</dt>
                <dd>{timing.scan.result}</dd>
              </div>
              <div>
                <dt>全表扫描</dt>
                <dd>{timing.scan.elapsed.toFixed(2)} ms</dd>
                <small>{timing.scan.plan}</small>
              </div>
              <div>
                <dt>使用索引</dt>
                <dd>{timing.index.elapsed.toFixed(2)} ms</dd>
                <small>{timing.index.plan}</small>
              </div>
              <div>
                <dt>建索引</dt>
                <dd>{timing.build.toFixed(2)} ms</dd>
              </div>
            </dl>
          )}
          {error && (
            <p role="alert" className="feedback bad">
              {error}
            </p>
          )}
        </details>
      )}
      <Workspaces
        kind="data"
        save={(title) =>
          saveWorkspace("data", title, {
            version: 1,
            table,
            source,
            cells,
            steps,
            library,
            view: {
              chart,
              axisX,
              axisY,
              column,
              search,
              order,
              pivotKey,
              pivot,
              shownCharts,
            },
          })
        }
        restore={(raw) => {
          const entry = snapshot.parse(raw);
          load(entry.table, entry.source);
          setSteps(entry.steps);
          if (entry.library) setLibrary(entry.library);
          setCells(entry.cells.map((cell) => ({ ...cell, id: nextCell++ })));
          if (entry.view) {
            setChart(entry.view.chart);
            setAxisX(entry.view.axisX);
            setAxisY(entry.view.axisY);
            setColumn(entry.view.column);
            setSearch(entry.view.search);
            setOrder(entry.view.order);
            setPivotKey(entry.view.pivotKey);
            setPivot(entry.view.pivot);
            setShownCharts(entry.view.shownCharts);
          }
          evidence({
            table: entry.table,
            source: entry.source,
            steps: entry.steps,
            charts: entry.view?.shownCharts ?? [],
            pivot: entry.view?.pivot ?? false,
            result: undefined,
            queries: undefined,
          });
        }}
      />
      <div className="row">
        <button className="btn secondary" type="button" onClick={report}>
          保存和下载分析报告
        </button>
      </div>
    </div>
  );
}
