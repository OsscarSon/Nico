import { useState } from "react";
import { initialRover, playScenario, roverPassed, roverReplay, scenarios, stepRover, type RoverRun, type RoverRules, type Scenario, type Trials } from "../../grading/f-route/rover";
import { LabCheck, type P3Props } from "../p3aShared";

const defaults: RoverRules = { threshold: 0, side: "upper", failsafe: false };
const labels: Record<RoverRun["status"], string> = {
  running: "行进中", arrived: "已抵达", parked: "安全停车", blocked: "通道受阻", missed: "未到指定出口",
};
const list = Object.keys(scenarios) as Scenario[];
const reading = (distance: number | null) => distance === null ? "无读数" : distance === 60 ? "未检出前方障碍" : distance + " 单位";

export function RoverLab(props: P3Props) {
  const [run, setRun] = useState(() => initialRover("first"));
  const [rules, setRules] = useState(defaults);
  const [saved, setSaved] = useState<Trials>({});
  const [notice, setNotice] = useState(false);
  const complete = roverPassed(saved);

  function configure(next: RoverRules) {
    setRules(next); setRun(initialRover(run.scenario)); setSaved({}); setNotice(false);
  }
  function drive(wholeRun: boolean) {
    const next = wholeRun ? playScenario(run, rules) : stepRover(run, rules);
    setRun(next);
    if (next.status !== "running") setSaved(previous => ({ ...previous, [next.scenario]: next }));
  }
  function reset() {
    setRun(initialRover(run.scenario));
    setSaved(previous => { const next = { ...previous }; delete next[run.scenario]; return next; });
    setNotice(false);
  }
  function download() {
    const artifact = roverReplay(saved, rules);
    if (!artifact) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "nico-f08-rover-replay.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(true);
  }

  return <div className="p3-lab">
    <div className="f-fields">
      <label>场景<select aria-label="场景" value={run.scenario} onChange={event => setRun(initialRover(event.target.value as Scenario))}>
        {list.map(key => <option value={key} key={key}>{scenarios[key].label}</option>)}
      </select></label>
      <label>前方绕行门槛<select aria-label="前方绕行门槛" value={rules.threshold}
        onChange={event => configure({ ...rules, threshold: Number(event.target.value) })}>
        {[0, 10, 20, 30].map(n => <option key={n} value={n}>{n}</option>)}
      </select></label>
      <label>绕行去向<select aria-label="绕行去向" value={rules.side} onChange={event => configure({ ...rules, side: event.target.value === "lower" ? "lower" : "upper" })}>
        <option value="upper">上一条通道</option><option value="lower">下一条通道</option>
      </select></label>
      <label>失效响应<select aria-label="失效响应" value={String(rules.failsafe)} onChange={event => configure({ ...rules, failsafe: event.target.value === "true" })}>
        <option value="false">继续移动</option><option value="true">立即停车</option>
      </select></label>
    </div>
    <div className="f-map" role="img" aria-label={"小车在第 " + (run.y + 1) + " 条通道，横坐标 " + run.x + "。出口在第 3 条通道的 x=5。"}>
      {Array.from({ length: 18 }, (_, i) => {
        const x = i % 6, y = Math.floor(i / 6);
        const car = run.x === x && run.y === y;
        const wall = scenarios[run.scenario].walls.some(([cx, cy]) => cx === x && cy === y);
        return <span key={i} className={wall ? "wall" : undefined}>{car ? <strong>车</strong> : wall ? "障" : x === 5 && y === 2 ? "出口" : ""}</span>;
      })}
    </div>
    <p role="status">状态 {labels[run.status]} · 位置 ({run.x}, {run.y}) · {run.trace.at(-1)?.action ?? "等待读取"}</p>
    <div className="row">
      <button className="btn" type="button" disabled={run.status !== "running"} onClick={() => drive(false)}>推进一步</button>
      <button className="btn secondary" type="button" disabled={run.status !== "running"} onClick={() => drive(true)}>跑完本场景</button>
      <button className="btn ghost" type="button" onClick={reset}>重置本场景</button>
    </div>
    <ul className="p3-output" aria-label="场景验收">
      {list.map(key => <li key={key}>{scenarios[key].label} · {saved[key] ? labels[saved[key].status] : "未验收"}</li>)}
    </ul>
    {run.trace.length > 0 && <details className="p3-snapshot">
      <summary>查看每步读数和轨迹</summary>
      <ol className="p3-output" aria-label="小车轨迹">
        {run.trace.map((frame, i) => <li key={i}>{reading(frame.distance)} · {frame.action} · ({frame.x}, {frame.y})</li>)}
      </ol>
    </details>}
    {complete && <div className="row"><button className="btn secondary" type="button" onClick={download}>导出验收 JSON</button>
      {notice && <span role="status">已请求下载复盘。</span>}
    </div>}
    {props.mode === "challenge" && <LabCheck valid={Boolean(complete)} last onNext={() => props.onSolved?.()} />}
  </div>;
}
