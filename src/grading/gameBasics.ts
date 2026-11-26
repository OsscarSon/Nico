export type Point = { x: number; y: number };
export type Direction = -1 | 0 | 1;
export const board = { columns: 6, rows: 4, origin: { x: 2, y: 1 } };

const withinColumns = (x: number) => Math.max(0, Math.min(board.columns - 1, x));
const samePoint = (p: Point, x: number, y: number) => p.x === x && p.y === y;

type Frame = {
  phase: "sample" | "update" | "draw";
  sampled: Direction;
  world: number;
  drawn: number;
  history: number[];
};
type FrameAction = { type: "sample"; direction: Direction } | { type: "update" } | { type: "draw" };

export const initialFrame = (): Frame => ({ phase: "sample", sampled: 0, world: 1, drawn: 1, history: [] });

export function advanceFrame(frame: Frame, action: FrameAction): Frame {
  if (frame.phase !== action.type) return frame;
  switch (action.type) {
    case "sample":
      return { ...frame, phase: "update", sampled: action.direction };
    case "update":
      return { ...frame, phase: "draw", world: withinColumns(frame.world + frame.sampled) };
    case "draw":
      return { ...frame, phase: "sample", drawn: frame.world, history: [...frame.history.slice(-1), frame.world] };
  }
}

export const framePassed = (frame: Frame) =>
  frame.phase === "sample" && frame.drawn === 3 && frame.history.length === 2 && frame.history[0] === 2;

export type Space = "world" | "local";
export type Marker = { world: Point; space: Space };
export type Markers = { supply?: Marker; dock?: Marker };

export function placeMarker(value: Point, space: Space): Marker | undefined {
  const origin = space === "local" ? board.origin : { x: 0, y: 0 };
  const world = { x: origin.x + value.x, y: origin.y + value.y };
  if (!Number.isInteger(world.x) || !Number.isInteger(world.y)
    || world.x < 0 || world.x >= board.columns || world.y < 0 || world.y >= board.rows) return;
  return { world, space };
}

export const markersPassed = ({ supply, dock }: Markers) =>
  supply?.space === "world" && samePoint(supply.world, 4, 2)
  && dock?.space === "local" && samePoint(dock.world, 1, 3);

export type TimeStep = 250 | 500 | 1000;
type MotionFrame = { elapsed: TimeStep; velocity: Point };
export type Motion = { position: Point; total: number; frames: MotionFrame[] };

export const initialMotion = (): Motion => ({ position: { x: 0, y: 0 }, total: 0, frames: [] });

export function stepMotion(motion: Motion, velocity: Point, elapsed: TimeStep): Motion {
  const total = motion.total + elapsed;
  if (total > 1000 || ![250, 500, 1000].includes(elapsed)
    || ![velocity.x, velocity.y].every(v => Number.isInteger(v) && Math.abs(v) <= 4)) return motion;
  return {
    total,
    position: {
      x: motion.position.x + velocity.x * elapsed / 1000,
      y: motion.position.y + velocity.y * elapsed / 1000,
    },
    frames: [...motion.frames, { elapsed, velocity }],
  };
}

export type Trials = Partial<Record<2 | 4, Motion>>;

export function recordTrial(trials: Trials, motion: Motion): Trials {
  const steps = motion.frames.length;
  return motion.total === 1000 && (steps === 2 || steps === 4) ? { ...trials, [steps]: motion } : trials;
}

export function trialMatches(motion: Motion | undefined, steps: 2 | 4) {
  return Boolean(motion?.total === 1000 && motion.frames.length === steps && samePoint(motion.position, 4, 2)
    && motion.frames.every(f => f.elapsed === 1000 / steps && samePoint(f.velocity, 4, 2)));
}

export const motionPassed = (trials: Trials) => trialMatches(trials[2], 2) && trialMatches(trials[4], 4);

export type GameKey = "ArrowLeft" | "ArrowRight" | "Space";
export type KeyState = {
  pressed: Record<GameKey, boolean>;
  queuedSignal: boolean;
  x: number;
  signals: number;
  ticks: number;
  heldTicks: number;
  maxHeldTicks: number;
  lastSignal: boolean;
};

export const initialKeys = (): KeyState => ({
  pressed: { ArrowLeft: false, ArrowRight: false, Space: false },
  queuedSignal: false, x: 0, signals: 0, ticks: 0, heldTicks: 0, maxHeldTicks: 0, lastSignal: false,
});

export function setGameKey(state: KeyState, key: GameKey, pressed: boolean): KeyState {
  if (state.pressed[key] === pressed) return state;
  return {
    ...state, pressed: { ...state.pressed, [key]: pressed },
    queuedSignal: state.queuedSignal || (key === "Space" && pressed),
    heldTicks: key === "Space" && !pressed ? 0 : state.heldTicks,
  };
}

export function stepKeys(state: KeyState): KeyState {
  const direction = Number(state.pressed.ArrowRight) - Number(state.pressed.ArrowLeft);
  const heldTicks = state.pressed.Space ? state.heldTicks + 1 : 0;
  return {
    ...state, heldTicks, x: withinColumns(state.x + direction),
    maxHeldTicks: Math.max(state.maxHeldTicks, heldTicks),
    signals: state.signals + Number(state.queuedSignal), ticks: state.ticks + 1,
    lastSignal: state.queuedSignal, queuedSignal: false,
  };
}

export const keysPassed = (state: KeyState) =>
  state.x === 3 && state.signals === 2 && state.maxHeldTicks >= 2 && !state.pressed.Space && !state.queuedSignal;
