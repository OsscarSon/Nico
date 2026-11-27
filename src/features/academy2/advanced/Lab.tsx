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
import "../data/data.css";
import "./advanced.css";

import type { LabRecord } from "../../../grading/academy2/advanced/projectEvidence";
export function Lab({
  active,
  onResult,
}: {
  active: string;
  onResult?: (record: LabRecord) => void;
}) {
  const definition = labs[active];
  return definition ? (
    <Experiment
      key={active}
      id={active}
      definition={definition}
      onResult={onResult}
    />
  ) : (
    <p role="status">从实验目录选择一个可运行的场景。</p>
  );
}

function Experiment({
  id,
  definition,
  onResult,
}: {
  id: string;
  definition: LabDefinition;
  onResult?: (record: LabRecord) => void;
}) {
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(
      definition.controls.map((control) => [control.key, control.initial]),
    ),
  );
  const [text, setText] = useState(definition.text?.initial ?? "");
  const [record, setRecord] = useState<LabRecord>();
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
            onResult?.(record);
          } catch (error) {
            setRecord(undefined);
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
      {active && labs[active]?.area === area && <Lab active={active} />}
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
