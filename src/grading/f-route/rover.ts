export const scenarios = {
  first: { label: "近障碍", walls: [[2, 1]], dropout: false, goal: 2 },
  second: { label: "晚出现的障碍", walls: [[4, 1], [1, 2]], dropout: false, goal: 2 },
  missing: { label: "传感器失效", walls: [[3, 1]], dropout: true, goal: 2 },
} as const;
export type Scenario = keyof typeof scenarios;
export type RoverRules = { threshold: number; side: "upper" | "lower"; failsafe: boolean };
export type RoverRun = {
  scenario: Scenario; x: number; y: number; status: "running" | "arrived" | "parked" | "blocked" | "missed";
  trace: { x: number; y: number; distance: number | null; action: string }[];
};
export const initialRover = (scenario: Scenario): RoverRun => ({ scenario, x: 0, y: 1, status: "running", trace: [] });

export function stepRover(run: RoverRun, rules: RoverRules): RoverRun {
  if (run.status !== "running") return run;
  const layout = scenarios[run.scenario];
  const distance = layout.dropout && run.x === 1
    ? null : Math.min(60, ...layout.walls.filter(([x, y]) => y === run.y && x > run.x).map(([x]) => (x - run.x) * 10));
  const stopped = distance === null && rules.failsafe;
  const detour = distance !== null && distance <= rules.threshold;
  const x = stopped || detour ? run.x : run.x + 1;
  const y = detour ? run.y + (rules.side === "lower" ? 1 : -1) : run.y;
  const blocked = y < 0 || y > 2 || layout.walls.some(([cx, cy]) => cx === x && cy === y);
  const action = stopped ? "无读数，停车" : blocked ? "目标格阻塞" : detour ? "绕入相邻通道" : distance === null ? "忽略失效并前进" : "向前";
  return {
    ...run,
    x: blocked ? run.x : x, y: blocked ? run.y : y,
    status: stopped ? "parked" : blocked ? "blocked" : x === 5 ? y === layout.goal ? "arrived" : "missed" : "running",
    trace: [...run.trace, { x: blocked ? run.x : x, y: blocked ? run.y : y, distance, action }],
  };
}
export function playScenario(start: RoverRun, rules: RoverRules) {
  let run = start;
  for (let i = 0; i < 12 && run.status === "running"; i++) run = stepRover(run, rules);
  return run;
}
export type Trials = Partial<Record<Scenario, RoverRun>>;
export function roverPassed(trials: Trials) {
  return trials.first?.status === "arrived" && trials.second?.status === "arrived"
    && trials.missing?.status === "parked" && trials.missing.x === 1
    && trials.missing.trace.at(-1)?.distance === null;
}
export function roverReplay(trials: Trials, rules: RoverRules) {
  return roverPassed(trials) ? { version: 1, rules, trials } : undefined;
}
