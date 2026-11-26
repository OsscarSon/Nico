import { useState } from "react";
import {
  advanceFrame, board, framePassed, initialFrame, initialKeys, initialMotion, keysPassed,
  markersPassed, motionPassed, placeMarker, recordTrial, setGameKey, stepKeys, stepMotion, trialMatches,
  type Direction, type GameKey, type Markers, type Point, type Space, type TimeStep, type Trials,
} from "../grading/gameBasics";
import { LabCheck, type P3Props } from "./p3aShared";
import "../styles/game-basics.css";

type PlotPoint = Point & { label: string; tone?: "target" };
const pair = ({ x, y }: Point) => `(${x}, ${y})`;
const defaultExtent = { minX: 0, minY: 0, maxX: board.columns - 1, maxY: board.rows - 1 };
const motionExtent = { minX: -4, minY: -4, maxX: 4, maxY: 4 };

function Playfield({ points, extent = defaultExtent }: { points: PlotPoint[]; extent?: typeof defaultExtent }) {
  const columns = extent.maxX - extent.minX + 1;
  const rows = extent.maxY - extent.minY + 1;
  const cells = new Map<string, PlotPoint>();
  for (const point of points) {
    const key = pair(point);
    const existing = cells.get(key);
    cells.set(key, existing ? { ...point, label: `${existing.label}／${point.label}` } : point);
  }
  return <div className="game-plot" role="img" aria-label={points.map(point => `${point.label} ${pair(point)}`).join("；")}
    style={{ aspectRatio: columns / rows, backgroundSize: `${100 / columns}% ${100 / rows}%` }}>
    {[...cells].map(([key, { label, tone, x, y }]) => {
      const left = 100 * (x - extent.minX + .5) / columns;
      const top = 100 * (y - extent.minY + .5) / rows;
      const align = left > 80 ? "end" : left < 20 ? "start" : "center";
      return <span className={tone === "target" ? "game-point target" : "game-point"} key={key}
        style={{ left: `${left}%`, top: `${top}%` }}>
        <span className="game-point-label" data-align={align} data-below={top < 20}>{label}</span>
      </span>;
    })}
  </div>;
}

function StepsCheck({ mode, onSolved, valid }: P3Props & { valid: boolean }) {
  return mode === "challenge" && <LabCheck valid={valid} last onNext={() => onSolved?.()} />;
}

export function GameLoopLab(props: P3Props) {
  const [frame, setFrame] = useState(initialFrame);
  const [direction, setDirection] = useState<Direction>(0);
  return <div className="p3-lab">
    {props.mode === "challenge" && <p className="p3-task">操作两帧，让画面先显示 x=2、下一帧显示 x=3。观察每次更新后，尚未绘制时画面的位置。</p>}
    <Playfield points={[{ x: frame.drawn, y: 1, label: "画面" }]} />
    <p role="status">世界 x={frame.world} · 画面 x={frame.drawn} · 最近绘制位置 {frame.history.join(" → ") || "暂无"}</p>
    <label>本帧待采样的输入
      <select aria-label="本帧待采样的输入" value={direction} onChange={event => setDirection(Number(event.target.value) as Direction)}>
        <option value={0}>原地</option><option value={1}>向右</option><option value={-1}>向左</option>
      </select>
    </label>
    <div className="row">
      <button type="button" className="btn secondary" disabled={frame.phase !== "sample"} onClick={() => setFrame(f => advanceFrame(f, { type: "sample", direction }))}>读取输入</button>
      <button type="button" className="btn secondary" disabled={frame.phase !== "update"} onClick={() => setFrame(f => advanceFrame(f, { type: "update" }))}>更新世界</button>
      <button type="button" className="btn" disabled={frame.phase !== "draw"} onClick={() => setFrame(f => advanceFrame(f, { type: "draw" }))}>绘制画面</button>
      <button type="button" className="btn ghost" onClick={() => { setFrame(initialFrame()); setDirection(0); }}>重置实验</button>
    </div>
    <StepsCheck {...props} valid={framePassed(frame)} />
  </div>;
}

