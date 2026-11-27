export function movement(
  x: number,
  y: number,
  speed: number,
  seconds: number,
  degrees: number,
) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: x + speed * seconds * Math.cos(radians),
    y: y + speed * seconds * Math.sin(radians),
  };
}

export function gameFrames(frameMs: number, duration = 1000, stepMs = 20) {
  let lastStep = 0;
  const frames: { time: number; position: number; accumulator: number }[] = [];
  for (let time = frameMs; time < duration + frameMs; time += frameMs) {
    const end = Math.min(time, duration);
    while (lastStep + stepMs <= end) lastStep += stepMs;
    frames.push({
      time: end,
      position: lastStep * 0.006,
      accumulator: end - lastStep,
    });
  }
  return frames;
}

export function overlap(
  x: number,
  y: number,
  width: number,
  height: number,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
) {
  const horizontal = Math.max(
    0,
    Math.min(x + width, ox + ow) - Math.max(x, ox),
  );
  const vertical = Math.max(0, Math.min(y + height, oy + oh) - Math.max(y, oy));
  return { horizontal, vertical, area: horizontal * vertical };
}

export type GameState = "idle" | "running" | "paused" | "finished";
const transitions: Record<GameState, Partial<Record<string, GameState>>> = {
  idle: { start: "running" },
  running: { pause: "paused", finish: "finished" },
  paused: { resume: "running" },
  finished: { reset: "idle" },
};
export function stateTrace(events: string[]) {
  let state: GameState = "idle";
  return events.map((event) => {
    const target = Object.hasOwn(transitions[state], event)
      ? transitions[state][event]
      : undefined;
    state = target ?? state;
    return { event, state, accepted: target !== undefined };
  });
}

export function behavior(threat: number, energy: number) {
  const predicates = [threat >= 7, energy < 3, true];
  const selected = predicates.indexOf(true);
  return {
    choice: ["evade", "recharge", "patrol"][selected]!,
    tested: predicates.slice(0, selected + 1),
  };
}

export function snapshot(
  x: number,
  velocity: number,
  lag: number,
  blend: number,
) {
  const next = x + velocity;
  const arrivalPosition = x + velocity * lag;
  return {
    next,
    arrivalPosition,
    predicted: arrivalPosition + (next - arrivalPosition) * blend,
  };
}

export function pinhole(x: number, y: number, z: number, focal: number) {
  if (!(z > 0 && focal > 0)) throw Error("深度及焦距必须大于零。");
  return { x: (focal * x) / z, y: (focal * y) / z };
}

export function raster(width: number, depth: number, light: number) {
  const vertices = [
    { x: -width / 2, y: -1 },
    { x: width / 2, y: -1 },
    { x: 0, y: 1 },
  ].map(({ x, y }) => pinhole(x, y, depth, 4));
  const [a, b, c] = vertices as [
    (typeof vertices)[number],
    (typeof vertices)[number],
    (typeof vertices)[number],
  ];
  const pixels = [];
  const determinant = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  for (let y = -5; y < 5; y++)
    for (let x = -5; x < 5; x++) {
      const u =
        ((b.y - c.y) * (x + 0.5 - c.x) + (c.x - b.x) * (y + 0.5 - c.y)) /
        determinant;
      const v =
        ((c.y - a.y) * (x + 0.5 - c.x) + (a.x - c.x) * (y + 0.5 - c.y)) /
        determinant;
      if (u >= 0 && v >= 0 && u + v <= 1)
        pixels.push({
          x: x + 0.5,
          y: y + 0.5,
          illumination: Math.max(0, Math.cos((light * Math.PI) / 180)),
        });
    }
  return { vertices, pixels };
}

export function dielectric(base: number, cosine: number, roughness: number) {
  const normal = 0.04;
  const reflectance = normal + (1 - normal) * (1 - cosine) ** 5;
  const alphaSquared = roughness ** 4;
  const denominator = 1 + (alphaSquared - 1) * cosine ** 2;
  const normalDensity = alphaSquared / (Math.PI * denominator ** 2);
  return {
    reflectance,
    diffuseWeight: (1 - reflectance) * base,
    normalDensity,
  };
}

