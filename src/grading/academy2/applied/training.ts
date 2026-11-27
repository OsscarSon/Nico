import { seeded } from "./compute";

type Node = { value: number; parents: [number, number][] };
class Tape {
  private nodes: Node[] = [];

  node(value: number, parents: Node["parents"] = []) {
    return this.nodes.push({ value, parents }) - 1;
  }
  read(index: number) {
    return this.nodes[index]!.value;
  }
  add(a: number, b: number) {
    return this.node(this.read(a) + this.read(b), [
      [a, 1],
      [b, 1],
    ]);
  }
  scale(a: number, factor: number) {
    return this.node(this.read(a) * factor, [[a, factor]]);
  }
  multiply(a: number, b: number) {
    return this.node(this.read(a) * this.read(b), [
      [a, this.read(b)],
      [b, this.read(a)],
    ]);
  }
  subtract(a: number, b: number) {
    return this.add(a, this.scale(b, -1));
  }
  sum(values: number[]) {
    return values.reduce((sum, v) => this.add(sum, v), this.node(0));
  }
  square(a: number) {
    return this.multiply(a, a);
  }
  tanh(a: number) {
    const y = Math.tanh(this.read(a));
    return this.node(y, [[a, 1 - y * y]]);
  }
  exp(a: number) {
    const y = Math.exp(this.read(a));
    return this.node(y, [[a, y]]);
  }
  divide(a: number, b: number) {
    const d = this.read(b),
      y = this.read(a) / d;
    return this.node(y, [
      [a, 1 / d],
      [b, -y / d],
    ]);
  }
  gradients(output: number) {
    const gradient = Array<number>(this.nodes.length).fill(0);
    gradient[output] = 1;
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      for (const [parent, derivative] of this.nodes[i]!.parents)
        gradient[parent]! += gradient[i]! * derivative;
    }
    return gradient;
  }
}

type Update = "cnn" | "decoder" | "vae" | "diffusion" | "lora";
type Data = { features: number[]; target: number[] };
type Prediction = { estimates: number[]; penalty?: number };
type Example = (t: Tape, p: number[], row: Data) => Prediction;
type Config = {
  evaluation: string;
  parameters: number[];
  make: (random: () => number) => Data;
  example: Example;
};

const uniform = (random: () => number) => random() * 2 - 1;
const normal = (random: () => number) =>
  Math.sqrt(-2 * Math.log(Math.max(random(), 1e-9))) *
  Math.cos(2 * Math.PI * random());
