export function scheduleWorkflow(text: string) {
  type Task = { id: string; length: number; dependencies: string[] };
  const tasks = new Map<string, Task>();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length > 40) throw Error("流程最多 40 个任务。");
  for (const line of lines) {
    const [id, rawTime, ...dependencies] = line
      .split(",")
      .map((value) => value.trim());
    const length = Number(rawTime);
    if (
      !id ||
      !/^[a-zA-Z][\w-]{0,20}$/.test(id) ||
      !rawTime ||
      !Number.isFinite(length) ||
      length <= 0 ||
      length > 10000 ||
      tasks.has(id) ||
      dependencies.some((v) => !v) ||
      new Set(dependencies).size !== dependencies.length
    )
      throw Error(
        "输入任务名,时长,依赖，任务名唯一，各依赖以逗号分隔。没有依赖就只输前两项。",
      );
    tasks.set(id, { id, length, dependencies });
  }
  const done = new Map<string, { start: number; end: number }>();
  for (const task of tasks.values())
    if (task.dependencies.some((id) => !tasks.has(id)))
      throw Error("存在未定义的上游任务。");
  while (done.size < tasks.size) {
    const runnable = [...tasks.values()].filter(
      (task) =>
        !done.has(task.id) && task.dependencies.every((id) => done.has(id)),
    );
    if (!runnable.length) throw Error("发现循环依赖，至少一个任务无法启动。");
    for (const task of runnable) {
      const start = Math.max(
        0,
        ...task.dependencies.map((id) => done.get(id)!.end),
      );
      done.set(task.id, { start, end: start + task.length });
    }
  }
  return {
    tasks: [...done].map(([id, timing]) => ({ id, ...timing })),
    elapsed: Math.max(...[...done.values()].map((item) => item.end)),
  };
}

export function mobileRestore(events: string[]) {
  let alive = true,
    draft = 0,
    storage = 0;
  const trace = events.map((event) => {
    if (event === "kill") {
      alive = false;
      draft = 0;
    } else if (event === "open") {
      if (!alive) draft = storage;
      alive = true;
    } else if (event === "save" && alive) storage = draft;
    else if (/^edit:\d{1,2}$/.test(event) && alive)
      draft = Number(event.slice(5));
    else
      throw Error(
        "仅接受 edit:0 到 edit:99、save、kill 和 open；编辑、保存前先打开。",
      );
    return { event, alive, draft, storage };
  });
  return { alive, draft: alive ? draft : null, storage, trace };
}

export function sensorCalibration(
  low: number,
  high: number,
  observed: number,
  offset: number,
) {
  if (low >= high) throw Error("高温参考码必须大于低温参考码。");
  const slope = 40 / (high - low),
    intercept = 5 - slope * low;
  const corrected = observed - offset;
  return {
    slope,
    intercept,
    temperature: slope * corrected + intercept,
    inRange: corrected >= low && corrected <= high,
  };
}

export function recordTelemetry(text: string) {
  const updates = new Set<number>();
  const fields = text.trim().split(/[\s,]+/);
  if (
    !text.trim() ||
    fields.length > 100 ||
    fields.some((field) => !/^\d{1,4}$/.test(field))
  )
    throw Error("按接收顺序输入 1–100 个非负整数序号。");
  const trace = fields.map(Number).map((sequence) => {
    const retransmission = updates.has(sequence);
    updates.add(sequence);
    return { sequence, retransmission };
  });
  const lowest = Math.min(...updates),
    highest = Math.max(...updates);
  const missing = Array.from(
    { length: highest - lowest + 1 },
    (_, i) => lowest + i,
  ).filter((sequence) => !updates.has(sequence));
  return { trace, missing, unique: updates.size };
}

export function closedLoop(
  a: number,
  b: number,
  gain: number,
  initial: number,
) {
  const pole = a - b * gain;
  const points = Array.from({ length: 15 }, (_, i) => ({
    x: i,
    y: initial * pole ** i,
  }));
  return { pole, points, stable: Math.abs(pole) < 1 };
}
