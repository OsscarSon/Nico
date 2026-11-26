import { useState } from "react";
import { benches, cleaningFields, passed, rulesFrom, type BenchKey, type Report } from "../../grading/e-route/bench";
import { advanceFlow, flowPassed, initialFlow, initialNotebook, notebookPassed, runCell, type FlowAction, type NotebookAction } from "../../grading/e-route/automation";
import { prepareReport, rawRows, reportCsv, type PreparedReport } from "../../grading/e-route/data";
import { BenchReport, DataTable, EFields, EGate, SeriesChart, type P3Props } from "./presentation";

const defaults = (fields: { key: string; initial: string }[]) => Object.fromEntries(fields.map(field => [field.key, field.initial]));

export function EBench({ name, ...props }: P3Props & { name: BenchKey }) {
  const bench = benches[name];
  const [values, setValues] = useState(() => defaults(bench.fields));
  const [result, setResult] = useState<Report | null>(null);
  return <div className="p3-lab">
    {name === "cleaning" && <DataTable headers={["单号", "队名", "金额", "日期"]} caption="原始记录"
      rows={rawRows.map(r => [r.id, JSON.stringify(r.team), JSON.stringify(r.amount), r.day])} />}
    <form className="p3-lab" onSubmit={event => { event.preventDefault(); setResult(bench.run(values)); }}>
      <EFields fields={bench.fields} values={values} change={(key, value) => {
        setValues(previous => ({ ...previous, [key]: value })); setResult(null);
      }} />
      <div className="row">
        <button className="btn" type="submit">运行实验</button>
        <button className="btn ghost" type="button" onClick={() => { setValues(defaults(bench.fields)); setResult(null); }}>重置实验</button>
      </div>
    </form>
    {result && <BenchReport report={result} />}
    <EGate {...props} valid={passed(result)} />
  </div>;
}

const workflowActions: [FlowAction, string][] = [
  ["preview", "生成待审预览"], ["approve", "批准当前预览"], ["edit", "校正源数据"], ["deliver", "模拟交付"],
];
export function WorkflowLab(props: P3Props) {
  const [flow, setFlow] = useState(initialFlow);
  return <div className="p3-lab">
    <p>数据版本 {flow.revision} · 预览 {flow.preview ? "版本 " + flow.preview.revision + "，合计 " + flow.preview.amount : "无"} · {flow.approvedRevision === flow.revision ? "已批准" : "未批准"}</p>
    <p role="status">{flow.message}</p>
    <div className="row">{workflowActions.map(([action, label]) =>
      <button key={action} className="btn secondary" type="button" onClick={() => setFlow(previous => advanceFlow(previous, action))}>{label}</button>)}
      <button className="btn ghost" type="button" onClick={() => setFlow(initialFlow())}>重置记录</button>
    </div>
    <DataTable caption="本地交付记录" headers={["版本", "合计"]} rows={flow.receipts.map(r => [r.revision, r.amount])} />
    <EGate {...props} valid={flowPassed(flow)} />
  </div>;
}

const notebookActions: [NotebookAction, string][] = [
  ["load", "运行加载单元"], ["clean", "运行清洗单元"], ["summarize", "运行汇总单元"], ["restart", "重启运行时"],
];
export function NotebookLab(props: P3Props) {
  const [state, setState] = useState(() => initialNotebook());
  return <div className="p3-lab">
    <label>样例窗口<select aria-label="样例窗口" value={state.days} onChange={event => setState(initialNotebook(event.target.value === "later" ? "later" : "all"))}>
      <option value="all">全部日期</option><option value="later">11 月 4 日起</option>
    </select></label>
    <p>内存变量 · raw {state.hasInput ? "已加载" : "缺失"} · cleaned {state.clean ? state.clean.length + " 条" : "缺失"} · amount {state.sum ?? "未计算"}</p>
    <p role="status">{state.message}</p>
    <div className="row">{notebookActions.map(([action, label]) =>
      <button key={action} className="btn secondary" type="button" onClick={() => setState(previous => runCell(previous, action))}>{label}</button>)}
    </div>
    <EGate {...props} valid={notebookPassed(state)} />
  </div>;
}

export function CapstoneReport(props: P3Props) {
  const [values, setValues] = useState(() => defaults(cleaningFields));
  const [report, setReport] = useState<PreparedReport | null>(null);
  const [approved, setApproved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  function invalidate() { setApproved(false); setDownloaded(false); }
  function save() {
    if (!report?.passing || !approved) return;
    const url = URL.createObjectURL(new Blob(["\uFEFF", reportCsv(report)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nico-e16-activity-report.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }
  return <div className="p3-lab">
    <EFields fields={cleaningFields} values={values} change={(key, value) => {
      setValues(previous => ({ ...previous, [key]: value })); setReport(null); invalidate();
    }} />
    <div className="row">
      <button className="btn" type="button" onClick={() => { setReport(prepareReport(rulesFrom(values))); invalidate(); }}>生成报表草稿</button>
      <button className="btn secondary" type="button" disabled={!report?.passing || approved} onClick={() => setApproved(true)}>核对并批准报表</button>
      <button className="btn secondary" type="button" disabled={!approved} onClick={save}>导出 CSV</button>
    </div>
    {report && <div className="p3-snapshot">
      <p role="status">原始 {report.inputCount} 条，有效 {report.count} 条，拒绝 {report.rejected.length} 条，合计 {report.amount}。新增一条后的对照合计 {report.revised}。{report.passing ? "对账通过。" : "对账未通过。"}</p>
      <DataTable caption="按队名的报表" headers={["队名", "金额"]} rows={report.table.map(point => [point.key, point.value])} />
      <p>本地模板摘要 · 共 {report.count} 笔有效记录，总额 {report.amount}。{report.table.map(point => point.key + " " + point.value).join("、")}。</p>
      <SeriesChart kind="bar" points={report.table} />
      {report.rejected.length > 0 && <p>排除明细 · {report.rejected.map(r => r.id + " " + r.reason).join("、")}</p>}
      {approved && <p role="status">当前版本已批准。{downloaded && " 已请求下载 CSV。"}</p>}
    </div>}
    <EGate {...props} valid={approved && downloaded && Boolean(report?.passing)} />
  </div>;
}
