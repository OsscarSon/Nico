import { random } from "../data/ml-models";
import { softmax } from "../data/ml-multiclass";
import { dot } from "./numerics";

export function conv2d(image: number[][], kernel: number[][]) {
  const columns = image[0]?.length ?? 0,
    w = kernel[0]?.length ?? 0;
  if (
    !w ||
    kernel.length > image.length ||
    w > columns ||
    image.some((row) => row.length !== columns) ||
    kernel.some((row) => row.length !== w)
  )
    throw Error("卷积核须适合矩形输入。");
  return Array.from({ length: image.length - kernel.length + 1 }, (_, i) =>
    Array.from({ length: columns - w + 1 }, (_, j) =>
      kernel.reduce(
        (sum, row, u) =>
          sum +
          row.reduce((inner, v, k) => inner + v * image[i + u]![j + k]!, 0),
        0,
      ),
    ),
  );
}

export function attention(
  query: number[][],
  keys: number[][],
  values: number[][],
  causal = false,
) {
  const d = query[0]?.length ?? 0,
    output = values[0]?.length ?? 0;
  if (
    !d ||
    !output ||
    !keys.length ||
    keys.length !== values.length ||
    [...query, ...keys].some((row) => row.length !== d) ||
    values.some((row) => row.length !== output) ||
    (causal && query.length !== keys.length)
  )
    throw Error("查询、键和值的形状无法相乘。");
  const weights = query.map((q, i) => {
    const logits = (causal ? keys.slice(0, i + 1) : keys).map(
      (key) => dot(q, key) / Math.sqrt(d),
    );
    const p = softmax(logits);
    return [...p, ...Array<number>(keys.length - p.length).fill(0)];
  });
  const embeddings = weights.map((weight) =>
    values[0]!.map((_, j) =>
      dot(
        weight,
        values.map((row) => row[j]!),
      ),
    ),
  );
  return { weights, embeddings };
}
const norm = (x: number[]) => {
  const mean = x.reduce((total, v) => total + v, 0) / x.length;
  const sd = Math.sqrt(
    x.reduce((total, v) => total + (v - mean) ** 2, 0) / x.length + 1e-5,
  );
  return x.map((v) => (v - mean) / sd);
};

export function decoderBlock(tokens: number[][]) {
  if (tokens.some((row) => row.length !== 2))
    throw Error("课堂解码层只使用二维嵌入。");
  const withPosition = tokens.map(([x, y], i) => [
    x! + Math.sin(i),
    y! + Math.cos(i),
  ]);
  const keys = withPosition.map(([x, y]) => [y!, x!]);
  const { weights, embeddings } = attention(
    withPosition,
    keys,
    withPosition,
    true,
  );
  const residual = withPosition.map((x, i) =>
    norm(x.map((v, j) => v + embeddings[i]![j]!)),
  );
  const output = residual.map(([x, y]) =>
    norm([x! + 0.5 * Math.max(0, x! + y!), y! + 0.5 * Math.max(0, x! - y!)]),
  );
  return { withPosition, weights, residual, output };
}

export function nearestEmbedding(
  query: number[],
  records: { id: string; vector: number[] }[],
) {
  const q = Math.hypot(...query);
  if (!q || records.some((row) => row.vector.length !== query.length))
    throw Error("查询向量长度需匹配并且范数非零。");
  return records
    .map(({ id, vector }) => {
      const norm = Math.hypot(...vector);
      return { id, similarity: norm ? dot(query, vector) / (q * norm) : null };
    })
    .filter((row) => row.similarity !== null)
    .sort((a, b) => b.similarity! - a.similarity!);
}

export function trainCorridor(
  length: number,
  episodes: number,
  rate: number,
  gamma: number,
  epsilon: number,
  seed: number,
) {
  if (
    length < 3 ||
    length > 16 ||
    !Number.isInteger(length) ||
    episodes < 1 ||
    rate <= 0 ||
    rate > 1 ||
    gamma < 0 ||
    gamma > 1 ||
    epsilon < 0 ||
    epsilon > 1
  )
    throw Error("检查走廊和训练参数。");
  const rand = random(seed),
    rows = Array.from({ length }, () => [0, 0]);
  const returns: { x: number; y: number }[] = [];
  for (let episode = 1; episode <= episodes; episode++) {
    let s = 0,
      rewardSum = 0;
    for (let step = 0; step < length * 8; step++) {
      const row = rows[s]!;
      const action =
        rand() < epsilon ? Math.floor(rand() * 2) : Number(row[1]! >= row[0]!);
      const next = Math.max(0, s + (action === 1 ? 1 : -1)),
        terminal = next === length - 1;
      const reward = terminal ? 1 : -0.04;
      const target = reward + (terminal ? 0 : gamma * Math.max(...rows[next]!));
      row[action]! += rate * (target - row[action]!);
      rewardSum += reward;
      s = next;
      if (terminal) break;
    }
    returns.push({ x: episode, y: rewardSum });
  }
  return {
    rows,
    returns,
    policy: rows
      .slice(0, -1)
      .map(([left, right]) => (right! >= left! ? "右" : "左")),
  };
}

