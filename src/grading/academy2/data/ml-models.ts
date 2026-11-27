export type Vector = number[];
export type Sample = { x: Vector; y: number };
export type ModelKind =
  | "linear"
  | "ridge"
  | "logistic"
  | "knn"
  | "bayes"
  | "tree"
  | "forest"
  | "svm"
  | "boosting"
  | "neural"
  | "kmeans"
  | "hierarchy"
  | "dbscan";
export type Hyper = {
  epochs: number;
  rate: number;
  lambda: number;
  k: number;
  depth: number;
  seed: number;
  epsilon: number;
};
export type Fitted = {
  predict: (x: Vector) => number;
  losses: number[];
  details: string;
  weights?: number[];
};
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function shuffle<T>(xs: readonly T[], rand: () => number) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
export const dot = (a: Vector, b: Vector) =>
  a.reduce((total, value, i) => total + value * b[i]!, 0);
export const distance = (a: Vector, b: Vector) =>
  a.reduce((total, value, i) => total + (value - b[i]!) ** 2, 0);
const mean = (samples: Sample[]) =>
  samples.reduce((sum, row) => sum + row.y, 0) / samples.length;
const clamp = (x: number) => Math.max(1e-9, Math.min(1 - 1e-9, x));
export const logLoss = (y: number, score: number) =>
  -(y * Math.log(clamp(score)) + (1 - y) * Math.log(1 - clamp(score)));

function gradient(kind: ModelKind, train: Sample[], h: Hyper): Fitted {
  const weights = new Array<number>(train[0]!.x.length).fill(0),
    losses: number[] = [];
  let bias = 0;
  const score = (x: Vector) => dot(weights, x) + bias;
  const predict = (x: Vector) => {
    const result = score(x);
    return kind === "logistic" || kind === "svm" ? sigmoid(result) : result;
  };
  const penalty = kind === "linear" ? 0 : h.lambda;
  for (let epoch = 0; epoch < h.epochs; epoch++) {
    const deltas = weights.map((w) => penalty * w);
    let shift = 0,
      error = 0;
    for (const { x, y } of train) {
      const s = score(x),
        p = predict(x),
        sign = y ? 1 : -1;
      const step =
        kind === "svm"
          ? sign * s < 1
            ? -sign
            : 0
          : kind === "logistic"
            ? p - y
            : 2 * (p - y);
      error +=
        kind === "svm"
          ? Math.max(1 - sign * s, 0)
          : kind === "logistic"
            ? logLoss(y, p)
            : (p - y) ** 2;
      shift += step;
      for (const [j, value] of x.entries())
        deltas[j]! += (step * value) / train.length;
    }
    losses.push(error / train.length + (penalty * dot(weights, weights)) / 2);
    for (let j = 0; j < weights.length; j++) weights[j]! -= h.rate * deltas[j]!;
    bias -= (h.rate * shift) / train.length;
    if (
      weights.some((value) => !Number.isFinite(value)) ||
      !Number.isFinite(bias) ||
      !Number.isFinite(losses.at(-1))
    )
      throw Error("优化发散。尝试降低学习率或标准化输入。");
  }
  return {
    predict,
    losses,
    weights: [bias, ...weights],
    details:
      kind === "svm"
        ? "线性 hinge loss；把间隔映射成排序分数，概率未校准。"
        : kind === "logistic"
          ? "批量交叉熵梯度和 L2 惩罚。"
          : "批量均方误差梯度。偏置不参加惩罚。",
  };
}
function knn(train: Sample[], h: Hyper): Fitted {
  const count = Math.min(h.k, train.length);
  return {
    predict: (x) =>
      train
        .map((row) => ({ d: distance(row.x, x), y: row.y }))
        .sort((a, b) => a.d - b.d)
        .slice(0, count)
        .reduce((total, row) => total + row.y, 0) / count,
    losses: [],
    details: "欧氏距离对所有训练点排序。输出邻居标签的平均。",
  };
}
function bayes(train: Sample[]): Fitted {
  const classes = [0, 1].map((label) => {
    const rows = train.filter((row) => row.y === label);
    if (!rows.length) throw Error("训练集必须包含正负两类。");
    const center = rows[0]!.x.map(
      (_, j) => rows.reduce((sum, row) => sum + row.x[j]!, 0) / rows.length,
    );
    const variance = center.map((m, j) =>
      Math.max(
        1e-6,
        rows.reduce((sum, row) => sum + (row.x[j]! - m) ** 2, 0) / rows.length,
      ),
    );
    return { prior: Math.log(rows.length / train.length), center, variance };
  });
  return {
    predict: (x) => {
      const log = classes.map((c) =>
        x.reduce(
          (total, value, i) =>
            total -
            0.5 *
              (Math.log(2 * Math.PI * c.variance[i]!) +
                (value - c.center[i]!) ** 2 / c.variance[i]!),
          c.prior,
        ),
      );
      return sigmoid(log[1]! - log[0]!);
    },
    losses: [],
    details: "类条件高斯与独立性假设。每个类的方差下限为 10⁻⁶。",
  };
}
type Tree =
  { value: number } | { feature: number; cut: number; left: Tree; right: Tree };
