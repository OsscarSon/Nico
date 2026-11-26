import { useState } from "react";
import { formulaTasks, gradeFormula, type FormulaTask } from "../../grading/e-route/formulaTasks";
import { DataTable, EGate, type P3Props } from "./presentation";

export function FormulaLab({ name, ...props }: P3Props & { name: FormulaTask }) {
  const task = formulaTasks[name];
  const [source, setSource] = useState(task.starter);
  const [sample, setSample] = useState(0);
  const [report, setReport] = useState<ReturnType<typeof gradeFormula> | null>(null);
  const view = task.scenarios[sample] ?? task.scenarios[0]!;
  const rows = Object.entries(view.sheet).map(([cell, value]) =>
    [cell, value === null ? "（空白）" : typeof value === "string" ? JSON.stringify(value) : String(value),
      value === null ? "空白" : typeof value === "number" ? "数值" : typeof value === "boolean" ? "布尔值" : "文本"]);
  return <div className="p3-lab">
    <label>示例数据<select aria-label="示例数据" value={sample} onChange={e => setSample(Number(e.target.value))}>
      {task.scenarios.map((scenario, index) => <option value={index} key={scenario.name}>{scenario.name}</option>)}
    </select></label>
    <DataTable headers={["单元格", "值", "类型"]} caption={view.name} rows={rows} />
    <form className="p3-lab" onSubmit={event => { event.preventDefault(); setReport(gradeFormula(name, source)); }}>
      <label>工作表公式<textarea aria-label="工作表公式" rows={2} maxLength={280} spellCheck={false} value={source}
        onChange={event => { setSource(event.target.value); setReport(null); }} /></label>
      <div className="row">
        <button className="btn" type="submit">计算所有样例</button>
        <button className="btn ghost" type="button" onClick={() => { setReport(null); setSource(task.starter); }}>恢复起始公式</button>
      </div>
    </form>
    {report && <ul className="p3-output" aria-label="公式验证结果">
      {report.flatMap(scenario => scenario.evaluations.map(({ formula, result, passed }, i) =>
        <li key={scenario.name + i}>{scenario.name} · {formula} → {result} · {passed ? "通过" : "需调整"}</li>))}
    </ul>}
    <EGate {...props} valid={Boolean(report?.every(scenario => scenario.evaluations.every(result => result.passed)))} />
  </div>;
}
