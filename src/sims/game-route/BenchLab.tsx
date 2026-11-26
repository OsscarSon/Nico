import { useState } from "react";
import { benches, benchPassed, type BenchKey, type Report } from "../../grading/game-route/bench";
import { LabCheck, type P3Props } from "../p3aShared";
import "../../styles/game-route.css";

export function BenchLab({ name, mode, onSolved }: P3Props & { name: BenchKey }) {
  const bench = benches[name];
  const initial = () => Object.fromEntries(bench.fields.map(field => [field.key, field.initial]));
  const [values, setValues] = useState(initial);
  const [report, setReport] = useState<Report | null>(null);
  function change(key: string, value: string) {
    setValues(previous => ({ ...previous, [key]: value }));
    setReport(null);
  }

  return <div className="p3-lab">
    <form className="p3-lab" onSubmit={event => { event.preventDefault(); setReport(bench.run(values)); }}>
      <div className="game-bench-fields">
        {bench.fields.map(field => <label key={field.key}>{field.label}
          {field.options ? <select aria-label={field.label} value={values[field.key]} onChange={event => change(field.key, event.target.value)}>
            {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select> : <textarea spellCheck={false} aria-label={field.label} rows={3} maxLength={240} value={values[field.key]} onChange={event => change(field.key, event.target.value)} />}
        </label>)}
      </div>
      <div className="row">
        <button className="btn" type="submit">运行实验</button>
        <button className="btn ghost" type="button" onClick={() => { setValues(initial()); setReport(null); }}>重置实验</button>
      </div>
    </form>
    {report && <div className="p3-snapshot">
      {report.plot && <div className="game-bench-plot" role="img" aria-label={report.plot.items.map(i => `${i.label} x=${i.x} y=${i.y}`).join("；")}
        style={{ aspectRatio: report.plot.width / report.plot.height }}>
        {report.plot.items.map((i, index) => <span key={i.label} className={index === 0 ? "first-plot-item" : undefined}
          style={{ left: `${i.x / report.plot!.width * 100}%`, top: `${i.y / report.plot!.height * 100}%`,
            width: `${i.w / report.plot!.width * 100}%`, height: `${i.h / report.plot!.height * 100}%` }}>{i.label}</span>)}
      </div>}
      <ul className="p3-output" aria-label="实验结果">
        {report.checks.map(c => <li key={c.label}><strong>{c.label}</strong> · {c.result} · {c.ok ? "符合目标" : "需调整"}</li>)}
      </ul>
      {report.note && <p>{report.note}</p>}
    </div>}
    {mode === "challenge" && <LabCheck valid={benchPassed(report)} last onNext={() => onSolved?.()} />}
  </div>;
}