function tree(
  rows: Sample[],
  depth: number,
  rand?: () => number,
  randomSubset = false,
): Tree {
  const average = mean(rows),
    total = rows.length,
    width = rows[0]!.x.length;
  if (
    depth <= 0 ||
    rows.length < 4 ||
    rows.every((row) => row.y === rows[0]!.y)
  )
    return { value: average };
  const features = Array.from({ length: width }, (_, i) => i);
  const selected = randomSubset
    ? shuffle(features, rand!).slice(
        0,
        Math.max(1, Math.floor(Math.sqrt(width))),
      )
    : features;
  const sum = average * total,
    squares = rows.reduce((a, b) => a + b.y ** 2, 0);
  let best = squares - sum ** 2 / total,
    choice: { feature: number; cut: number } | undefined;
  for (const feature of selected) {
    const sorted = [...rows].sort((a, b) => a.x[feature]! - b.x[feature]!);
    let part = 0;
    for (let i = 0; i < total - 1; i++) {
      part += sorted[i]!.y;
      const x = sorted[i]!.x[feature]!,
        next = sorted[i + 1]!.x[feature]!;
      if (x === next) continue;
      const loss =
        squares - part ** 2 / (i + 1) - (sum - part) ** 2 / (total - i - 1);
      if (loss < best - 1e-10) {
        best = loss;
        choice = { feature, cut: x + (next - x) / 2 };
      }
    }
  }
  if (!choice) return { value: average };
  const { feature, cut } = choice;
  return {
    feature,
    cut,
    left: tree(
      rows.filter((row) => row.x[feature]! <= cut),
      depth - 1,
      rand,
      randomSubset,
    ),
    right: tree(
      rows.filter((row) => row.x[feature]! > cut),
      depth - 1,
      rand,
      randomSubset,
    ),
  };
}
function predictTree(root: Tree, x: Vector): number {
  return "value" in root
    ? root.value
    : predictTree(x[root.feature]! <= root.cut ? root.left : root.right, x);
}
function ensemble(kind: ModelKind, train: Sample[], h: Hyper): Fitted {
  const rand = random(h.seed),
    losses: number[] = [],
    roots: Tree[] = [];
  if (kind === "forest" || kind === "tree") {
    const count = kind === "tree" ? 1 : Math.min(h.epochs, 40);
    for (let i = 0; i < count; i++) {
      const sample =
        kind === "tree"
          ? train
          : train.map(() => train[Math.floor(rand() * train.length)]!);
      roots.push(tree(sample, h.depth, rand, kind === "forest"));
    }
    return {
      predict: (x) =>
        roots.reduce((sum, root) => sum + predictTree(root, x), 0) /
        roots.length,
      losses,
      details:
        kind === "tree"
          ? "叶子返回正类比率。二元标签下平方误差分裂与 Gini 分裂给出相同排序。"
          : "自助采样，每个结点随机抽取部分特征，平均各树的正类叶比例。树数 " +
            count,
    };
  }
  const origin = Math.log(clamp(mean(train)) / (1 - clamp(mean(train))));
  const scores = train.map(() => origin),
    rounds = Math.min(h.epochs, 50);
  for (let round = 0; round < rounds; round++) {
    const residuals = train.map(({ x, y }, i) => ({
      x,
      y: y - sigmoid(scores[i]!),
    }));
    const root = tree(residuals, Math.min(h.depth, 3));
    roots.push(root);
    train.forEach(({ x }, i) => {
      scores[i]! += h.rate * predictTree(root, x);
    });
    losses.push(
      train.reduce(
        (total, row, i) => total + logLoss(row.y, sigmoid(scores[i]!)),
        0,
      ) / train.length,
    );
  }
  return {
    predict: (x) =>
      sigmoid(
        roots.reduce((s, root) => s + h.rate * predictTree(root, x), origin),
      ),
    losses,
    details: "二分类梯度提升。树拟合 log-loss 的负梯度，每轮缩减步长。",
  };
}
function neural(train: Sample[], h: Hyper): Fitted {
  const d = train[0]!.x.length,
    m = Math.min(h.k, 12),
    rand = random(h.seed),
    losses: number[] = [];
  const input = Array.from({ length: m }, () =>
    Array.from({ length: d }, () => (0.8 * (rand() - 0.5)) / Math.sqrt(d)),
  );
  const hiddenBias = Array<number>(m).fill(0);
  const output = Array.from(
    { length: m },
    () => (0.8 * (rand() - 0.5)) / Math.sqrt(m),
  );
  let bias = 0;
  const forward = (x: Vector) =>
    input.map((w, j) => Math.tanh(dot(w, x) + hiddenBias[j]!));
  const predict = (x: Vector) => sigmoid(dot(output, forward(x)) + bias);
  for (let epoch = 0; epoch < h.epochs; epoch++) {
    const gx = input.map((row) => row.map((w) => h.lambda * w)),
      gb = hiddenBias.map(() => 0),
      gw = output.map((w) => h.lambda * w);
    let gbOut = 0,
      total = 0;
    for (const { x, y } of train) {
      const hidden = forward(x),
        p = sigmoid(dot(output, hidden) + bias),
        error = p - y;
      gbOut += error / train.length;
      total += logLoss(y, p);
      for (let j = 0; j < m; j++) {
        const gradient =
          (error * output[j]! * (1 - hidden[j]! ** 2)) / train.length;
        gb[j]! += gradient;
        gw[j]! += (error * hidden[j]!) / train.length;
        for (let k = 0; k < d; k++) gx[j]![k]! += gradient * x[k]!;
      }
    }
    losses.push(
      total / train.length +
        (h.lambda *
          (dot(output, output) +
            input.reduce((total, w) => total + dot(w, w), 0))) /
          2,
    );
    for (let j = 0; j < m; j++) {
      output[j]! -= h.rate * gw[j]!;
      hiddenBias[j]! -= h.rate * gb[j]!;
      for (let k = 0; k < d; k++) input[j]![k]! -= h.rate * gx[j]![k]!;
    }
    bias -= h.rate * gbOut;
  }
  return {
    predict,
    losses,
    details:
      "单隐藏层 tanh，输出 sigmoid。全部梯度由链式法则逐层计算。隐藏单元 " + m,
  };
}
export function fit(kind: ModelKind, train: Sample[], h: Hyper): Fitted {
  if (!train.length) throw Error("缺少训练记录。");
  switch (kind) {
    case "linear":
    case "ridge":
    case "logistic":
    case "svm":
      return gradient(kind, train, h);
    case "knn":
      return knn(train, h);
    case "bayes":
      return bayes(train);
    case "tree":
    case "forest":
    case "boosting":
      return ensemble(kind, train, h);
    case "neural":
      return neural(train, h);
    default:
      throw Error("请选择监督学习模型。");
  }
}

