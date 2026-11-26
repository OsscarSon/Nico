import { useState } from "react";
import { abLabs } from "../grading/ab-courses";
import { evaluateLab, type LabId } from "../grading/ab-courses/model";
import { LabCheck, type P3Props } from "./p3aShared";
import "../styles/intermediate.css";

export function AbCourseLab({ id, mode, onSolved }: P3Props & { id: LabId }) {
  const lab = abLabs[id];
  const [values, setValues] = useState(() => lab.fields.map(() => 0));
  const [report, setReport] = useState<ReturnType<typeof evaluateLab>>();
  const challenge = mode === "challenge";

  function setField(index: number, value: number) {
    setValues(current => current.map((selected, i) => i === index ? value : selected));
    setReport(undefined);
  }

  function downloadReport() {
    if (!report?.passed) return;
    const data = { lesson: "b-i08", environment: "教学模拟", settings: lab.fields.map((field, i) => ({
      field: field.label, value: field.options[values[i]!],
    })), checks: report.checks };
    const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nico-b-i08-acceptance.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <div className="p3-lab">
    {challenge && <p>{lab.task}</p>}
    <div className="intermediate-fields">
      {lab.fields.map((field, i) => <label key={field.label}>
        {field.label}
        <select value={values[i]} onChange={event => setField(i, Number(event.target.value))}>
          {field.options.map((option, j) => <option key={option} value={j}>{option}</option>)}
        </select>
      </label>)}
    </div>
    <div className="row">
      <button className="btn" type="button" onClick={() => setReport(evaluateLab(lab, values))}>运行实验</button>
      <button className="btn ghost" type="button" onClick={() => {
        setValues(lab.fields.map(() => 0));
        setReport(undefined);
      }}>重置实验</button>
    </div>
    {report && <div className="p3-snapshot" aria-live="polite">
      <ul className="p3-output" aria-label="实验记录">
        {report.checks.map((row, i) => <li key={i}>
          <strong>{row.label}</strong>
          <div>{row.observed}</div>
          {challenge && <div className="muted">{row.observed === row.expected ? "符合要求" : "预期：" + row.expected}</div>}
        </li>)}
      </ul>
    </div>}
    {id === "fullstack" && challenge && report?.passed &&
      <button className="btn secondary" type="button" onClick={downloadReport}>导出验收 JSON</button>}
    {challenge && <LabCheck valid={report?.passed === true} last onNext={() => onSolved?.()} />}
  </div>;
}
