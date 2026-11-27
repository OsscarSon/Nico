import { useRef, useState } from "react";
import { z } from "zod";
import {
  irisTable,
  airTable,
  irisSource,
  airSource,
} from "../../../content/academy2/data/datasets";
import {
  initialOptions,
  modelNames,
  models,
  type Metrics,
  type Mode,
  type MLResult,
  type SplitOptions,
} from "../../../grading/academy2/data/ml";
import {
  parseCSV,
  parseJSON,
  maxImport,
  tableCSV,
  type Table,
} from "../../../grading/academy2/data/table";
import type { ModelKind } from "../../../grading/academy2/data/ml-models";
import { compareOnHoldout } from "../../../grading/academy2/data/projects";
import { runML } from "./mlClient";
import { XYChart } from "./Plots";
import Reasoning from "./Reasoning";
import { LabReturn, saveReport, saveWorkspace, Workspaces } from "./workspaces";
import { downloadText } from "../study/files";
import "./data.css";

type DatasetKind = "iris" | "air" | "local";
const numerical = (table: Table) =>
  table.columns.filter(
    (_, i) =>
      table.rows.some((row) => typeof row[i] === "number") &&
      table.rows.every((row) => row[i] === null || typeof row[i] === "number"),
  );
const settingsSchema = z.object({
  model: z.string(),
  mode: z.enum(["classification", "multiclass", "regression", "clustering"]),
  features: z.array(z.string()).max(8),
  target: z.string(),
  positive: z.string(),
  standard: z.boolean(),
  pca: z.boolean(),
  trainPercent: z.number(),
  validationPercent: z.number(),
  query: z.array(z.number()).max(8).optional(),
  threshold: z.number(),
  folds: z.number(),
  balance: z.boolean(),
  selfTrain: z.boolean(),
  leakDemo: z.boolean(),
  epochs: z.number(),
  rate: z.number(),
  lambda: z.number(),
  k: z.number(),
  depth: z.number(),
  seed: z.number(),
  epsilon: z.number(),
});
const storeSchema = z.object({
  version: z.literal(1),
  source: z.enum(["iris", "air", "local"]),
  input: z.string().max(maxImport),
  format: z.enum(["csv", "json"]),
  options: settingsSchema,
});
const scenarioModel: Record<string, ModelKind> = {
  linear: "linear",
  ridge: "ridge",
  logistic: "logistic",
  softmax: "softmax",
  knn: "knn",
  bayes: "bayes",
  tree: "tree",
  forest: "forest",
  svm: "svm",
  boosting: "boosting",
  kmeans: "kmeans",
  hierarchy: "hierarchy",
  dbscan: "dbscan",
  neural: "neural",
};
const relevantModes: Mode[] = [
  "classification",
  "multiclass",
  "regression",
  "clustering",
];
const modeLabels: Record<Mode, string> = {
  classification: "二元分类",
  multiclass: "多类别分类",
  regression: "连续回归",
  clustering: "无监督聚类",
};
const format = (value: number | null | undefined) =>
  value == null ? "—" : Number(value.toPrecision(5)).toString();
