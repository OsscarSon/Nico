import { useState } from "react";
import { cLabs } from "../grading/c-route";
import { initialValues, type CLabKey, type LabReport, type Values } from "../grading/c-route/types";
import { LabCheck, type P3Props } from "./p3aShared";

export function CRouteLab({ labKey, mode, onSolved }: P3Props & { labKey: CLabKey }) {
  const lab = cLabs[labKey];
  const [values, setValues] = useState<Values>(() => initialValues(lab));
  const [report, setReport] = useState<LabReport | null>(null);
  const [exported, setExported] = useState(false);
  const [runNumber, setRunNumber] = useState(0);
  const change = (id: string, value: string) => {
    setValues(previous => ({ ...previous, [id]: value }));
    setReport(null);
    setExported(false);
  };

  function exportReport() {
    if (!report?.csv) return;
    const url = URL.createObjectURL(new Blob(["\uFEFF", report.csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nico-c18-evaluation.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  }

  return <div className="p3-lab" aria-label={lab.title}>
    <p>{lab.guide}</p>
    {mode === "challenge" && <p className="p3-task">{lab.goal}</p>}
    <form className="p3-lab" onSubmit={event => {
      event.preventDefault();
      setReport(lab.run(values));
      setExported(false);
      setRunNumber(number => number + 1);
    }}>
      {lab.controls.map(control => <label key={control.id}>
        {control.label}
        {control.options ? <select aria-label={control.label} name={control.id} value={values[control.id]} onChange={event => change(control.id, event.target.value)}>
          {control.options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select> : control.multiline
          ? <textarea aria-label={control.label} name={control.id} maxLength={300} rows={3} value={values[control.id]} onChange={event => change(control.id, event.target.value)} />
          : <input aria-label={control.label} name={control.id} maxLength={120} value={values[control.id]} onChange={event => change(control.id, event.target.value)} />}
      </label>)}
      <div className="row"><button type="submit" className="btn">运行实验</button>
        <button type="button" className="btn ghost" onClick={() => {
          setValues(initialValues(lab)); setReport(null); setExported(false); setRunNumber(number => number + 1);
        }}>重置</button>
      </div>
    </form>
    {report && <div className="p3-snapshot">
      <ul className="p3-output" aria-label="模拟结果">
        {report.rows.map((row, index) => <li key={index}>{row}</li>)}
      </ul>
      <p role="status">{report.evidence}</p>
      {report.csv && <button type="button" className="btn secondary" onClick={exportReport}>导出评估 CSV</button>}
      {exported && <p role="status">已请求下载评估表。</p>}
    </div>}
    {mode === "challenge" && <LabCheck key={runNumber} valid={Boolean(report?.passed && (!report.csv || exported))} last onNext={() => onSolved?.()} />}
  </div>;
}