const base = [
  [1, 0],
  [0, 0.5],
] as const;
const models: Record<Update, Config> = {
  cnn: {
    evaluation: "共享卷积核与 tanh 后的平均池化，目标按两段相邻差构造。",
    parameters: [0.15, 0.08, 0],
    make: (random) => {
      const x = Array.from({ length: 4 }, () => uniform(random));
      const label =
        (Math.tanh(1.2 * (x[0]! - x[1]!)) + Math.tanh(1.2 * (x[2]! - x[3]!))) /
        2;
      return { features: x, target: [label] };
    },
    example: (t, [a, b, bias], row) => ({
      estimates: [
        t.scale(
          t.sum(
            [0, 2].map((i) =>
              t.tanh(
                t.sum([
                  t.scale(a!, row.features[i]!),
                  t.scale(b!, row.features[i + 1]!),
                  bias!,
                ]),
              ),
            ),
          ),
          0.5,
        ),
      ],
    }),
  },
  decoder: {
    evaluation:
      "单头因果自注意力训练 Q、K、V 并有固定残差。每个样本选择一个位置，只允许读该位置及过去。模型省略 LayerNorm 和 FFN。",
    parameters: [0.7, 0.35, 0.15],
    make: (random) => {
      const items = Array.from({ length: 8 }, () => uniform(random));
      const position = 1 + Math.floor(random() * 3);
      const parts = Array.from({ length: position + 1 }, (_, i) =>
        Math.exp(2 * items[2 * position]! * items[i * 2]!),
      );
      const denominator = parts.reduce((s, w) => s + w, 0);
      const value =
        parts.reduce((s, w, i) => s + w * items[i * 2 + 1]!, 0) / denominator +
        0.15 * items[2 * position + 1]!;
      return { features: [...items, position], target: [value] };
    },
    example: (t, [query, key, value], row) => {
      const x = row.features,
        position = x[8]!;
      const q = t.scale(query!, x[2 * position]!);
      const scores = Array.from({ length: position + 1 }, (_, i) =>
        t.multiply(q, t.scale(key!, x[2 * i]!)),
      );
      const highest = Math.max(...scores.map((s) => t.read(s)));
      const weights = scores.map((s) => t.exp(t.add(s, t.node(-highest))));
      const outputs = weights.map((w, i) =>
        t.multiply(w, t.scale(value!, x[2 * i + 1]!)),
      );
      return {
        estimates: [
          t.add(
            t.divide(t.sum(outputs), t.sum(weights)),
            t.node(0.15 * x[2 * position + 1]!),
          ),
        ],
      };
    },
  },
  vae: {
    evaluation:
      "线性高斯编码器与解码器，使用重参数化的成对正负噪声，优化重构项加解析 KL（β=1）。",
    parameters: [0.3, -0.3, 0.35, 0],
    make: (random) => {
      const x = 1.5 * normal(random);
      return { features: [x, normal(random)], target: [x, x] };
    },
    example: (t, [encode, logvar, decode, bias], row) => {
      const mean = t.scale(encode!, row.features[0]!);
      const deviation = t.exp(t.scale(logvar!, 0.5));
      const eps = row.features[1]!;
      const kl = t.scale(
        t.sum([
          t.square(mean),
          t.exp(logvar!),
          t.node(-1),
          t.scale(logvar!, -1),
        ]),
        0.5,
      );
      const estimates = [eps, -eps].map((noise) =>
        t.add(
          t.multiply(decode!, t.add(mean, t.scale(deviation, noise))),
          bias!,
        ),
      );
      // With observation variance 1/2, squared reconstruction error is the NLL up to a constant.
      return { estimates, penalty: kl };
    },
  },
  diffusion: {
    evaluation:
      "固定 4 级噪声日程，预测 ε 的线性条件模型从每级样本反传。另以 DDIM 逐步计算一次生成轨迹。",
    parameters: [0, 0],
    make: (random) => {
      const clean = normal(random) * 0.65,
        epsilon = normal(random),
        step = Math.floor(random() * 4) + 1;
      const alpha = diffusionAlpha(step);
      return {
        features: [
          Math.sqrt(alpha) * clean + Math.sqrt(1 - alpha) * epsilon,
          step / 4,
        ],
        target: [epsilon],
      };
    },
    example: (t, [a, b], row) => ({
      estimates: [
        t.scale(t.add(a!, t.scale(b!, row.features[1]!)), row.features[0]!),
      ],
    }),
  },
  lora: {
    evaluation:
      "冻结原 2×2 权重。实际优化秩一 A、B 因子，在训练集之外测量投影误差。",
    parameters: [0.4, -0.25, 0, 0],
    make: (random) => {
      const x = [uniform(random), uniform(random)];
      const change = 1.1 * x[0]! - 0.75 * x[1]!;
      return {
        features: x,
        target: [x[0]! + 0.6 * change, 0.5 * x[1]! - 1.2 * change],
      };
    },
    example: (t, [a, b, c, d], row) => {
      const [x, y] = row.features;
      const low = t.add(t.scale(a!, x!), t.scale(b!, y!));
      return {
        estimates: [
          t.add(t.node(base[0][0] * x!), t.multiply(c!, low)),
          t.add(t.node(base[1][1] * y!), t.multiply(d!, low)),
        ],
      };
    },
  },
};

const diffusionAlpha = (step: number) => Math.exp(-0.45 * step);
function diffusionTrajectory(parameters: number[], seed: number) {
  let x = normal(seeded(seed));
  const states = [x];
  for (let t = 4; t > 0; t--) {
    const alpha = diffusionAlpha(t),
      previous = diffusionAlpha(t - 1);
    const noise = x * (parameters[0]! + (parameters[1]! * t) / 4);
    const x0 = (x - Math.sqrt(1 - alpha) * noise) / Math.sqrt(alpha);
    x = Math.sqrt(previous) * x0 + Math.sqrt(1 - previous) * noise;
    states.push(x);
  }
  return states;
}

function step(model: Config, parameters: number[], rows: Data[]) {
  const t = new Tape(),
    p = parameters.map((value) => t.node(value));
  const trials = rows.map((row) => {
    const { estimates, penalty } = model.example(t, p, row);
    const errors = estimates.map((output, i) =>
      t.square(t.add(output, t.node(-row.target[i]!))),
    );
    const mean = t.scale(t.sum(errors), 1 / errors.length);
    return penalty === undefined ? mean : t.add(mean, penalty);
  });
  const result = t.scale(t.sum(trials), 1 / rows.length);
  const gradient = t.gradients(result);
  return { loss: t.read(result), gradient: p.map((n) => gradient[n]!) };
}

export const microObjective = (
  task: Update,
  parameters: number[],
  rows: Data[],
) => step(models[task], parameters, rows);

