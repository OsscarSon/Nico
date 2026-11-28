import {
  distance,
  dot,
  type Hyper,
  type Sample,
  type Vector,
} from "./ml-models";

export function argmax(values: Vector) {
  return values.reduce(
    (best, value, i) => (value > values[best]! ? i : best),
    0,
  );
}

function softmaxParts(logits: Vector) {
  if (!logits.length || logits.some((value) => !Number.isFinite(value)))
    throw Error("Softmax 需要有限的类别分数。");
  const largest = Math.max(...logits);
  const shifted = logits.map((value) => value - largest);
  const exponentials = shifted.map(Math.exp);
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return {
    shifted,
    denominator,
    probabilities: exponentials.map((value) => value / denominator),
  };
}

export const softmax = (logits: Vector) => softmaxParts(logits).probabilities;

export function softmaxObjective(
  samples: Sample[],
  weights: Vector[],
  lambda: number,
) {
  const gradient = weights.map((row) =>
    row.map((weight, j) => (j === 0 ? 0 : lambda * weight)),
  );
  let loss =
    (weights.reduce((sum, row) => sum + dot(row.slice(1), row.slice(1)), 0) *
      lambda) /
    2;
  for (const { x, y } of samples) {
    const design = [1, ...x];
    const { shifted, denominator, probabilities } = softmaxParts(
      weights.map((row) => dot(row, design)),
    );
    loss += (Math.log(denominator) - shifted[y]!) / samples.length;
    for (const [label, probability] of probabilities.entries()) {
      const delta = (probability - Number(label === y)) / samples.length;
      for (const [j, value] of design.entries())
        gradient[label]![j]! += delta * value;
    }
  }
  return { loss, gradient };
}

export function trainMulticlass(
  kind: "softmax" | "knn",
  samples: Sample[],
  classes: number,
  h: Hyper,
) {
  if (kind === "knn") {
    const k = Math.min(h.k, samples.length);
    return {
      probabilities: (x: Vector) => {
        const votes = Array<number>(classes).fill(0);
        const neighbors = samples
          .map((row) => ({ label: row.y, distance: distance(x, row.x) }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, k);
        for (const { label } of neighbors) votes[label]! += 1;
        return votes.map((votes) => votes / k);
      },
      weights: undefined,
      losses: [],
      details: "K 近邻用类别票数占比预测。等票按类别字典顺序决定。",
    };
  }
  let weights = Array.from({ length: classes }, () =>
    Array<number>(samples[0]!.x.length + 1).fill(0),
  );
  const losses: number[] = [];
  for (let epoch = 0; epoch < h.epochs; epoch++) {
    const step = softmaxObjective(samples, weights, h.lambda);
    if (!Number.isFinite(step.loss))
      throw Error("优化发散。请降低学习率或标准化特征。");
    losses.push(step.loss);
    weights = weights.map((row, label) =>
      row.map((value, j) => value - h.rate * step.gradient[label]![j]!),
    );
  }
  if (weights.some((row) => row.some((value) => !Number.isFinite(value))))
    throw Error("优化发散。请降低学习率或标准化特征。");
  return {
    losses,
    weights: weights.flat(),
    probabilities: (x: Vector) =>
      softmax(weights.map((row) => dot(row, [1, ...x]))),
    details:
      "多项逻辑回归。用最大值平移计算 Softmax，在对数域计算交叉熵。L2 惩罚不作用于偏置。",
  };
}

export function multiclassMetrics(
  actual: number[],
  predicted: number[],
  labels: string[],
) {
  const size = labels.length;
  const validLabel = (i: number) => Number.isInteger(i) && i >= 0 && i < size;
  if (
    !actual.length ||
    actual.length !== predicted.length ||
    size < 2 ||
    new Set(labels).size !== size ||
    !actual.every(validLabel) ||
    !predicted.every(validLabel)
  )
    throw Error("多类别评估需要对齐的有效标签。");
  const matrix = Array.from({ length: size }, () =>
    Array<number>(size).fill(0),
  );
  actual.forEach((label, i) => matrix[label]![predicted[i]!]!++);
  const perClass = matrix.map((row, i) => {
    const support = row.reduce((sum, count) => sum + count, 0);
    const predictedCount = matrix.reduce((sum, other) => sum + other[i]!, 0);
    const hits = row[i]!;
    return {
      label: labels[i]!,
      support,
      hits,
      precision: predictedCount ? hits / predictedCount : 0,
      recall: support ? hits / support : 0,
      f1:
        support + predictedCount ? (2 * hits) / (support + predictedCount) : 0,
    };
  });
  const accuracy =
    perClass.reduce((sum, item) => sum + item.hits, 0) / actual.length;
  return {
    kind: "multiclass" as const,
    accuracy,
    matrix,
    perClass,
    macroF1: perClass.reduce((sum, item) => sum + item.f1, 0) / size,
    microF1: accuracy, // Each record produces exactly one class prediction.
    weightedF1:
      perClass.reduce((sum, item) => sum + item.f1 * item.support, 0) /
      actual.length,
  };
}
