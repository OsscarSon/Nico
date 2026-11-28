import { useState } from "react";
import { Link } from "../../../app/router";
import { knowledgeLink } from "../../../content/academy2/knowledgeRegistry";
import {
  p4LabLink,
  type LabArea,
} from "../../../content/academy2/advanced/registry";
import {
  labs,
  runLab,
  type LabDefinition,
} from "../../../grading/academy2/advanced/labs";
import { XYChart } from "../data/Plots";
import { saveReport } from "../data/workspaces";
import {
  directionLabel,
  evaluateComparison,
  type Direction,
} from "../../../grading/academy2/advanced/labEvidence";
import "../data/data.css";
import "./advanced.css";

import type { LabRecord } from "../../../grading/academy2/advanced/projectEvidence";
export function Lab({
  active,
  onResult,
  topic,
}: {
  active: string;
  onResult?: (record: LabRecord) => void;
  topic?: string;
}) {
  const definition = labs[active];
  return definition ? (
    <Experiment
      key={active}
      id={active}
      definition={definition}
      onResult={onResult}
      topic={topic}
    />
  ) : (
    <p role="status">从实验目录选择一个可运行的场景。</p>
  );
}

function Experiment({
  id,
  definition,
  onResult,
  topic,
}: {
  id: string;
  definition: LabDefinition;
  onResult?: (record: LabRecord) => void;
  topic?: string;
}) {
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(
      definition.controls.map((control) => [control.key, control.initial]),
    ),
  );
  const [text, setText] = useState(definition.text?.initial ?? "");
  const [record, setRecord] = useState<LabRecord>();
  const [baseline, setBaseline] = useState<LabRecord>();
  const [prediction, setPrediction] = useState<Direction>("up");
  const [metric, setMetric] = useState("");
  const [comparison, setComparison] =
    useState<ReturnType<typeof evaluateComparison>>();
  const [reportStatus, setReportStatus] = useState("");
  const [error, setError] = useState("");
  const result = record?.result;
  return (
    <section className="a2-panel p3-card p3-lab">
      <h2>{definition.title}</h2>
      <p>
        <span className="pill">
          {definition.kind === "计算" ? "真实浏览器计算" : "教学模拟"}
        </span>{" "}
        {definition.objective}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          try {
            const record = { inputs, text, result: runLab(id, inputs, text) };
            setRecord(record);
            setComparison(
              baseline && metric
                ? evaluateComparison(baseline, record, metric, prediction)
                : undefined,
            );
            setReportStatus("");
            onResult?.(record);
          } catch (error) {
            setRecord(undefined);
            setComparison(undefined);
            setError(
              error instanceof Error ? error.message : "此组合无法执行。",
            );
          }
        }}
      >
        <div className="p3-fields">
          {definition.controls.map(({ key, label, min, max, step }) => (
            <label key={key}>
              {label} <output>{inputs[key]}</output>
              <input
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={inputs[key]}
                onChange={(event) => {
                  setInputs({ ...inputs, [key]: +event.target.value });
                  setRecord(undefined);
                }}
              />
            </label>
          ))}
        </div>
        {baseline && (
          <fieldset className="a2-panel">
            <legend>对照预测</legend>
            <p>
              对照已保留。改一个参数或一份输入，先写预测，再执行。每个指标以原始计算精度比较。
            </p>
            <div className="p3-fields">
              <label>
                要预测的指标
                <select
                  value={metric}
                  onChange={(event) => {
                    setMetric(event.target.value);
                    setComparison(undefined);
                  }}
                >
                  {baseline.result.metrics
                    .filter(([, value]) => typeof value === "number")
                    .map(([label]) => (
                      <option key={label}>{label}</option>
                    ))}
                </select>
              </label>
              <label>
                预计变化
                <select
                  value={prediction}
                  onChange={(event) => {
                    setPrediction(event.target.value as Direction);
                    setComparison(undefined);
                  }}
                >
                  {Object.entries(directionLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
        )}
        {definition.text && (
          <label>
            {definition.text.label}
            <textarea
              maxLength={16000}
              rows={4}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setRecord(undefined);
              }}
            />
          </label>
        )}
        <button type="submit" className="btn">
          执行实验
        </button>
      </form>
      {error && (
        <p className="feedback bad" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          {comparison && (
            <p
              role="status"
              className={
                "feedback " + (comparison.status === "correct" ? "ok" : "bad")
              }
            >
              {comparison.status === "invalid"
                ? comparison.message
                : `${comparison.status === "correct" ? "预测吻合" : "预测与结果不同"}。${metric}由 ${Number(comparison.before.toPrecision(7))} 变为 ${Number(comparison.after.toPrecision(7))}，${directionLabel[comparison.actual]}。`}
            </p>
          )}
          <dl className="p3-values" aria-live="polite">
            {result.metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {value === null
                    ? "未定义"
                    : typeof value === "number"
                      ? Number(value.toPrecision(7))
                      : value}
                </dd>
              </div>
            ))}
          </dl>
          {result.points && (
            <XYChart
              title={definition.title + " · 实际数据"}
              points={result.points}
              xLabel="输入或迭代步"
              yLabel="实验值"
              line={!result.points.some((p) => p.group !== undefined)}
            />
          )}
          <details>
            <summary>查看执行数据</summary>
            <pre tabIndex={0} className="p4-trace">
              {JSON.stringify(result.trace, null, 2)}
            </pre>
          </details>
          <div className="study-tools">
            {record &&
              result.metrics.some(([, value]) => typeof value === "number") && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setBaseline(record);
                    setMetric(
                      result.metrics.find(
                        ([, value]) => typeof value === "number",
                      )![0],
                    );
                    setComparison(undefined);
                  }}
                >
                  以本次为对照
                </button>
              )}
            {record && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  const details = {
                    scenario: id,
                    inputs,
                    text,
                    result: result.metrics,
                    comparison:
                      comparison && comparison.status !== "invalid"
                        ? { metric, prediction, ...comparison }
                        : undefined,
                  };
                  const markdown = [
                    "# " + definition.title,
                    definition.kind === "计算" ? "真实浏览器计算" : "教学模拟",
                    definition.objective,
                    "## 输入、计算结果与对照",
                    "```json",
                    JSON.stringify(details, null, 2),
                    "```",
                  ].join("\n\n");
                  const saved = saveReport(
                    "experiment",
                    topic ?? `lab:${definition.area}:${id}`,
                    definition.title,
                    markdown,
                  );
                  setReportStatus(
                    saved
                      ? "已下载并保存实验报告。"
                      : "已下载报告。浏览器存储暂不可用。",
                  );
                }}
              >
                保存并下载实验报告
              </button>
            )}
          </div>
          {reportStatus && <p role="status">{reportStatus}</p>}
        </>
      )}
    </section>
  );
}

export default function AdvancedLabList({
  area,
  active,
  from,
}: {
  area: LabArea;
  active?: string;
  from?: string;
}) {
  return (
    <>
      {from && <Link to={knowledgeLink(from)}>← 返回知识点</Link>}
      {active && labs[active]?.area === area && (
        <Lab active={active} topic={from} />
      )}
      <section className="a2-panel">
        <h2>进阶实验</h2>
        <ul className="a2-link-list">
          {Object.entries(labs)
            .filter(([, definition]) => definition.area === area)
            .map(([id, { title }]) => (
              <li key={id}>
                <Link
                  to={p4LabLink(area, id, from)}
                  aria-current={id === active ? "location" : undefined}
                >
                  {title} ↗
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}