export function trainMicro(
  task: Update,
  epochs: number,
  learningRate: number,
  seed: number,
) {
  const model = models[task];
  if (
    !model ||
    !Number.isInteger(epochs) ||
    epochs < 1 ||
    epochs > 160 ||
    !Number.isFinite(learningRate) ||
    learningRate <= 0 ||
    learningRate > 0.2
  )
    throw Error("训练参数超出课堂范围。");
  const trainingRandom = seeded(seed),
    testSeed = (seed ^ 0x5bd1e995) >>> 0,
    testRandom = seeded(testSeed);
  const training = Array.from({ length: 28 }, () => model.make(trainingRandom));
  const test = Array.from({ length: 24 }, () => model.make(testRandom));
  let parameters = model.parameters.slice();
  const records = [];
  const initialTest = step(model, parameters, test).loss;
  for (let epoch = 0; epoch < epochs; epoch++) {
    const result = step(model, parameters, training);
    records.push({ x: epoch, y: result.loss });
    parameters = parameters.map((v, i) =>
      Math.max(-5, Math.min(5, v - learningRate * result.gradient[i]!)),
    );
  }
  const final = step(model, parameters, training).loss,
    evaluated = step(model, parameters, test).loss;
  records.push({ x: epochs, y: final });
  return {
    records,
    parameters,
    description: model.evaluation,
    training: training.length,
    test: test.length,
    initialTest,
    evaluated,
    testSeed,
    example:
      task === "diffusion"
        ? diffusionTrajectory(parameters, testSeed)
        : task === "lora"
          ? {
              base,
              deltaDeterminant:
                parameters[2]! *
                  parameters[0]! *
                  (parameters[3]! * parameters[1]!) -
                parameters[2]! *
                  parameters[1]! *
                  (parameters[3]! * parameters[0]!),
            }
          : test[0],
  };
}

function outcome(state: number, action: number, flip: boolean, length: number) {
  return Math.max(
    0,
    Math.min(length - 1, state + (flip ? -1 : 1) * (action === 0 ? -1 : 1)),
  );
}

export function trainSlippingPolicy(
  length: number,
  slip: number,
  episodes: number,
  seed: number,
) {
  if (
    !Number.isInteger(length) ||
    length < 3 ||
    length > 12 ||
    !Number.isFinite(slip) ||
    slip < 0 ||
    slip > 0.4 ||
    !Number.isInteger(episodes) ||
    episodes < 1 ||
    episodes > 400
  )
    throw Error("策略参数超出范围。");
  const q = Array.from({ length }, () => [0, 0]),
    schedule = [],
    training = seeded(seed),
    gamma = 0.9;
  const reward = (next: number) => (next === length - 1 ? 1 : -0.04);
  let optimal = Array<number>(length).fill(0);
  for (let i = 0; i < 400; i++)
    optimal = optimal.map((_, s) =>
      s === length - 1
        ? 0
        : Math.max(
            ...[0, 1].map((a) =>
              [false, true].reduce((sum, flip) => {
                const next = outcome(s, a, flip, length);
                return (
                  sum +
                  (flip ? slip : 1 - slip) *
                    (reward(next) + gamma * optimal[next]!)
                );
              }, 0),
            ),
          ),
    );
  for (let run = 0; run < episodes; run++) {
    let state = 0,
      total = 0;
    for (let i = 0; i < length * 5; i++) {
      const row = q[state]!;
      const action =
        training() < 0.2 ? Number(training() > 0.5) : Number(row[1]! > row[0]!);
      const next = outcome(state, action, training() < slip, length);
      const target = reward(next) + gamma * Math.max(...q[next]!);
      row[action]! += 0.24 * (target - row[action]!);
      total += gamma ** i * reward(next);
      state = next;
      if (state === length - 1) break;
    }
    schedule.push({ x: run + 1, y: total });
  }
  const policy = q.slice(0, -1).map((row) => Number(row[1]! > row[0]!));
  const evaluationSeed = (seed ^ 0x45d9f3b) >>> 0,
    test = seeded(evaluationSeed);
  const returns = Array.from({ length: 60 }, () => {
    let state = 0,
      total = 0;
    for (let i = 0; i < length * 5; i++) {
      state = outcome(state, policy[state]!, test() < slip, length);
      total += gamma ** i * reward(state);
      if (state === length - 1) break;
    }
    return { total, reached: state === length - 1 };
  });
  return {
    q,
    policy,
    schedule,
    analytic: optimal[0]!,
    heldOut: returns.reduce((sum, r) => sum + r.total, 0) / returns.length,
    solved: returns.filter((r) => r.reached).length,
    evaluationSeed,
  };
}
