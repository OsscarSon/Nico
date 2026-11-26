import { useState } from "react";
import {
  collectFeedback, deliveryPassed, exportDelivery, fallPassed, feedbackPassed, initialDelivery,
  initialFall, initialFeedback, initialRound, level, moveDelivery, roundPassed, stepFall, transition,
  type GamePhase, type Gravity, type Level, type Move, type Token, type Transition,
} from "../../grading/game-route/states";
import { LabCheck, type P3Props } from "../p3aShared";
import "../../styles/game-route.css";

function Challenge({ mode, valid, onSolved }: P3Props & { valid: boolean }) {
  return mode === "challenge" && <LabCheck valid={valid} last onNext={() => onSolved?.()} />;
}

export function FallLab(props: P3Props) {
  const [fall, setFall] = useState(initialFall);
  const [gravity, setGravity] = useState<Gravity>(0);
  return <div className="p3-lab">
    <label>重力加速度（单位／秒²）
      <select aria-label="重力加速度（单位／秒²）" value={gravity} disabled={fall.heights.length > 0} onChange={e => setGravity(Number(e.target.value) as Gravity)}>
        {[0, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
    <div className="game-fall" aria-hidden="true"><span style={{ bottom: `${4 + fall.y / 2 * 82}%` }} /></div>
    <p role="status">高度 {fall.y} · 竖直速度 {fall.vy} · {fall.landed ? "已落地" : "空中"}</p>
    <p>最近高度记录（每步 0.25 秒） {fall.heights.join(" → ") || "暂无"}</p>
    <div className="row">
      <button className="btn" type="button" disabled={fall.landed} onClick={() => setFall(s => stepFall(s, gravity))}>推进重力一步</button>
      <button className="btn ghost" type="button" onClick={() => setFall(initialFall())}>回到起点</button>
    </div>
    <Challenge {...props} valid={fallPassed(fall)} />
  </div>;
}

const roundActions: [Transition, string][] = [["start", "开始巡检"], ["move", "移动并捡电池"], ["pause", "暂停"], ["resume", "继续巡检"], ["dock", "停靠"]];
const phaseLabel: Record<GamePhase, string> = { idle: "等待", running: "巡检中", paused: "已暂停", finished: "已结束" };
export function RoundLab(props: P3Props) {
  const [round, setRound] = useState(initialRound);
  return <div className="p3-lab">
    <p role="status">状态 {phaseLabel[round.phase]} · 电量 {round.energy}/2 · {round.message}</p>
    <div className="row">
      {roundActions.map(([action, label]) => <button className="btn secondary" type="button" key={action} onClick={() => setRound(r => transition(r, action))}>{label}</button>)}
      <button className="btn ghost" type="button" onClick={() => setRound(initialRound())}>重开一轮</button>
    </div>
    <Challenge {...props} valid={roundPassed(round)} />
  </div>;
}

async function playTone() {
  const audio = new AudioContext();
  try {
    await audio.resume();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.frequency.value = 520;
    volume.gain.value = .06;
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.onended = () => { void audio.close().catch(() => {}); };
    oscillator.start();
    oscillator.stop(audio.currentTime + .12);
  } catch (error) {
    await audio.close().catch(() => {});
    throw error;
  }
}

export function FeedbackLab(props: P3Props) {
  const [state, setState] = useState(initialFeedback);
  const [settings, setSettings] = useState({ visual: true, sound: false, muted: false });
  const [audioIssue, setAudioIssue] = useState(false);
  function collect(token: Token) {
    const next = collectFeedback(state, token, settings);
    setState(next);
    if (next.receipts.length > state.receipts.length && next.receipts.at(-1)?.sound) {
      void playTone().catch(() => setAudioIssue(true));
    }
  }
  return <div className="p3-lab">
    <div className="row">
      <label className="game-toggle"><input type="checkbox" checked={settings.visual} onChange={e => setSettings(s => ({ ...s, visual: e.target.checked }))} />视觉提示</label>
      <label className="game-toggle"><input type="checkbox" checked={settings.sound} onChange={e => setSettings(s => ({ ...s, sound: e.target.checked }))} />启用提示音</label>
      <label className="game-toggle"><input type="checkbox" checked={settings.muted} onChange={e => setSettings(s => ({ ...s, muted: e.target.checked }))} />静音</label>
    </div>
    <div className="row">
      <button className="btn secondary" type="button" onClick={() => collect("A")}>收集电池 A</button>
      <button className="btn secondary" type="button" onClick={() => collect("B")}>收集电池 B</button>
      <button className="btn ghost" type="button" onClick={() => { setState(initialFeedback()); setAudioIssue(false); }}>清空记录</button>
    </div>
    <p role="status">{state.message}</p>
    {state.announcement && <p className="feedback ok">已收到电池 {state.announcement}。</p>}
    <ul className="p3-output" aria-label="反馈记录">
      {state.receipts.map(r => <li key={r.token}>{r.token} · {r.visual ? "收集确认" : "视觉提示关"} · {r.sound ? "提示音已请求" : "未请求提示音"}</li>)}
    </ul>
    {audioIssue && <p>浏览器未能播放声音。收集状态与文字记录仍生效。</p>}
    <Challenge {...props} valid={feedbackPassed(state)} />
  </div>;
}

const moves: [Move, string][] = [["left", "向左一步"], ["right", "向右一步"], ["jump-left", "向左起跳"], ["jump-right", "向右起跳"], ["land", "推进落地帧"]];
export function DeliveryLab(props: P3Props) {
  const [state, setState] = useState(() => initialDelivery("gap"));
  const [download, setDownload] = useState(false);
  const reset = (layout: Level) => { setState(initialDelivery(layout)); setDownload(false); };
  function saveReplay() {
    const data = exportDelivery(state);
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nico-d16-delivery.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownload(true);
  }
  return <div className="p3-lab">
    {props.mode === "free" && <label>场地<select aria-label="场地" value={state.layout} onChange={e => reset(e.target.value === "bridge" ? "bridge" : "gap")}>
      <option value="gap">有缺口</option><option value="bridge">桥面完整</option>
    </select></label>}
    <div className="game-delivery" role="img" aria-label={`角色 x=${state.x}，${state.flight ? "空中" : "地面"}，电池在 1、5，出口在 7`}>
      {Array.from({ length: level.columns * 3 }, (_, i) => {
        const x = i % level.columns;
        const row = Math.floor(i / level.columns);
        const solid = row === 2 && (x !== level.pit || state.layout === "bridge");
        const player = x === state.x && row === (state.flight ? 0 : state.phase === "failed" ? 2 : 1);
        const marker = row === 1 && level.batteries.includes(x) && !state.collected.includes(x) ? "电" : row === 1 && x === level.exit ? "站" : "";
        return <span key={i} className={solid ? "game-ground" : undefined}>{player ? <strong>机</strong> : marker}</span>;
      })}
    </div>
    <p>电池在 x=1、5，停靠站在 x=7。{state.layout === "gap" && "x=3 是缺口。"}</p>
    <p role="status">位置 x={state.x} · 电池 {state.collected.length}/2 · {state.message}</p>
    <div className="row">
      {moves.map(([move, title]) => <button key={move} className="btn secondary" type="button"
        disabled={state.phase !== "playing" || (move === "land") !== Boolean(state.flight)}
        onClick={() => setState(s => moveDelivery(s, move))}>{title}</button>)}
      <button className="btn ghost" type="button" onClick={() => reset(state.layout)}>重开关卡</button>
    </div>
    {state.phase === "won" && <div className="row">
      <button className="btn secondary" type="button" onClick={saveReplay}>导出通关记录</button>
      {download && <span role="status">已请求下载复盘 JSON。</span>}
    </div>}
    <Challenge {...props} valid={deliveryPassed(state)} />
  </div>;
}
