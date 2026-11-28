import type { Vector } from "./ml-models";

export function classification(
  labels: number[],
  scores: number[],
  threshold = 0.5,
) {
  if (
    !labels.length ||
    labels.length !== scores.length ||
    labels.some((x) => x !== 0 && x !== 1) ||
    scores.some((x) => !Number.isFinite(x)) ||
    !Number.isFinite(threshold)
  )
    throw Error("分类评估需要对齐的二元标签和有限分数。");
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  labels.forEach((label, i) => {
    const positive = scores[i]! >= threshold;
    if (label === 1) {
      if (positive) tp++;
      else fn++;
    } else if (positive) fp++;
    else tn++;
  });
  const ratio = (a: number, b: number) => (b ? a / b : null);
  const precision = ratio(tp, tp + fp),
    recall = ratio(tp, tp + fn),
    f1 = ratio(2 * tp, 2 * tp + fp + fn);
  const nPos = tp + fn,
    nNeg = tn + fp;
  const sorted = scores
    .map((score, i) => ({ score, label: labels[i]! }))
    .sort((a, b) => b.score - a.score);
  const roc: [number, number][] = [[0, 0]];
  let pos = 0,
    neg = 0,
    auc: number | null = nPos && nNeg ? 0 : null;
  if (auc !== null) {
    for (let i = 0; i < sorted.length;) {
      const score = sorted[i]!.score;
      do {
        if (sorted[i]!.label) pos++;
        else neg++;
        i++;
      } while (i < sorted.length && sorted[i]!.score === score);
      const prev = roc.at(-1)!,
        next: [number, number] = [neg / nNeg, pos / nPos];
      auc += ((next[0] - prev[0]) * (next[1] + prev[1])) / 2;
      roc.push(next);
    }
  }
  return {
    tp,
    tn,
    fp,
    fn,
    accuracy: (tp + tn) / labels.length,
    precision,
    recall,
    f1,
    auc,
    roc: auc === null ? [] : roc,
  };
}

export function regression(labels: number[], predictions: number[]) {
  if (
    labels.length !== predictions.length ||
    !labels.length ||
    predictions.some((x) => !Number.isFinite(x)) ||
    labels.some((x) => !Number.isFinite(x))
  )
    throw Error("回归评估需要对齐的有限预测。");
  const avg = labels.reduce((a, b) => a + b, 0) / labels.length,
    residuals = labels.map((y, i) => y - predictions[i]!);
  const mae = residuals.reduce((a, b) => a + Math.abs(b), 0) / labels.length;
  const mse = residuals.reduce((a, b) => a + b * b, 0) / labels.length;
  const total = labels.reduce((a, b) => a + (b - avg) ** 2, 0);
  return {
    mae,
    mse,
    rmse: Math.sqrt(mse),
    r2: total > 0 ? 1 - (mse * labels.length) / total : null,
    residuals,
  };
}
/** Orthogonal plane rotations for the small, real symmetric covariance in this lab. */
export function eigenvectors(rows: Vector[], rank: number) {
  const dimension = rows[0]?.length ?? 0;
  if (
    !dimension ||
    !Number.isInteger(rank) ||
    rank < 0 ||
    rows.some(
      (row) => row.length !== dimension || row.some((x) => !Number.isFinite(x)),
    )
  )
    throw Error("PCA 需要规则的有限数据矩阵与非负整数分量数。");
  const mean = rows[0]!.map(
    (_, i) => rows.reduce((sum, row) => sum + row[i]!, 0) / rows.length,
  );
  const centered = rows.map((row) => row.map((value, i) => value - mean[i]!));
  const covariance = mean.map((_, i) =>
    mean.map(
      (_, j) =>
        centered.reduce((sum, row) => sum + row[i]! * row[j]!, 0) /
        Math.max(1, rows.length - 1),
    ),
  );
  const scale = Math.max(...covariance.flat().map(Math.abs));
  if (!Number.isFinite(scale))
    throw Error("PCA 协方差超出数值范围，请缩放输入。");
  const vectors = mean.map((_, i) => mean.map((_, j) => Number(i === j)));
  if (scale) {
    const matrix = covariance.map((row) => row.map((x) => x / scale));
    for (let rotation = 0; rotation < 32 * dimension * dimension; rotation++) {
      let p = 0,
        q = 0,
        magnitude = 0;
      for (let i = 0; i < dimension; i++)
        for (let j = i + 1; j < dimension; j++) {
          const off = Math.abs(matrix[i]![j]!);
          if (off > magnitude) {
            p = i;
            q = j;
            magnitude = off;
          }
        }
      if (magnitude <= Number.EPSILON) break;
      const off = matrix[p]![q]!;
      const tau = (matrix[q]![q]! - matrix[p]![p]!) / (2 * off);
      const tangent = (tau < 0 ? -1 : 1) / (Math.abs(tau) + Math.hypot(1, tau));
      const cosine = 1 / Math.hypot(1, tangent),
        sine = tangent * cosine;
      matrix[p]![p]! -= tangent * off;
      matrix[q]![q]! += tangent * off;
      matrix[p]![q] = matrix[q]![p] = 0;
      for (let i = 0; i < dimension; i++) {
        if (i !== p && i !== q) {
          const a = matrix[i]![p]!,
            b = matrix[i]![q]!;
          matrix[i]![p] = matrix[p]![i] = cosine * a - sine * b;
          matrix[i]![q] = matrix[q]![i] = sine * a + cosine * b;
        }
        const left = vectors[i]![p]!,
          right = vectors[i]![q]!;
        vectors[i]![p] = cosine * left - sine * right;
        vectors[i]![q] = sine * left + cosine * right;
      }
    }
    matrix.forEach((row, i) => {
      covariance[i]![i] = row[i]! * scale;
    });
  }
  const order = covariance
    .map((row, i) => ({ index: i, variance: Math.max(0, row[i]!) }))
    .sort((a, b) => b.variance - a.variance)
    .slice(0, rank);
  const basis = order.map(({ index }) => vectors.map((row) => row[index]!));
  return {
    mean,
    basis,
    variances: order.map(({ variance }) => variance),
    project: (row: Vector) =>
      basis.map((vector) =>
        row.reduce((sum, x, i) => sum + (x - mean[i]!) * vector[i]!, 0),
      ),
  };
}
