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
    scores.some((x) => !Number.isFinite(x))
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
    predictions.some((x) => !Number.isFinite(x))
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
export function eigenvectors(rows: Vector[], rank: number) {
  const d = rows[0]!.length,
    mean = rows[0]!.map(
      (_, i) => rows.reduce((sum, row) => sum + row[i]!, 0) / rows.length,
    );
  const centered = rows.map((row) => row.map((value, i) => value - mean[i]!));
  const cov = mean.map((_, i) =>
    mean.map(
      (_, j) =>
        centered.reduce((sum, row) => sum + row[i]! * row[j]!, 0) /
        Math.max(1, rows.length - 1),
    ),
  );
  const basis: Vector[] = [],
    variances: number[] = [];
  const euclid = (xs: Vector) => Math.hypot(...xs);
  const mul = (v: Vector) =>
    cov.map((row) => row.reduce((total, w, j) => total + w * v[j]!, 0));
  const orthogonal = (value: Vector) => {
    let next = [...value];
    for (const vector of basis) {
      const factor = next.reduce((total, x, i) => total + x * vector[i]!, 0);
      next = next.map((x, i) => x - factor * vector[i]!);
    }
    return next;
  };
  for (let k = 0; k < Math.min(rank, d); k++) {
    // Start power iteration from every axis and keep the largest Rayleigh quotient.
    // This avoids a single initialization exactly orthogonal to the leading eigenspace.
    let best = -Infinity,
      chosen: Vector | undefined;
    for (let axis = 0; axis < d; axis++) {
      let vector = orthogonal(mean.map((_, i) => Number(i === axis)));
      const startNorm = euclid(vector);
      if (startNorm < 1e-10) continue;
      vector = vector.map((x) => x / startNorm);
      for (let step = 0; step < 55; step++) {
        const next = orthogonal(mul(vector)),
          norm = euclid(next);
        if (norm < 1e-14) break;
        vector = next.map((x) => x / norm);
      }
      const eigen = mul(vector).reduce((sum, x, i) => sum + x * vector[i]!, 0);
      if (eigen > best) {
        best = eigen;
        chosen = vector;
      }
    }
    if (chosen) {
      basis.push(chosen);
      variances.push(Math.max(0, best));
    }
  }
  return {
    mean,
    basis,
    variances,
    project: (row: Vector) =>
      basis.map((vector) =>
        row.reduce((sum, x, i) => sum + (x - mean[i]!) * vector[i]!, 0),
      ),
  };
}