export function quantize(values: number[], bits: number) {
  if (
    bits < 2 ||
    bits > 16 ||
    !Number.isInteger(bits) ||
    !values.length ||
    values.some((x) => !Number.isFinite(x))
  )
    throw Error("输入 2–16 位与有限权重。");
  const qmax = 2 ** (bits - 1) - 1,
    scale = (Math.max(...values.map(Math.abs)) || 1) / qmax;
  const integer = values.map((x) => Math.round(x / scale));
  const restored = integer.map((x) => x * scale);
  return {
    scale,
    integer,
    restored,
    maxError: Math.max(...values.map((x, i) => Math.abs(x - restored[i]!))),
  };
}

export function noisyCount(values: boolean[], epsilon: number, seed: number) {
  if (!Number.isFinite(epsilon) || epsilon <= 0) throw Error("ε 必须为正。");
  const count = values.filter(Boolean).length;
  const draw = Math.max(1e-12, Math.min(1 - 1e-12, random(seed)())) - 0.5;
  const noise = (-Math.sign(draw) * Math.log1p(-2 * Math.abs(draw))) / epsilon;
  return {
    count,
    noise,
    released: count + noise,
    sensitivity: 1,
    scale: 1 / epsilon,
  };
}

export function rates(labels: boolean[], prediction: boolean[]) {
  let tp = 0,
    fp = 0,
    positives = 0,
    negatives = 0;
  labels.forEach((known, i) => {
    if (known) {
      positives++;
      if (prediction[i]) tp++;
    } else {
      negatives++;
      if (prediction[i]) fp++;
    }
  });
  return {
    selection: (tp + fp) / labels.length,
    tpr: positives ? tp / positives : null,
    fpr: negatives ? fp / negatives : null,
  };
}

export function recurrent(
  inputs: number[],
  recurrentWeight: number,
  retention: number,
) {
  let state = 0,
    cell = 0,
    gated = 0;
  const logistic = (x: number) => 1 / (1 + Math.exp(-x));
  return inputs.map((x, i) => {
    state = Math.tanh(x + recurrentWeight * state);
    // Fixed tiny scalar parameters. Changing retention affects only the forget gate.
    const inputGate = logistic(x + 0.3 * cell),
      outputGate = logistic(0.2 * x + 0.4);
    const candidate = Math.tanh(x);
    cell = retention * cell + inputGate * candidate;
    const reset = logistic(x - 0.5 * gated),
      update = logistic(0.5 * x + 0.2 * gated);
    gated =
      (1 - update) * gated +
      update * Math.tanh(x + recurrentWeight * reset * gated);
    return {
      step: i + 1,
      rnn: state,
      lstm: outputGate * Math.tanh(cell),
      gru: gated,
      cell,
      reset,
      update,
      inputGate,
      outputGate,
    };
  });
}

type Scalar = { value: number; edges: [index: number, partial: number][] };
export function autodiffPolynomial(x: number, a: number) {
  const tape: Scalar[] = [];
  const add = (value: number, edges: Scalar["edges"] = []) =>
    tape.push({ value, edges }) - 1;
  const variable = add(x),
    coefficient = add(a);
  const square = add(x * x, [
    [variable, x],
    [variable, x],
  ]);
  const scaled = add(a * x * x, [
    [coefficient, x * x],
    [square, a],
  ]);
  const result = add(a * x * x + x, [
    [scaled, 1],
    [variable, 1],
  ]);
  const gradients = tape.map(() => 0);
  gradients[result] = 1;
  for (let i = tape.length - 1; i >= 0; i--)
    for (const [input, derivative] of tape[i]!.edges)
      gradients[input]! += gradients[i]! * derivative;
  return {
    value: tape[result]!.value,
    derivative: gradients[variable]!,
    coefficient: gradients[coefficient]!,
    tape: tape.map((node, i) => ({ ...node, gradient: gradients[i] })),
  };
}

export function diffusionForward(
  original: number,
  alpha: number,
  seed: number,
) {
  const draw = random(seed);
  const noise =
    Math.sqrt(-2 * Math.log(Math.max(draw(), 1e-12))) *
    Math.cos(2 * Math.PI * draw());
  return {
    original,
    alpha,
    noise,
    result: Math.sqrt(alpha) * original + Math.sqrt(1 - alpha) * noise,
  };
}

