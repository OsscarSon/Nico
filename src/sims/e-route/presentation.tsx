import type { Report } from "../../grading/e-route/bench";
import { LabCheck, type P3Props } from "../p3aShared";
export type { P3Props } from "../p3aShared";
import "../../styles/e-route.css";

export function EGate({ mode, valid, onSolved }: P3Props & { valid: boolean }) {
  return mode === "challenge" && <LabCheck valid={valid} last onNext={() => onSolved?.()} />;
}

export function DataTable({ headers, rows, caption }: { headers: string[]; rows: (string | number)[][]; caption: string }) {
  return <table className="e-table">
    <caption>{caption}</caption>
    <thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
  </table>;
}

export function EFields({ fields, values, change }: {
  fields: { key: string; label: string; options?: [string, string][] }[];
  values: Record<string, string>; change: (key: string, value: string) => void;
}) {
  return <div className="e-fields">
    {fields.map(field => <label key={field.key}>{field.label}
      {field.options ? <select aria-label={field.label} value={values[field.key]} onChange={event => change(field.key, event.target.value)}>
        {field.options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
      </select> : <textarea aria-label={field.label} rows={5} maxLength={600} spellCheck={false}
        value={values[field.key]} onChange={event => change(field.key, event.target.value)} />}
    </label>)}
  </div>;
}

export function SeriesChart({ kind, points }: NonNullable<Report["chart"]>) {
  const baseline = 142;
  const span = 276 / Math.max(points.length, 1);
  const max = Math.max(1, ...points.map(point => point.value));
  const series = points.map((point, i) => ({
    ...point, x: 30 + span * (i + .5), y: baseline - 120 * point.value / max,
  }));
  return <figure className="e-chart">
    <figcaption>{kind === "bar" ? "从 0 开始的柱状金额图" : "按顺序连接的折线金额图"}</figcaption>
    <svg viewBox="0 0 320 168" role="img" aria-label={series.map(p => p.key + " " + p.value).join("；")}>
      <path d="M26 19V142H312" stroke="currentColor" fill="none" />
      <text x="11" y="145" fill="currentColor" fontSize="11">0</text>
      {kind === "line" && <polyline points={series.map(p => p.x + "," + p.y).join(" ")}
        stroke="var(--trace)" strokeWidth="3" fill="none" />}
      {series.map(({ x, y, key, value }) => <g key={key}>
        {kind === "bar"
          ? <rect x={x - span * .24} y={y} width={span * .48} height={baseline - y} fill="var(--trace)" />
          : <circle cx={x} cy={y} r="4" fill="#ffb020" />}
        <text x={x} y={Math.max(13, y - 7)} textAnchor="middle" fill="currentColor" fontSize="11">{value}</text>
        <text x={x} y="158" textAnchor="middle" fill="currentColor" fontSize="11">{key.slice(-5)}</text>
      </g>)}
    </svg>
  </figure>;
}

export function BenchReport({ report }: { report: Report }) {
  return <div className="p3-snapshot">
    <ul className="p3-output" aria-label="运行结果">
      {report.checks.map(check => <li key={check.label}>{check.label} · {check.observed} · {check.ok ? "通过" : "需调整"}</li>)}
    </ul>
    {report.chart && <SeriesChart {...report.chart} />}
    {report.table && <DataTable {...report.table} caption="数据预览" />}
    {report.code && <pre className="e-code">{report.code}</pre>}
  </div>;
}