function NumberSelect({ label, options, value, onChange }: { label: string; options: number[]; value: number; onChange: (value: number) => void }) {
  return <label>{label}<select aria-label={label} value={value} onChange={event => onChange(Number(event.target.value))}>
    {options.map(n => <option key={n} value={n}>{n}</option>)}
  </select></label>;
}

const xValues = [-3, -2, -1, 0, 1, 2, 3, 4, 5];
const yValues = [-2, -1, 0, 1, 2, 3];
export function GameCoordinateLab(props: P3Props) {
  const [values, setValues] = useState<Point>({ x: 0, y: 0 });
  const [space, setSpace] = useState<Space>("world");
  const [slot, setSlot] = useState<keyof Markers>("supply");
  const [markers, setMarkers] = useState<Markers>({});
  const [message, setMessage] = useState("");
  const points: PlotPoint[] = [{ x: 0, y: 0, label: "原点" }, { ...board.origin, label: "平台" }];
  if (markers.supply) points.push({ ...markers.supply.world, label: "补给", tone: "target" });
  if (markers.dock) points.push({ ...markers.dock.world, label: "停靠", tone: "target" });
  return <div className="p3-lab">
    {props.mode === "challenge" && <p className="p3-task">补给使用场景坐标 (4, 2)。停靠使用距平台向左 1、向下 2 的局部坐标。让两个标记同时落在指定位置。</p>}
    <Playfield points={points} />
    <p>场景范围 X=0 至 5，Y=0 至 3。平台在 {pair(board.origin)}。</p>
    <div className="game-fields">
      <label>标记<select aria-label="标记" value={slot} onChange={event => setSlot(event.target.value as keyof Markers)}><option value="supply">补给</option><option value="dock">停靠</option></select></label>
      <label>坐标系<select aria-label="坐标系" value={space} onChange={event => setSpace(event.target.value as Space)}><option value="world">场景</option><option value="local">相对平台</option></select></label>
      <NumberSelect label="X 坐标" options={xValues} value={values.x} onChange={x => setValues(p => ({ ...p, x }))} />
      <NumberSelect label="Y 坐标" options={yValues} value={values.y} onChange={y => setValues(p => ({ ...p, y }))} />
    </div>
    <div className="row">
      <button type="button" className="btn" onClick={() => {
        const marker = placeMarker(values, space);
        setMessage(marker ? `标记落在场景 ${pair(marker.world)}。` : "换算后在场地外。已有标记保持原位。");
        if (marker) setMarkers(old => ({ ...old, [slot]: marker }));
      }}>落下标记</button>
      <button type="button" className="btn ghost" onClick={() => { setMarkers({}); setMessage(""); }}>清空标记</button>
    </div>
    <p role="status">{message || "请选择坐标，再落下标记。"}</p>
    <StepsCheck {...props} valid={markersPassed(markers)} />
  </div>;
}