export function variationalLoss(
  mean: number,
  logVariance: number,
  noise: number,
  target: number,
) {
  const variance = Math.exp(logVariance),
    latent = mean + Math.sqrt(variance) * noise;
  const kl = (variance + mean * mean - 1 - logVariance) / 2;
  const decoded = 0.8 * latent;
  // Gaussian decoder with unit variance, omitting the constant log(2π)/2.
  const reconstruction = (decoded - target) ** 2 / 2;
  return {
    latent,
    variance,
    decoded,
    kl,
    reconstruction,
    total: kl + reconstruction,
  };
}

export function lowRank(
  base: number[][],
  left: number[],
  right: number[],
  scale: number,
) {
  return base.map((row, i) =>
    row.map((w, j) => w + scale * left[i]! * right[j]!),
  );
}

export function banditLogits(
  rewards: number[],
  episodes: number,
  rate: number,
  seed: number,
) {
  const logits = rewards.map(() => 0),
    draw = random(seed),
    history = [];
  for (let step = 1; step <= episodes; step++) {
    const probabilities = softmax(logits);
    let n = draw(),
      action = 0;
    while (action < probabilities.length - 1 && n >= probabilities[action]!)
      n -= probabilities[action++]!;
    const reward = rewards[action]!;
    logits.forEach(
      (_, i) =>
        (logits[i]! +=
          rate * reward * (Number(i === action) - probabilities[i]!)),
    );
    history.push({
      x: step,
      y: softmax(logits).reduce((s, p, i) => s + p * rewards[i]!, 0),
    });
  }
  return { logits, probabilities: softmax(logits), history };
}

export function visionScores(offset: number, cutoff: number) {
  const a = [0, 1, 1, 0, 1, 0, 0, 0].map(Boolean);
  const scores = [0.2, 0.85, 0.75, 0.3, 0.6, 0.55, 0.24, 0.1];
  const b = scores.map((s) => s >= cutoff);
  const intersection = a.filter((x, i) => x && b[i]).length,
    union = a.filter((x, i) => x || b[i]).length;
  const overlap = Math.max(0, 3 - Math.abs(offset)) * 2;
  return {
    maskIoU: union ? intersection / union : null,
    boxIoU: overlap / (12 - overlap),
    a,
    b,
  };
}

export function bigram(corpus: string, query: string) {
  const words = corpus.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 3 || words.length > 500)
    throw Error("请输入 3–500 个由空格分开的 token。");
  const vocab = [...new Set(words)].sort();
  const transitions = new Map<string, Map<string, number>>();
  for (let i = 1; i < words.length; i++) {
    const prior = words[i - 1]!,
      next = words[i]!,
      row = transitions.get(prior) ?? new Map<string, number>();
    row.set(next, (row.get(next) ?? 0) + 1);
    transitions.set(prior, row);
  }
  const probabilities = (prior: string) => {
    const row = transitions.get(prior),
      count = [...(row?.values() ?? [])].reduce((sum, n) => sum + n, 0);
    return vocab
      .map((token) => ({
        token,
        p: ((row?.get(token) ?? 0) + 1) / (count + vocab.length),
      }))
      .sort((a, b) => b.p - a.p);
  };
  const nll =
    -words
      .slice(1)
      .reduce(
        (sum, word, i) =>
          sum +
          Math.log(
            probabilities(words[i]!).find((item) => item.token === word)!.p,
          ),
        0,
      ) /
    (words.length - 1);
  return {
    tokens: words.length,
    vocab,
    distribution: probabilities(query.trim().toLowerCase()),
    trainingPerplexity: Math.exp(nll),
  };
}

export function graphAggregate(nodes: number[], edges: [number, number][]) {
  return nodes.map((_, i) => {
    const neighborhood = [
      ...new Set([
        i,
        ...edges
          .filter((edge) => edge.includes(i))
          .map(([a, b]) => (a === i ? b : a)),
      ]),
    ];
    return (
      neighborhood.reduce((sum, j) => sum + nodes[j]!, 0) / neighborhood.length
    );
  });
}

export function trainToyGan(steps: number, rate: number) {
  let generator = -1,
    w = 0,
    b = 0;
  const s = (x: number) => 1 / (1 + Math.exp(-x));
  const losses = [];
  for (let i = 0; i < steps; i++) {
    const real = s(w * 2 + b),
      fake = s(w * generator + b);
    w -= (rate * ((real - 1) * 2 + fake * generator)) / 2;
    b -= (rate * (real - 1 + fake)) / 2;
    const judged = s(w * generator + b);
    generator -= rate * (judged - 1) * w;
    losses.push({ x: i + 1, y: generator });
  }
  return { generator, w, b, losses, estimated: s(w * generator + b) };
}