const pick = (mode: Mode, options: SplitOptions) => ({
  ...options,
  mode,
  model: models(mode)[0]!,
  balance: mode === "classification" && options.balance,
  selfTrain: mode === "classification" && options.selfTrain,
});
function settings(scenario: string) {
  const model = scenarioModel[scenario] ?? "logistic";
  const mode: Mode =
    model === "softmax"
      ? "multiclass"
      : model === "linear" || model === "ridge"
        ? "regression"
        : models("clustering").includes(model)
          ? "clustering"
          : "classification";
  return {
    ...initialOptions,
    model,
    mode,
    features:
      mode === "regression"
        ? ["petal_length", "petal_width"]
        : initialOptions.features,
    target: mode === "regression" ? "sepal_length" : "species",
    pca: scenario === "pca",
    selfTrain: scenario === "semi",
    folds: scenario === "cv" ? 4 : 0,
  };
}
export type MLEvidence = {
  source: DatasetKind;
  result?: MLResult;
  comparison?: MLResult;
  final?: MLResult;
};
function metricRows(m: Metrics) {
  if (m.kind === "multiclass")
    return [
      ["Accuracy", m.accuracy],
      ["Macro F1", m.macroF1],
      ["Micro F1", m.microF1],
      ["Weighted F1", m.weightedF1],
    ] as const;
  return m.kind === "classification"
    ? ([
        ["Accuracy", m.accuracy],
        ["Precision", m.precision],
        ["Recall", m.recall],
        ["F1", m.f1],
        ["ROC–AUC", m.auc],
      ] as const)
    : ([
        ["MAE", m.mae],
        ["MSE", m.mse],
        ["RMSE", m.rmse],
        ["R²", m.r2],
      ] as const);
}
function Measure({ title, result }: { title: string; result: Metrics }) {
  return (
    <div className="p3-measure">
      <h3>{title}</h3>
      <dl className="p3-values">
        {metricRows(result).map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{format(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
function summarize(result: MLResult) {
  const { options: h } = result;
  return [
    "# " + modelNames[result.model] + " · 训练报告",
    "数据内容指纹 " + result.fingerprint,
    result.evaluation === "final"
      ? "Final Evaluation · 最终评估"
      : "Development · 验证集调参",
    "任务=" +
      modeLabels[h.mode] +
      "，数据划分种子=" +
      h.seed +
      "，阈值=" +
      h.threshold +
      "。",
    "特征 " +
      h.features.join(", ") +
      "；目标字段 " +
      (h.mode !== "clustering" ? h.target : "无") +
      (h.mode === "classification" ? "；正类 " + h.positive : "") +
      "。",
    "训练 " +
      result.trainSize +
      " · 验证 " +
      result.validationSize +
      " · 测试 " +
      result.testSize +
      " · 拟合记录 " +
      result.fittedSize +
      "。",
    "实际耗时 " + result.elapsed.toFixed(3) + " ms。",
    h.leakDemo
      ? "泄漏对照预处理读取全表，指标不能作为正式测试报告。"
      : "监督模型只使用训练记录拟合预处理器。",
    result.details,
    "超参数 " + JSON.stringify(h),
    ...(result.validation
      ? [
          "## 验证",
          ...metricRows(result.validation).map(
            ([name, value]) => "- " + name + " " + format(value),
          ),
        ]
      : []),
    ...(result.test
      ? [
          "## 最终测试",
          ...metricRows(result.test).map(
            ([name, value]) => "- " + name + " " + format(value),
          ),
        ]
      : []),
    ...(result.cv.length
      ? ["## 训练集内部交叉验证", result.cv.map(format).join(", ")]
      : []),
  ].join("\n\n");
}
export default function MLPlayground({
  scenario = "logistic",
  topic,
  onEvidence,
  modelOnly = false,
}: {
  scenario?: string;
  topic?: string;
  onEvidence?: (value: MLEvidence) => void;
  modelOnly?: boolean;
}) {
  const [data, setData] = useState<Table>(irisTable),
    [source, setSource] = useState<DatasetKind>("iris");
  const [text, setText] = useState(""),
    [fileText, setFileText] = useState(""),
    [formatType, setFormatType] = useState<"csv" | "json">("csv");
  const [options, setOptions] = useState<SplitOptions>(() =>
      settings(scenario),
    ),
    [other, setOther] = useState<ModelKind>(
      scenario === "softmax" ? "knn" : "tree",
    );
  const [result, setResult] = useState<MLResult>(),
    [comparison, setComparison] = useState<MLResult>();
  const [finalResult, setFinalResult] = useState<MLResult>();
  const finalized = useRef(new Set<string>());
  const [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [leak, setLeak] = useState<MLResult>(),
    [showTest, setShowTest] = useState(false);
  const [contrast, setContrast] = useState<{
    title: string;
    value: MLResult;
  }>();
  const numeric = numerical(data);
  const possible =
    options.mode === "clustering"
      ? []
      : [
          ...new Set(
            data.rows
              .map((row) => row[data.columns.indexOf(options.target)])
              .filter((cell) => cell != null)
              .map(String),
          ),
        ];
  const reasoning = [
    "temperature",
    "retrieve",
    "rules",
    "astar",
    "minimax",
  ].includes(scenario);
  function clear(nextSource = source) {
    setError("");
    setNotice("");
    setResult(undefined);
    setFinalResult(undefined);
    setComparison(undefined);
    setLeak(undefined);
    setContrast(undefined);
    setShowTest(false);
    onEvidence?.({ source: nextSource });
  }
  function load(table: Table, origin: DatasetKind) {
    clear(origin);
    setSource(origin);
    setData(table);
    const numeric = numerical(table),
      categories = table.columns.filter((key) => !numeric.includes(key)),
      defaultMode =
        origin === "iris"
          ? "classification"
          : categories.length
            ? "classification"
            : "regression";
    const label =
      defaultMode === "classification"
        ? (categories[0] ?? table.columns.at(-1)!)
        : (numeric.at(-1) ?? "");
    const first = table.rows.find(
      (row) => row[table.columns.indexOf(label)] != null,
    )?.[table.columns.indexOf(label)];
    setOptions({
      ...initialOptions,
      mode: defaultMode,
      model: models(defaultMode)[0]!,
      target: label,
      positive: String(first ?? "1"),
      features: numeric.filter((key) => key !== label).slice(-2),
    });
    setOther(defaultMode === "classification" ? "tree" : "ridge");
  }
  function update<K extends keyof SplitOptions>(
    key: K,
    value: SplitOptions[K],
  ) {
    clear();
    setOptions((current) => ({ ...current, [key]: value }));
  }
  async function train(
    type: "fit" | "compare" | "leak" | "contrast" | "final",
  ) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const inputs: SplitOptions = {
        ...options,
        query: query.trim()
          ? query
              .trim()
              .split(/[，,\s]+/)
              .map(Number)
          : undefined,
      };
      if (type === "compare") {
        if (!result) throw Error("先训练基准模型。");
        const next = await runML(data, {
          ...result.options,
          model: other,
          query: undefined,
          leakDemo: false,
        });
        if (!compareOnHoldout(result, next))
          throw Error("数据或评估配置改变，无法比较。");
        setComparison(next);
        onEvidence?.({ source, result, comparison: next, final: finalResult });
      } else if (type === "final") {
        if (!result || finalized.current.has(result.fingerprint))
          throw Error(
            "此数据的本次实验已解锁留出测试。后续调参只能使用验证集。",
          );
        const next = await runML(data, result.options, "final");
        if (next.fingerprint !== result.fingerprint || !next.test)
          throw Error("数据改变或无法核验最终评估。");
        finalized.current.add(next.fingerprint);
        setFinalResult(next);
        setShowTest(true);
        onEvidence?.({ source, result, comparison, final: next });
      } else if (type === "leak") {
        if (!result) throw Error("先完成按训练集拟合的模型。");
        setLeak(await runML(data, { ...inputs, leakDemo: true }));
      } else if (type === "contrast") {
        if (!result) throw Error("先取得基准训练结果。");
        const h = result.options;
        let next: SplitOptions = { ...h, query: undefined };
        let title: string;
        if (["tree", "forest", "boosting"].includes(h.model)) {
          const depth = h.depth <= 2 ? 6 : 1;
          next = { ...next, depth };
          title = "同模型深度 " + depth;
        } else if (h.model === "knn") {
          const k = h.k === 1 ? 11 : 1;
          next = { ...next, k };
          title = "同模型邻居数 " + k;
        } else if (h.model === "bayes") {
          const standard = !h.standard;
          next = { ...next, standard };
          title = standard ? "高斯模型 · 标准化" : "高斯模型 · 使用原始尺度";
        } else {
          const lambda = h.lambda < 0.25 ? 0.6 : 0;
          next = {
            ...next,
            lambda,
            model: h.model === "linear" ? "ridge" : h.model,
          };
          title = "L2 系数 " + lambda;
        }
        setContrast({ title, value: await runML(data, next) });
      } else {
        setComparison(undefined);
        setLeak(undefined);
        setContrast(undefined);
        setResult(undefined);
        setFinalResult(undefined);
        setShowTest(false);
        onEvidence?.({ source });
        const next = await runML(data, inputs);
        setResult(next);
        onEvidence?.({ source, result: next });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法完成训练。");
    } finally {
      setBusy(false);
    }
  }
  const numberSetting = (
    key: keyof Pick<
      SplitOptions,
      | "seed"
      | "epochs"
      | "rate"
      | "lambda"
      | "threshold"
      | "k"
      | "depth"
      | "epsilon"
      | "trainPercent"
      | "validationPercent"
      | "folds"
    >,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        value={options[key]}
        min={min}
        max={max}
        step={step}
        onChange={(e) => update(key, Number(e.target.value))}
      />
    </label>
  );
  const booleanSetting = (
    key: keyof Pick<SplitOptions, "balance" | "standard" | "pca" | "selfTrain">,
    label: string,
  ) => (
    <label className="p3-check">
      <input
        type="checkbox"
        checked={options[key]}
        onChange={(e) => update(key, e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <div className="p3-lab">
      <LabReturn topic={topic} />
      {reasoning && !modelOnly && (
        <Reasoning key={scenario} initial={scenario} topic={topic} />
      )}
      <div className="p3-grid p3-ml-grid">
        <section className="a2-panel p3-card">
          <h2>训练配置</h2>
          <p>
            {source === "iris"
              ? "UCI Iris · 花卉测量"
              : source === "air"
                ? "纽约 Air Quality · 现场测量"
                : "本地数据"}{" "}
            · {data.rows.length} 行
            {source !== "local" && (
              <>
                {" "}
                ·{" "}
                <a
                  href={source === "iris" ? irisSource : airSource}
                  target="_blank"
                  rel="noreferrer"
                >
                  数据来源 ↗
                </a>
              </>
            )}
          </p>
          <fieldset disabled={busy}>
            <div className="row">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  load(irisTable, "iris");
                  setFileText("");
                }}
              >
                使用 Iris
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  load(airTable, "air");
                  setFileText("");
                }}
              >
                使用 Air Quality
              </button>
            </div>
            <details>
              <summary>选择自定义数据</summary>
              <label>
                数据格式
                <select
                  value={formatType}
                  onChange={(e) =>
                    setFormatType(e.target.value as typeof formatType)
                  }
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </label>
              <label>
                粘贴训练数据
                <textarea
                  rows={3}
                  maxLength={maxImport}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  try {
                    load(
                      formatType === "csv" ? parseCSV(text) : parseJSON(text),
                      "local",
                    );
                    setFileText(text);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "无法读取数据。");
                  }
                }}
              >
                导入训练数据
              </button>
              <label>
                选取 CSV 或 JSON 文件
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > maxImport * 4) throw Error("文件过大。");
                      const kind = file.name.toLowerCase().endsWith(".json")
                          ? "json"
                          : "csv",
                        input = await file.text();
                      load(
                        kind === "csv" ? parseCSV(input) : parseJSON(input),
                        "local",
                      );
                      setFormatType(kind);
                      setFileText(input);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "文件无法读取。",
                      );
                    }
                  }}
                />
              </label>
            </details>
            <div className="p3-fields">
              <label>
                机器学习任务
                <select
                  value={options.mode}
                  onChange={(e) => {
                    clear();
                    const mode = e.target.value as Mode;
                    setOptions((current) => {
                      const next = pick(mode, current),
                        target =
                          mode === "regression"
                            ? numeric.includes(next.target)
                              ? next.target
                              : (numeric.at(-1) ?? "")
                            : next.target;
                      return {
                        ...next,
                        target,
                        features: next.features.filter(
                          (name) => name !== target,
                        ),
                      };
                    });
                    setOther(
                      mode === "regression"
                        ? "ridge"
                        : mode === "classification"
                          ? "tree"
                          : mode === "multiclass"
                            ? "knn"
                            : "hierarchy",
                    );
                  }}
                >
                  {relevantModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {modeLabels[mode]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                训练模型
                <select
                  value={options.model}
                  onChange={(e) => update("model", e.target.value as ModelKind)}
                >
                  {models(options.mode).map((model) => (
                    <option key={model} value={model}>
                      {modelNames[model]}
                    </option>
                  ))}
                </select>
              </label>
              {options.mode !== "clustering" && (
                <label>
                  标签列
                  <select
                    value={options.target}
                    onChange={(e) => {
                      const target = e.target.value;
                      clear();
                      setOptions((current) => ({
                        ...current,
                        target,
                        features: current.features.filter(
                          (name) => name !== target,
                        ),
                        positive: String(
                          data.rows.find(
                            (row) => row[data.columns.indexOf(target)] != null,
                          )?.[data.columns.indexOf(target)] ?? "",
                        ),
                      }));
                    }}
                  >
                    {(options.mode === "regression"
                      ? numeric
                      : data.columns
                    ).map((key) => (
                      <option key={key}>{key}</option>
                    ))}
                  </select>
                </label>
              )}
              {options.mode === "classification" && (
                <label>
                  正类（其余标签并入负类）
                  <select
                    value={options.positive}
                    onChange={(e) => update("positive", e.target.value)}
                  >
                    {possible.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <fieldset className="p3-feature-list">
              <legend>输入特征</legend>
              {numeric
                .filter(
                  (key) =>
                    options.mode === "clustering" || key !== options.target,
                )
                .map((key) => (
                  <label className="p3-check" key={key}>
                    <input
                      type="checkbox"
                      checked={options.features.includes(key)}
                      onChange={(e) =>
                        update(
                          "features",
                          e.target.checked
                            ? [...options.features, key]
                            : options.features.filter((name) => name !== key),
                        )
                      }
                    />
                    {key}
                  </label>
                ))}
            </fieldset>
            <div className="p3-fields">
              {booleanSetting("standard", "标准化数值特征")}
              {booleanSetting("pca", "PCA 压缩为两个主成分")}
            </div>
            <details>
              <summary>切分与超参数</summary>
              <div className="p3-fields">
                {numberSetting("seed", "随机种子", 0, 2147483647)}
                {options.mode !== "clustering" && (
                  <>
                    {numberSetting("trainPercent", "训练比例 (%)", 40, 80)}
                    {numberSetting("validationPercent", "验证比例 (%)", 10, 30)}
                    {numberSetting(
                      "folds",
                      "训练集交叉验证折数（0 表示关闭）",
                      0,
                      8,
                    )}
                  </>
                )}
                {numberSetting("epochs", "迭代轮数 / 树数", 1, 500)}
                {numberSetting("rate", "学习率", 0.0001, 1, 0.01)}
                {numberSetting("lambda", "L2 正则系数", 0, 2, 0.01)}
                {numberSetting("k", "邻居 / 簇 / 隐藏层大小", 1, 32)}
                {numberSetting("depth", "树深上限", 1, 8)}
                {options.model === "dbscan" &&
                  numberSetting("epsilon", "DBSCAN 邻域半径", 0.01, 20, 0.05)}
                {options.mode === "classification" && (
                  <>
                    {numberSetting("threshold", "正类阈值", 0, 1, 0.01)}
                    {booleanSetting("balance", "仅对训练集重采样以均衡两类")}
                    {booleanSetting(
                      "selfTrain",
                      "遮盖部分训练标签，使用 90% 置信阈值自训练",
                    )}
                  </>
                )}
              </div>
            </details>
            {options.mode !== "clustering" && (
              <label>
                自定义预测，按特征勾选顺序用逗号分隔
                <input
                  value={query}
                  onChange={(e) => {
                    clear();
                    setQuery(e.target.value);
                  }}
                  maxLength={400}
                />
              </label>
            )}
          </fieldset>
          <button
            type="button"
            className="btn"
            disabled={busy || !options.features.length}
            onClick={() => void train("fit")}
          >
            训练与预测
          </button>
          {busy && <p role="status">正在 Worker 中计算…</p>}
          {error && (
            <p role="alert" className="feedback bad">
              {error}
            </p>
          )}
        </section>
        <section className="a2-panel p3-card">
          <h2>实验结果</h2>
          {!result && (
            <p>
              选择数据及特征，然后运行训练。验证集用于比较，完成选择后查看留出的测试集。
            </p>
          )}
          {result && (
            <>
              <p>
                {modelNames[result.model]} · 实测 {result.elapsed.toFixed(1)} ms
              </p>
              <p>{result.details}</p>
              <dl className="p3-values">
                <div>
                  <dt>训练</dt>
                  <dd>{result.trainSize}</dd>
                </div>
                <div>
                  <dt>验证</dt>
                  <dd>{result.validationSize}</dd>
                </div>
                <div>
                  <dt>测试</dt>
                  <dd>{result.testSize}</dd>
                </div>
                <div>
                  <dt>实际拟合</dt>
                  <dd>{result.fittedSize}</dd>
                </div>
                <div>
                  <dt>缺标签丢弃</dt>
                  <dd>{result.dropped}</dd>
                </div>
              </dl>
              {result.pseudo !== undefined && (
                <p>
                  本轮实际纳入 {result.pseudo}{" "}
                  个伪标签。验证与测试仍用原始标签。
                </p>
              )}
              {result.queryPrediction !== undefined && (
                <p role="status">
                  自定义输入预测{" "}
                  {result.classNames?.[result.queryPrediction] ??
                    format(result.queryPrediction)}
                </p>
              )}
              {result.queryProbabilities && (
                <p>
                  {result.queryProbabilities
                    .map((p, i) => result.classNames?.[i] + " " + format(p))
                    .join(" · ")}
                </p>
              )}
              {result.validation && (
                <Measure title="验证集指标" result={result.validation} />
              )}
              {result.cv.length > 0 && (
                <p>训练集内各折 {result.cv.map(format).join(" · ")}</p>
              )}
              {result.gap !== undefined && (
                <p>训练准确率减验证准确率 {format(result.gap)}</p>
              )}
              {result.variances && (
                <p>
                  PCA 主方向样本方差 {result.variances.map(format).join(" · ")}
                </p>
              )}
              {result.labels && (
                <p>
                  聚类标签计数{" "}
                  {[...new Set(result.labels)]
                    .sort((a, b) => a - b)
                    .map(
                      (n) =>
                        (n < 0 ? "噪声" : "簇 " + n) +
                        " " +
                        result.labels!.filter((v) => v === n).length,
                    )
                    .join(" · ")}
                </p>
              )}
              {result.losses.length > 0 && (
                <XYChart
                  title={
                    result.options.mode === "clustering"
                      ? "聚类迭代曲线"
                      : "训练 Loss 曲线"
                  }
                  points={result.losses.map((y, i) => ({ x: i + 1, y }))}
                  xLabel="轮次"
                  yLabel="训练目标"
                  line
                />
              )}
              {result.labels && (
                <XYChart
                  title="聚类与噪声分布"
                  points={result.points.map((row) => ({
                    ...row,
                    group: row.label,
                  }))}
                  xLabel={result.features[0]}
                  yLabel={result.features[1]}
                />
              )}
              {result.options.mode !== "clustering" && (
                <section aria-label="Final Evaluation · 最终评估">
                  <h3>Final Evaluation · 最终评估</h3>
                  <p>
                    先用验证集选模型和参数。确认本轮方案后，再运行留出评估。同一工作台会话内，每份数据只解锁一次。测试集已经查看时，继续调参属于探索。
                  </p>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={
                      busy ||
                      (!finalResult &&
                        finalized.current.has(result.fingerprint))
                    }
                    onClick={() =>
                      finalResult
                        ? setShowTest((value) => !value)
                        : void train("final")
                    }
                  >
                    {showTest ? "收起测试集结果" : "显示留出测试集"}
                  </button>
                </section>
              )}
              {showTest && finalResult?.test && (
                <>
                  <Measure title="测试集指标" result={finalResult.test} />
                  {finalResult.test.kind === "classification" && (
                    <>
                      <table className="p3-confusion" aria-label="混淆矩阵">
                        <caption>混淆矩阵（行是真实标签）</caption>
                        <thead>
                          <tr>
                            <th scope="col">实际 / 预测</th>
                            <th scope="col">负</th>
                            <th scope="col">正</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th scope="row">负</th>
                            <td>{finalResult.test.tn}</td>
                            <td>{finalResult.test.fp}</td>
                          </tr>
                          <tr>
                            <th scope="row">正</th>
                            <td>{finalResult.test.fn}</td>
                            <td>{finalResult.test.tp}</td>
                          </tr>
                        </tbody>
                      </table>
                      {!!finalResult.test.roc.length && (
                        <XYChart
                          title="ROC 曲线"
                          points={finalResult.test.roc.map(([x, y]) => ({
                            x,
                            y,
                          }))}
                          xLabel="FPR"
                          yLabel="TPR"
                          line
                        />
                      )}
                      {!!finalResult.boundary && (
                        <XYChart
                          title="模型决策边界与测试观测"
                          points={finalResult.points.map((row) => ({
                            ...row,
                            group: row.label,
                          }))}
                          boundary={finalResult.boundary}
                          xLabel={result.features[0]}
                          yLabel={result.features[1]}
                          caption="背景按预测阈值着色；点的颜色为实际标签（蓝负、橙正）。其余特征固定于拟合中位数。"
                        />
                      )}
                    </>
                  )}
                  {finalResult.test.kind === "multiclass" && (
                    <div
                      className="p3-table-scroll"
                      tabIndex={0}
                      role="region"
                      aria-label="多类别混淆矩阵，可横向滚动"
                    >
                      <table aria-label="多类别混淆矩阵">
                        <caption>
                          混淆矩阵。行是真实类别，列是预测类别。
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">实际 / 预测</th>
                            {finalResult.test.perClass.map(({ label }) => (
                              <th scope="col" key={label}>
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {finalResult.test.matrix.map((row, i) => (
                            <tr key={i}>
                              <th scope="row">{finalResult.classNames?.[i]}</th>
                              {row.map((count, j) => (
                                <td key={j}>{count}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {finalResult.test.kind === "regression" && (
                    <XYChart
                      title="实际值与模型预测"
                      xLabel="实际"
                      yLabel="预测"
                      points={(finalResult.values ?? [])
                        .filter((row) => row.subset === "test")
                        .map((row) => ({ x: row.label, y: row.prediction }))}
                    />
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>
      {result && options.mode !== "clustering" && (
        <section className="a2-panel p3-card">
          <h2>同一切分比较模型</h2>
          <div className="p3-fields">
            <label>
              对比模型
              <select
                value={
                  models(options.mode).includes(other)
                    ? other
                    : (models(options.mode)[1] ?? modelNames[options.model])
                }
                onChange={(e) => setOther(e.target.value as ModelKind)}
              >
                {models(options.mode).map((model) => (
                  <option key={model} value={model}>
                    {modelNames[model]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn secondary"
              type="button"
              disabled={busy || other === result.model}
              onClick={() => void train("compare")}
            >
              训练对比模型
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={() => void train("leak")}
            >
              运行预处理泄漏对照
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={() => void train("contrast")}
            >
              运行模型复杂度对照
            </button>
          </div>
          {comparison?.validation && (
            <Measure
              title={modelNames[comparison.model] + " · 同一验证集"}
              result={comparison.validation}
            />
          )}
          {contrast?.value.validation && (
            <>
              <Measure
                title={contrast.title + " · 同一验证集"}
                result={contrast.value.validation}
              />
              {contrast.value.gap !== undefined && (
                <p>对照组训练与验证准确率差 {format(contrast.value.gap)}。</p>
              )}
            </>
          )}
          {leak?.validation && (
            <>
              <Measure
                title="全表拟合预处理 · 泄漏对照"
                result={leak.validation}
              />
              <p>
                预处理已读到验证和测试集的统计量。准确率未必提高，但实验已破坏留出假设。
              </p>
            </>
          )}
        </section>
      )}
      <Workspaces
        kind="ml"
        save={(title) =>
          saveWorkspace("ml", title, {
            version: 1,
            source,
            input: fileText,
            format: formatType,
            options: {
              ...options,
              query: query.trim()
                ? query
                    .trim()
                    .split(/[，,\s]+/)
                    .map(Number)
                : undefined,
            },
          })
        }
        restore={(raw) => {
          const saved = storeSchema.parse(raw),
            h = saved.options as SplitOptions;
          if (!models(h.mode).includes(h.model))
            throw Error("恢复文件包含未知模型。");
          const table =
            saved.source === "iris"
              ? irisTable
              : saved.source === "air"
                ? airTable
                : saved.format === "csv"
                  ? parseCSV(saved.input)
                  : parseJSON(saved.input);
          load(table, saved.source);
          setFileText(saved.input);
          setText(saved.input);
          setFormatType(saved.format);
          setOptions(h);
          setQuery(h.query?.join(",") ?? "");
        }}
      />
      {result && (
        <div className="row">
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              const text =
                summarize(result) +
                (comparison ? "\n\n" + summarize(comparison) : "") +
                (finalResult ? "\n\n" + summarize(finalResult) : "");
              setNotice(
                saveReport(
                  "experiment",
                  topic ?? "ml",
                  modelNames[result.model] + " · 训练记录",
                  text,
                )
                  ? "报告已保存并下载。"
                  : "已下载报告。浏览器存储不可用。",
              );
            }}
          >
            保存和下载训练报告
          </button>
          {!!result.values?.length && (
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                downloadText(
                  "nico-predictions.csv",
                  tableCSV({
                    columns: ["subset", "row", "label", "prediction"],
                    rows: (finalResult?.values ?? result.values!).map((row) => [
                      row.subset,
                      row.row,
                      row.label,
                      row.prediction,
                    ]),
                  }),
                  "text/csv;charset=utf-8",
                )
              }
            >
              导出真实预测 CSV
            </button>
          )}
          {notice && <p role="status">{notice}</p>}
        </div>
      )}
      {!reasoning && !modelOnly && <Reasoning topic={topic} />}
    </div>
  );
}