const velocities = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
export function GameMotionLab(props: P3Props) {
  const [velocity, setVelocity] = useState<Point>({ x: 0, y: 0 });
  const [elapsed, setElapsed] = useState<TimeStep>(500);
  const [motion, setMotion] = useState(initialMotion);
  const [trials, setTrials] = useState<Trials>({});
  return <div className="p3-lab">
    {props.mode === "challenge" && <p className="p3-task">以恒定速度每秒向右 4 格、向下 2 格运行 1 秒。分别采用 2 个 500ms 步长和 4 个 250ms 步长，保存两组试验。</p>}
    <Playfield points={[{ ...motion.position, label: "角色" }, { x: 4, y: 2, label: "目标", tone: "target" }]} extent={motionExtent} />
    <p role="status">位置 {pair(motion.position)} · 已过 {motion.total}ms · {motion.frames.length} 次更新</p>
    <div className="game-fields">
      <NumberSelect label="横向速度（格／秒）" options={velocities} value={velocity.x} onChange={x => setVelocity(p => ({ ...p, x }))} />
      <NumberSelect label="纵向速度（格／秒）" options={velocities} value={velocity.y} onChange={y => setVelocity(p => ({ ...p, y }))} />
      <NumberSelect label="步长（ms）" options={[250, 500, 1000]} value={elapsed} onChange={value => setElapsed(value as TimeStep)} />
    </div>
    <div className="row">
      <button type="button" className="btn" disabled={motion.total + elapsed > 1000} onClick={() => setMotion(m => stepMotion(m, velocity, elapsed))}>推进一步</button>
      <button type="button" className="btn secondary" disabled={motion.total !== 1000 || ![2, 4].includes(motion.frames.length)} onClick={() => setTrials(t => recordTrial(t, motion))}>保存本次试验</button>
      <button type="button" className="btn ghost" onClick={() => setMotion(initialMotion())}>回到起点</button>
    </div>
    <ul className="p3-output" aria-label="试验记录">
      {([2, 4] as const).map(size => {
        const trial = trials[size];
        return <li key={size}>{size} 步：{trial ? `${pair(trial.position)} · ${trialMatches(trial, size) ? "符合目标" : "请核对速度和步长"}` : "未保存"}</li>;
      })}
    </ul>
    <StepsCheck {...props} valid={motionPassed(trials)} />
  </div>;
}

const controls: { key: GameKey; name: string }[] = [
  { key: "ArrowLeft", name: "左方向键" }, { key: "ArrowRight", name: "右方向键" }, { key: "Space", name: "空格键" },
];
const fromKey = (key: string): GameKey | undefined => key === " " ? "Space" : key === "ArrowLeft" || key === "ArrowRight" ? key : undefined;

export function GameInputLab(props: P3Props) {
  const [state, setState] = useState(initialKeys);
  return <div className="p3-lab">
    {props.mode === "challenge" && <p className="p3-task">让角色停在 x=3，发出恰好两次信号。至少保持空格键跨两帧，观察只在按下时新增信号，结束时松开空格键。</p>}
    <Playfield points={[{ x: state.x, y: 1, label: "角色" }]} />
    <p role="status">位置 x={state.x} · 信号 {state.signals} 次 · 第 {state.ticks} 帧{state.lastSignal ? " · 本帧发出信号" : ""}</p>
    <button type="button" className="btn ghost game-keyboard" aria-describedby="game-keyboard-hint"
      onKeyDown={event => {
        const key = fromKey(event.key);
        if (key) { event.preventDefault(); setState(old => setGameKey(old, key, true)); }
        if (event.key === "Enter") { event.preventDefault(); if (!event.repeat) setState(stepKeys); }
      }}
      onKeyUp={event => {
        const key = fromKey(event.key);
        if (key) { event.preventDefault(); setState(old => setGameKey(old, key, false)); }
      }}
      onBlur={() => setState(s => controls.reduce((next, { key }) => setGameKey(next, key, false), s))}>键盘控制区</button>
    <p id="game-keyboard-hint">聚焦键盘控制区后，可以按方向键或空格，并在按住时按回车推进一帧。也可用下方按钮切换按住状态。</p>
    <div className="row">
      {controls.map(({ key, name }) => <button type="button" className="btn secondary" aria-pressed={state.pressed[key]} key={key}
        onClick={() => setState(s => setGameKey(s, key, !s.pressed[key]))}>{state.pressed[key] ? "松开" : "按下"}{name}</button>)}
    </div>
    <div className="row">
      <button type="button" className="btn" onClick={() => setState(stepKeys)}>更新一帧</button>
      <button type="button" className="btn ghost" onClick={() => setState(initialKeys())}>重置实验</button>
    </div>
    <StepsCheck {...props} valid={keysPassed(state)} />
  </div>;
}