export function fall(
  height: number,
  gravity: number,
  restitution: number,
  step: number,
) {
  let y = height,
    velocity = 0,
    impacts = 0;
  const points = [{ x: 0, y }];
  for (let n = 1; n <= 100; n++) {
    velocity -= gravity * step;
    y += velocity * step;
    if (y < 0) {
      y = 0;
      velocity *= -restitution;
      impacts++;
    }
    points.push({ x: n * step, y });
  }
  return { points, impacts, velocity };
}

export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function terrain(seed: number, persistence: number) {
  const random = seeded(seed);
  const anchors = Array.from({ length: 9 }, random);
  return Array.from({ length: 33 }, (_, x) => {
    const left = Math.min(7, Math.floor(x / 4));
    const phase = x / 4 - left;
    const base = anchors[left]! * (1 - phase) + anchors[left + 1]! * phase;
    return { x, y: base + persistence * (random() - 0.5) };
  });
}

export function electronics(
  supply: number,
  resistance: number,
  input: number,
  pwm: number,
) {
  const adc = Math.min(1023, Math.max(0, Math.floor((1024 * input) / supply)));
  return {
    milliamps: (supply / resistance) * 1000,
    watts: supply ** 2 / resistance,
    adc,
    average: (supply * pwm) / 100,
  };
}

export function mailbox(period: number, service: number, capacity: number) {
  let backlog = 0,
    drops = 0,
    completed = 0;
  const trace = [];
  for (let tick = 0; tick < 60; tick++) {
    if (tick % service === 0 && backlog > 0) {
      backlog--;
      completed++;
    }
    if (tick % period === 0) {
      if (backlog === capacity) drops++;
      else backlog++;
    }
    trace.push({ tick, backlog, drops });
  }
  return { backlog, drops, completed, trace };
}

export function sampleSignals(rate: number, frequency: number) {
  const points = Array.from({ length: rate + 1 }, (_, n) => ({
    x: n / rate,
    y: Math.sin((2 * Math.PI * frequency * n) / rate),
  }));
  const remainder = frequency % rate;
  return { points, fold: Math.min(remainder, rate - remainder) };
}

export function controller(
  target: number,
  gain: number,
  integral: number,
  derivative: number,
  disturbance: number,
) {
  const dt = 0.1,
    points = [{ x: 0, y: 0 }],
    actions = [];
  let y = 0,
    sum = 0,
    last = target;
  for (let i = 1; i <= 80; i++) {
    const error = target - y;
    const provisional = sum + error * dt;
    const d = (error - last) / dt;
    const raw = gain * error + integral * provisional + derivative * d;
    const output = Math.max(-8, Math.min(8, raw));
    if (output === raw || Math.sign(raw) !== Math.sign(error))
      sum = provisional;
    y += dt * (output - 0.7 * y + (i >= 40 ? disturbance : 0));
    last = error;
    points.push({ x: i * dt, y });
    actions.push(output);
  }
  return {
    points,
    error: target - y,
    max: Math.max(...points.map((p) => p.y)),
    actions,
  };
}

export function robotPose(
  left: number,
  right: number,
  spacing: number,
  seconds: number,
) {
  const v = (left + right) / 2,
    w = (right - left) / spacing,
    angle = w * seconds;
  return Math.abs(w) < 1e-10
    ? { x: v * seconds, y: 0, angle }
    : {
        x: (v / w) * Math.sin(angle),
        y: (v / w) * (1 - Math.cos(angle)),
        angle,
      };
}

export function bayesSensor(
  prior: number,
  observation: number,
  variance: number,
  sensorNoise: number,
) {
  const gain = variance / (variance + sensorNoise);
  return {
    gain,
    posterior: prior + gain * (observation - prior),
    uncertainty: (1 - gain) * variance,
  };
}

