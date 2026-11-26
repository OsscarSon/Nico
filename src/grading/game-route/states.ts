export type Gravity = 0 | 4 | 8;
export type Fall = { y: number; vy: number; heights: number[]; landed: boolean };
export const initialFall = (): Fall => ({ y: 2, vy: 0, heights: [], landed: false });
export function stepFall(state: Fall, gravity: Gravity, solidFloor = true): Fall {
  if (state.landed) return state;
  const vy = state.vy - gravity * .25;
  const next = state.y + vy * .25;
  const landed = solidFloor && next <= 0;
  const y = landed ? 0 : next;
  return { y, vy: landed ? 0 : vy, heights: [...state.heights.slice(-7), y], landed };
}
export const fallPassed = (state: Fall) =>
  state.landed && state.heights.join(",") === "1.75,1.25,0.5,0" && state.vy === 0;

export type GamePhase = "idle" | "running" | "paused" | "finished";
export type Round = { phase: GamePhase; energy: number; sawPausedMove: boolean; message: string };
export type Transition = "start" | "move" | "pause" | "resume" | "dock";
export const initialRound = (): Round => ({ phase: "idle", energy: 0, sawPausedMove: false, message: "等待开始。" });
export function transition(round: Round, action: Transition): Round {
  if (action === "start" && round.phase === "idle") return { ...round, phase: "running", message: "巡检开始。" };
  if (action === "pause" && round.phase === "running") return { ...round, phase: "paused", message: "已暂停，保留电量。" };
  if (action === "resume" && round.phase === "paused") return { ...round, phase: "running", message: "从原电量继续。" };
  if (action === "move" && round.phase === "running") return { ...round, energy: Math.min(2, round.energy + 1), message: "更新本轮电量。" };
  if (action === "move" && round.phase === "paused") return { ...round, sawPausedMove: round.sawPausedMove || round.energy === 1, message: "暂停期间移动被拒绝，电量没变。" };
  if (action === "dock" && round.phase === "running" && round.energy === 2) return { ...round, phase: "finished", message: "电量满足，停靠完成。" };
  return { ...round, message: round.phase === "finished" ? "本轮已经完成，要从新一轮开始。" : "当前状态或电量不允许该操作。" };
}
export const roundPassed = (round: Round) => round.phase === "finished" && round.energy === 2 && round.sawPausedMove;

export type Token = "A" | "B";
type Receipt = { token: Token; visual: boolean; sound: boolean; muted: boolean; soundEnabled: boolean };
export type FeedbackRun = { receipts: Receipt[]; duplicateBlocked: boolean; announcement?: Token; message: string };
export type FeedbackSettings = { muted: boolean; visual: boolean; sound: boolean };
export const initialFeedback = (): FeedbackRun => ({ receipts: [], duplicateBlocked: false, message: "还没有收集记录。" });
export function collectFeedback(state: FeedbackRun, token: Token, settings: FeedbackSettings): FeedbackRun {
  if (state.receipts.some(receipt => receipt.token === token)) {
    return { ...state, announcement: undefined, duplicateBlocked: state.duplicateBlocked || token === "A", message: `电池 ${token} 已经收集，没有发出第二次提示。` };
  }
  const sound = settings.sound && !settings.muted;
  const visual = settings.visual;
  return {
    ...state, announcement: visual ? token : undefined,
    receipts: [...state.receipts, { token, visual, sound, muted: settings.muted, soundEnabled: settings.sound }],
    message: `收集 ${token} · ${visual ? "有视觉提示" : "无视觉提示"} · ${sound ? "发出音效请求" : "无音效请求"}`,
  };
}
export const feedbackPassed = (state: FeedbackRun) => state.duplicateBlocked
  && state.receipts.some(r => r.token === "A" && r.visual && r.sound)
  && state.receipts.some(r => r.token === "B" && r.visual && r.soundEnabled && r.muted && !r.sound);

export type Level = "gap" | "bridge";
export type Move = "left" | "right" | "jump-left" | "jump-right" | "land";
type Flight = -1 | 0 | 1;
export const level = { columns: 8, batteries: [1, 5], pit: 3, exit: 7 };
export type Delivery = {
  layout: Level; x: number; flight: Flight; collected: number[]; phase: "playing" | "failed" | "won";
  crossedGap: boolean; actions: Move[]; message: string;
};
export const initialDelivery = (layout: Level): Delivery => ({
  layout, x: 0, flight: 0, collected: [], phase: "playing", crossedGap: false, actions: [], message: "收集两块电池，然后停靠。",
});

export function moveDelivery(state: Delivery, action: Move): Delivery {
  if (state.phase !== "playing" || (action === "land") !== Boolean(state.flight)) return state;
  const direction = action === "land" ? state.flight : action.endsWith("left") ? -1 : 1;
  const x = state.x + direction;
  const jumping = action === "jump-right" || action === "jump-left";
  const finishX = jumping ? x + direction : x;
  if (finishX < 0 || finishX >= level.columns) return { ...state, message: "前方超出地图。" };

  const actions = [...state.actions, action];
  if (jumping) return { ...state, x, actions, flight: direction, message: "已起跳，推进落地帧。" };
  if (state.layout === "gap" && x === level.pit) {
    return { ...state, x, actions, flight: 0, phase: "failed", message: "落在缺口。重新开始后，试着从缺口前一格起跳。" };
  }

  const collected = level.batteries.includes(x) && !state.collected.includes(x) ? [...state.collected, x] : state.collected;
  const won = x === level.exit && collected.length === level.batteries.length;
  const crossedGap = state.crossedGap || (state.layout === "gap" && action === "land" && state.x === level.pit);
  const message = won ? "两块电池已送达。"
    : x === level.exit ? "电量不足，出口保持关闭。"
      : collected.length > state.collected.length ? "已收集电池。" : "继续前进。";
  return { ...state, x, actions, flight: 0, collected, crossedGap, phase: won ? "won" : "playing", message };
}
export const deliveryPassed = (state: Delivery) => state.phase === "won" && state.crossedGap;
export function exportDelivery(state: Delivery) {
  if (state.phase !== "won") return;
  return { version: 1, layout: state.layout, actions: state.actions, collected: state.collected, position: state.x, crossedGap: state.crossedGap };
}
