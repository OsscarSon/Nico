import { useState } from "react";
import { benches, passed, type BenchKey, type BenchReport } from "../../grading/f-route/bench";
import { runSketch, sketchPassed, starter } from "../../grading/f-route/arduino";
import type { FSim } from "../../grading/f-route/ids";
import { LabCheck, type P3Props } from "../p3aShared";
import { RoverLab } from "./RoverLab";
import "../../styles/f-route.css";

function BenchLab({ kind, ...props }: P3Props & { kind: BenchKey }) {
  const bench = benches[kind];
  const initial = () => Object.fromEntries(bench.fields.map(field => [field.key, field.initial]));
  const [values, setValues] = useState(initial);
  const [report, setReport] = useState<BenchReport | null>(null);

  return <div className="p3-lab">
    <form className="p3-lab" onSubmit={event => { event.preventDefault(); setReport(bench.run(values)); }}>
      <div className="f-fields">
        {bench.fields.map(field => <label key={field.key}>{field.label}
          <select aria-label={field.label} value={values[field.key]} onChange={event => {
            setValues(previous => ({ ...previous, [field.key]: event.target.value })); setReport(null);
          }}>
            {field.options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
          </select>
        </label>)}
      </div>
      <div className="row">
        <button className="btn" type="submit">运行实验</button>
        <button className="btn ghost" type="button" onClick={() => { setValues(initial()); setReport(null); }}>重置实验</button>
      </div>
    </form>
    {report && <div className="p3-snapshot">
      <ul className="p3-output" aria-label="实验结果">
        {report.checks.map(check => <li key={check.label}>{check.label} · {check.text} · {check.ok ? "符合目标" : "需调整"}</li>)}
      </ul>
      {report.trace && report.trace.length > 0 && <ul className="p3-output" aria-label="过程记录">
        {report.trace.map((step, i) => <li key={i}>{step}</li>)}
      </ul>}
      {report.pulse && <div className="f-pwm" role="img" aria-label={"两周期信号：" + report.pulse.map(level => level ? "高" : "低").join("、")}>
        {report.pulse.map((level, index) => <span key={index} className={level ? "high" : undefined}>{level ? "高" : "低"}</span>)}
      </div>}
    </div>}
    {props.mode === "challenge" && <LabCheck valid={passed(report)} last onNext={() => props.onSolved?.()} />}
  </div>;
}

function ArduinoLab(props: P3Props) {
  const [source, setSource] = useState(starter);
  const [result, setResult] = useState<ReturnType<typeof runSketch> | null>(null);
  return <div className="p3-lab">
    <form className="p3-lab" onSubmit={event => { event.preventDefault(); setResult(runSketch(source)); }}>
      <label>Arduino 教学代码<textarea rows={9} maxLength={600} spellCheck={false} aria-label="Arduino 教学代码" value={source}
        onChange={event => { setSource(event.target.value); setResult(null); }} /></label>
      <div className="row">
        <button className="btn" type="submit">模拟运行两轮</button>
        <button className="btn ghost" type="button" onClick={() => { setSource(starter); setResult(null); }}>恢复起始代码</button>
      </div>
    </form>
    {result?.ok && <div className="p3-snapshot">
      <p role="status">一个周期 {result.period}ms，两轮共 {result.elapsed}ms。</p>
      <ul className="p3-output" aria-label="板载灯时间线">
        {result.spans.map(span => <li key={span.start}>{span.start}–{span.end}ms · {span.level === "HIGH" ? "亮" : "灭"} · 持续 {span.end - span.start}ms</li>)}
      </ul>
    </div>}
    {result && !result.ok && <p className="feedback bad" role="status">{result.reason}</p>}
    {props.mode === "challenge" && <LabCheck valid={sketchPassed(result)} last onNext={() => props.onSolved?.()} />}
  </div>;
}

const benchBySim: Record<Exclude<FSim, "hardware-arduino" | "hardware-rover">, BenchKey> = {
  "hardware-circuit": "series",
  "hardware-io": "io",
  "hardware-signals": "signals",
  "hardware-reading": "reading",
  "hardware-motors": "motors",
  "hardware-bus": "bus",
};

export function HardwareLab({ sim, ...props }: P3Props & { sim: FSim }) {
  if (sim === "hardware-arduino") return <ArduinoLab {...props} />;
  if (sim === "hardware-rover") return <RoverLab {...props} />;
  return <BenchLab kind={benchBySim[sim]} {...props} />;
}