export function particleSensor(
  seed: number,
  observation: number,
  spread: number,
  count: number,
) {
  const random = seeded(seed);
  const particles = Array.from(
    { length: count },
    () => (random() + random() - 1) * 6,
  );
  const logs = particles.map((p) => -0.5 * ((observation - p) / spread) ** 2),
    max = Math.max(...logs);
  const weights = logs.map((log) => Math.exp(log - max));
  const total = weights.reduce((sum, w) => sum + w, 0);
  const normalized = weights.map((w) => w / total);
  const cumulative = normalized.map((_, i) =>
    normalized.slice(0, i + 1).reduce((s, w) => s + w, 0),
  );
  const start = random() / count;
  let index = 0;
  const resampled = Array.from({ length: count }, (_, i) => {
    const draw = start + i / count;
    while (index < count - 1 && cumulative[index]! < draw) index++;
    return particles[index]!;
  });
  return {
    residues: normalized,
    estimate: particles.reduce((s, p, i) => s + p * normalized[i]!, 0),
    effective: 1 / normalized.reduce((s, w) => s + w * w, 0),
    particles,
    resampled,
  };
}

export function landmarkMap(
  displacement: number,
  firstRange: number,
  secondRange: number,
  fixed: number,
) {
  // With x0 fixed, minimize (x1-x0-displacement)^2+(L-x0-r1)^2+(L-x1-r2)^2.
  const discrepancy = firstRange - displacement - secondRange;
  const pose = fixed + displacement + discrepancy / 3;
  const landmark = fixed + firstRange - discrepancy / 3;
  return {
    pose,
    landmark,
    residuals: [
      pose - fixed - displacement,
      landmark - fixed - firstRange,
      landmark - pose - secondRange,
    ],
  };
}

export function planGrid(grid: string) {
  const cells = grid
    .trim()
    .split(/\r?\n/)
    .map((row) => [...row]);
  const width = cells[0]?.length ?? 0;
  if (
    !width ||
    width > 24 ||
    cells.length > 24 ||
    cells.some(
      (row) =>
        row.length !== width || row.some((cell) => !".#SG".includes(cell)),
    )
  )
    throw Error("地图每行等宽，限 24×24，使用 . # S G。");
  const flat = cells.flat();
  if (
    flat.filter((cell) => cell === "S").length !== 1 ||
    flat.filter((cell) => cell === "G").length !== 1
  )
    throw Error("标记一个起点 S 和一个终点 G。");
  const start = flat.indexOf("S"),
    goal = flat.indexOf("G");
  const previous = new Map([[start, -1]]),
    queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]!;
    if (here === goal) break;
    const x = here % width,
      y = Math.floor(here / width);
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      const next = ny * width + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= width ||
        ny >= cells.length ||
        flat[next] === "#" ||
        previous.has(next)
      )
        continue;
      previous.set(next, here);
      queue.push(next);
    }
  }
  const path = [];
  if (previous.has(goal))
    for (let key = goal; key !== -1; key = previous.get(key)!)
      path.push({ x: key % width, y: Math.floor(key / width) });
  return { path: path.reverse(), visited: previous.size };
}

export function alignSequences(a: string, b: string) {
  if (!/^[A-Z]{1,32}$/.test(a) || !/^[A-Z]{1,32}$/.test(b))
    throw Error("每行输入 1–32 个大写字母作为抽象序列。");
  const costs = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i * j === 0 ? i + j : 0)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      costs[i]![j] = Math.min(
        costs[i - 1]![j]! + 1,
        costs[i]![j - 1]! + 1,
        costs[i - 1]![j - 1]! + Number(a[i - 1] !== b[j - 1]),
      );
    }
  return { distance: costs[a.length]![b.length]!, costs };
}