export type Clusters = { labels: number[]; losses: number[]; details: string };
function nearest(x: Vector, centers: Vector[]) {
  let index = 0,
    best = Infinity;
  centers.forEach((center, j) => {
    const dist = distance(x, center);
    if (dist < best) {
      best = dist;
      index = j;
    }
  });
  return index;
}
function kmeans(rows: Vector[], h: Hyper): Clusters {
  let centers = shuffle(rows, random(h.seed))
    .slice(0, Math.min(rows.length, h.k))
    .map((x) => [...x]);
  let labels = rows.map((x) => nearest(x, centers));
  const losses: number[] = [];
  for (let i = 0; i < h.epochs; i++) {
    const sums = centers.map((row) => row.map(() => 0)),
      counts = centers.map(() => 0);
    rows.forEach((row, index) => {
      const label = labels[index]!;
      counts[label]!++;
      row.forEach((value, j) => {
        sums[label]![j]! += value;
      });
    });
    centers = sums.map((row, j) =>
      counts[j] ? row.map((value) => value / counts[j]!) : centers[j]!,
    );
    const next = rows.map((row) => nearest(row, centers));
    losses.push(
      rows.reduce((sum, row, j) => sum + distance(row, centers[next[j]!]!), 0),
    );
    const stable = labels.every((label, j) => label === next[j]);
    labels = next;
    if (stable) break;
  }
  return {
    labels,
    losses,
    details:
      "Lloyd 迭代。空簇保留旧中心。曲线记录簇内平方距离，可能收敛到局部最优。",
  };
}
function hierarchical(rows: Vector[], h: Hyper): Clusters {
  if (rows.length > 180) throw Error("凝聚聚类最多 180 行。");
  const groups = rows.map((_, i) => [i]),
    measures = rows.map((a) => rows.map((b) => Math.sqrt(distance(a, b)))),
    losses: number[] = [];
  while (groups.length > Math.min(h.k, rows.length)) {
    let a = 0,
      b = 1,
      best = Infinity;
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        const g = groups[i]!,
          r = groups[j]!;
        const dist =
          g.reduce(
            (total, u) =>
              total + r.reduce((sum, v) => sum + measures[u]![v]!, 0),
            0,
          ) /
          (g.length * r.length);
        if (dist < best) {
          a = i;
          b = j;
          best = dist;
        }
      }
    groups[a]!.push(...groups[b]!);
    groups.splice(b, 1);
    losses.push(best);
  }
  const labels = rows.map(() => -1);
  groups.forEach((group, i) =>
    group.forEach((row) => {
      labels[row] = i;
    }),
  );
  return {
    labels,
    losses,
    details: "凝聚层次聚类使用平均连接。曲线记录每轮合并距离。",
  };
}
function dbscan(rows: Vector[], h: Hyper): Clusters {
  const neighborhoods = rows.map((a) =>
    rows.flatMap((b, i) => (distance(a, b) <= h.epsilon ** 2 ? [i] : [])),
  );
  const marked = new Set<number>(),
    labels = rows.map(() => -1);
  let active = 0;
  for (let i = 0; i < rows.length; i++) {
    if (marked.has(i)) continue;
    marked.add(i);
    if (neighborhoods[i]!.length < h.k) continue;
    const queue = [...neighborhoods[i]!],
      seen = new Set(queue);
    for (let j = 0; j < queue.length; j++) {
      const next = queue[j]!;
      if (!marked.has(next)) {
        marked.add(next);
        const neighbors = neighborhoods[next]!;
        if (neighbors.length >= h.k)
          for (const n of neighbors)
            if (!seen.has(n)) {
              seen.add(n);
              queue.push(n);
            }
      }
      if (labels[next] === -1) labels[next] = active;
    }
    active++;
  }
  return {
    labels,
    losses: [],
    details: "邻域包含样本自身，−1 表示噪声。边界点按照首次到达归属。",
  };
}
export function cluster(kind: ModelKind, rows: Vector[], h: Hyper): Clusters {
  if (!rows.length) throw Error("缺少可聚类的记录。");
  if (kind === "kmeans") return kmeans(rows, h);
  if (kind === "hierarchy") return hierarchical(rows, h);
  if (kind === "dbscan") return dbscan(rows, h);
  throw Error("请选择聚类算法。");
}