export function geoDistance(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((latB - latA) * rad) / 2) ** 2 +
    Math.cos(latA * rad) *
      Math.cos(latB * rad) *
      Math.sin(((lonB - lonA) * rad) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function discounted(cashflows: number[], rate: number) {
  return cashflows.reduce(
    (total, value, i) => total + value / (1 + rate) ** i,
    0,
  );
}

export function quantumInterference(angle: number, finalGate: boolean) {
  // H|0> followed by Rz up to a global phase, and an optional final H.
  const radians = (angle * Math.PI) / 180;
  const amplitudes = finalGate
    ? [
        [(1 + Math.cos(radians)) / 2, Math.sin(radians) / 2],
        [(1 - Math.cos(radians)) / 2, -Math.sin(radians) / 2],
      ]
    : [
        [Math.SQRT1_2, 0],
        [Math.SQRT1_2 * Math.cos(radians), Math.SQRT1_2 * Math.sin(radians)],
      ];
  return {
    amplitudes,
    probabilities: amplitudes.map(([r, i]) => r! * r! + i! * i!),
  };
}

export function workflow(input: string, minimum: number, retry: boolean) {
  const entries = input.trim().split(/\r?\n/);
  const accepted = new Map<string, number>();
  const trace = [];
  if (!input.trim() || entries.length > 100)
    throw Error("输入 1–100 条记录，每行填 ID、数值及动作。");
  for (const line of retry ? [...entries, entries[0]!] : entries) {
    const fields = line.split(",").map((value) => value.trim());
    const [id, amount, action] = fields;
    const value = Number(amount);
    let status;
    if (
      fields.length !== 3 ||
      !/^[\w-]{1,32}$/.test(id!) ||
      !/^[+-]?\d+(\.\d+)?$/.test(amount!) ||
      !Number.isFinite(value) ||
      action !== "record"
    )
      status = 400;
    else if (value < minimum) status = 422;
    else if (accepted.has(id!) && accepted.get(id!) !== value) status = 409;
    else if (accepted.has(id!)) status = 200;
    else {
      accepted.set(id!, value);
      status = 201;
    }
    trace.push({ line, status });
  }
  return {
    trace,
    count: accepted.size,
    total: [...accepted.values()].reduce((sum, value) => sum + value, 0),
  };
}

export function vision(input: string, threshold: number) {
  const pixels = input
    .trim()
    .split(/\s+/)
    .map((row) => [...row]);
  if (
    !pixels[0]?.length ||
    pixels.length > 20 ||
    pixels[0].length > 20 ||
    pixels.some(
      (row) =>
        row.length !== pixels[0]!.length ||
        row.some((value) => !/^\d$/.test(value)),
    )
  )
    throw Error("输入 1–20 个等宽像素行，每个像素为 0–9。");
  const points = pixels.flatMap((row, y) =>
    row.flatMap((value, x) =>
      Number(value) >= threshold ? [{ x, y, group: Number(value) }] : [],
    ),
  );
  return {
    points,
    centroid: points.length
      ? {
          x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
          y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        }
      : null,
  };
}

export function periodicSchedule(
  period: number,
  cost: number,
  secondPeriod: number,
  secondCost: number,
) {
  const tasks = [
    { id: "A", period, cost },
    { id: "B", period: secondPeriod, cost: secondCost },
  ];
  const ready: { id: string; deadline: number; remaining: number }[] = [];
  const trace = [];
  let misses = 0;
  for (let tick = 0; tick <= 60; tick++) {
    for (let i = ready.length - 1; i >= 0; i--) {
      const job = ready[i]!;
      if (job.deadline === tick) {
        misses++;
        ready.splice(i, 1);
      }
    }
    if (tick === 60) break;
    for (const task of tasks)
      if (tick % task.period === 0)
        ready.push({
          id: task.id,
          deadline: tick + task.period,
          remaining: task.cost,
        });
    ready.sort((a, b) => a.deadline - b.deadline || a.id.localeCompare(b.id));
    const active = ready[0];
    trace.push({ tick, runs: active?.id ?? "idle" });
    if (active && --active.remaining === 0) ready.shift();
  }
  return {
    trace,
    misses,
    utilization: cost / period + secondCost / secondPeriod,
  };
}
