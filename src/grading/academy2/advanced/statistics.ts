import { random } from "../data/ml-models";
import { quantile } from "../p1/statistics";

const mean = (values: number[]) =>
  values.reduce((sum, x) => sum + x, 0) / values.length;

export function bernoulliEstimate(
  success: number,
  failure: number,
  alpha: number,
  beta: number,
) {
  if (
    success < 0 ||
    failure < 0 ||
    success + failure === 0 ||
    alpha <= 1 ||
    beta <= 1
  )
    throw Error("用非空二元观察与内部众数的 Beta 先验。");
  const a = alpha + success,
    b = beta + failure;
  return {
    mle: success / (success + failure),
    map: (a - 1) / (a + b - 2),
    a,
    b,
    average: a / (a + b),
    sd: Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1))),
  };
}

export function bootstrap(data: number[], resamples: number, seed: number) {
  if (
    data.length < 2 ||
    !Number.isInteger(resamples) ||
    resamples < 2 ||
    resamples > 5000
  )
    throw Error("至少两个观测和两次重抽样。");
  const r = random(seed);
  const means = Array.from({ length: resamples }, () =>
    mean(data.map(() => data[Math.floor(data.length * r())]!)),
  ).sort((a, b) => a - b);
  const center = mean(means);
  return {
    means,
    sample: mean(data),
    low: quantile(means, 0.025),
    high: quantile(means, 0.975),
    standardError: Math.sqrt(
      means.reduce((sum, x) => sum + (x - center) ** 2, 0) / (resamples - 1),
    ),
  };
}

export function monteCarloPi(n: number, seed: number) {
  const rng = random(seed);
  const points = Array.from({ length: n }, () => {
    const x = rng(),
      y = rng();
    return { x, y, group: Number(x * x + y * y <= 1) };
  });
  const inside = points.filter((p) => p.group === 1).length,
    p = inside / n;
  return {
    value: 4 * p,
    standardError: 4 * Math.sqrt((p * (1 - p)) / n),
    points,
  };
}
export function normalChain(n: number, jump: number, seed: number) {
  if (!(jump > 0) || n < 50) throw Error("增加迭代或设置正的提议标准差。");
  const rng = random(seed);
  let x = 0,
    accepted = 0;
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(rng(), 1e-12),
      angle = 2 * Math.PI * rng();
    const next = x + jump * Math.sqrt(-2 * Math.log(a)) * Math.cos(angle);
    if (Math.log(Math.max(rng(), 1e-12)) < (x * x - next * next) / 2) {
      x = next;
      accepted++;
    }
    values.push(x);
  }
  const kept = values.slice(Math.floor(n / 5));
  const center = mean(kept);
  return {
    values,
    acceptance: accepted / n,
    mean: center,
    variance: mean(kept.map((x) => (x - center) ** 2)),
  };
}

export function markov(
  initial: number,
  enter: number,
  leave: number,
  steps: number,
) {
  const prob = [{ x: 0, y: initial }];
  for (let t = 1; t <= steps; t++) {
    const old = prob[t - 1]!.y;
    prob.push({ x: t, y: (1 - old) * enter + old * (1 - leave) });
  }
  return { prob, stationary: enter + leave ? enter / (enter + leave) : null };
}

export function forecastAR(series: number[]) {
  if (series.length < 3) throw Error("至少三期数据才能拟合 AR(1)。");
  const x = series.slice(0, -1),
    y = series.slice(1);
  const mx = mean(x),
    my = mean(y);
  const denom = x.reduce((s, v) => s + (v - mx) ** 2, 0);
  if (!denom) throw Error("滞后列恒定，斜率不可识别。");
  const phi = x.reduce((s, v, i) => s + (v - mx) * (y[i]! - my), 0) / denom;
  const intercept = my - phi * mx;
  return { phi, intercept, forecast: intercept + phi * series.at(-1)! };
}

export function kaplanMeier(observed: { time: number; event: boolean }[]) {
  const times = [...new Set(observed.map((row) => row.time))].sort(
    (a, b) => a - b,
  );
  let survival = 1,
    risk = observed.length;
  return times.map((time) => {
    const at = observed.filter((item) => item.time === time);
    const events = at.filter((item) => item.event).length;
    survival *= 1 - events / risk;
    const result = {
      time,
      risk,
      survival,
      events,
      censored: at.length - events,
    };
    risk -= at.length;
    return result;
  });
}

export function multipleTests(p: number[], alpha: number) {
  if (
    p.some((value) => value < 0 || value > 1 || !Number.isFinite(value)) ||
    alpha <= 0 ||
    alpha >= 1
  )
    throw Error("p 值和显著性水平必须有效。");
  const ordered = p
    .map((value, i) => ({ value, i }))
    .sort((a, b) => a.value - b.value);
  let largest = -1;
  ordered.forEach(({ value }, i) => {
    if (value <= (alpha * (i + 1)) / p.length) largest = i;
  });
  return {
    bonferroni: p.map((v) => v <= alpha / p.length),
    bh: p.map((_, i) =>
      ordered.slice(0, largest + 1).some((row) => row.i === i),
    ),
  };
}

export type Stratum = {
  treated: number;
  treatedEvent: number;
  controls: number;
  controlEvent: number;
  weight: number;
};
export function standardizedDifference(strata: Stratum[]) {
  const treated =
    strata.reduce((sum, row) => sum + row.treatedEvent, 0) /
    strata.reduce((sum, row) => sum + row.treated, 0);
  const controls =
    strata.reduce((sum, row) => sum + row.controlEvent, 0) /
    strata.reduce((sum, row) => sum + row.controls, 0);
  const weight = strata.reduce((sum, row) => sum + row.weight, 0);
  const adjusted =
    strata.reduce(
      (sum, row) =>
        sum +
        row.weight *
          (row.treatedEvent / row.treated - row.controlEvent / row.controls),
      0,
    ) / weight;
  return { crude: treated - controls, adjusted };
}

export function kalman(
  observations: number[],
  priorVariance: number,
  processVariance: number,
  sensorVariance: number,
) {
  if (
    ![priorVariance, processVariance, sensorVariance, ...observations].every(
      Number.isFinite,
    ) ||
    priorVariance < 0 ||
    processVariance < 0 ||
    sensorVariance <= 0
  )
    throw Error("方差应非负，观测方差须为正。");
  let mean = 0,
    variance = priorVariance;
  return observations.map((observation) => {
    const predictedVariance = variance + processVariance;
    if (!Number.isFinite(predictedVariance))
      throw Error("预测方差超出数值范围。");
    const gain =
      predictedVariance >= sensorVariance
        ? 1 / (1 + sensorVariance / predictedVariance)
        : predictedVariance /
          sensorVariance /
          (1 + predictedVariance / sensorVariance);
    mean += gain * (observation - mean);
    // P*R/(P+R) without multiplying large variances or subtracting 1-K.
    variance =
      predictedVariance >= sensorVariance
        ? sensorVariance / (1 + sensorVariance / predictedVariance)
        : predictedVariance / (1 + predictedVariance / sensorVariance);
    return { observation, mean, variance, gain };
  });
}
export function binomialTail(n: number, p: number, lower: number) {
  if (
    !Number.isSafeInteger(n) ||
    n < 0 ||
    !Number.isFinite(p) ||
    p < 0 ||
    p > 1 ||
    !Number.isFinite(lower)
  )
    throw Error("二项分布需要非负试验次数、有限阈值及 0 到 1 的成功概率。");
  if (lower <= 0) return 1;
  if (lower > n) return 0;
  if (p === 0) return 0;
  if (p === 1) return 1;
  if (lower > n - 1) return p ** n;
  // Relative mass at a mode is 1. Walk in both directions before normalizing.
  // A recurrence starting at k=0 can underflow even when the right tail is large.
  const mode = Math.min(n, Math.floor((n + 1) * p));
  let mass = 1,
    all = 1,
    tail = Number(mode >= lower);
  for (let k = mode; k > 0; k--) {
    mass *= (k / (n - k + 1)) * ((1 - p) / p);
    if (!mass) break;
    all += mass;
    if (k - 1 >= lower) tail += mass;
  }
  mass = 1;
  for (let k = mode; k < n; k++) {
    mass *= ((n - k) / (k + 1)) * (p / (1 - p));
    if (!mass) break;
    all += mass;
    if (k + 1 >= lower) tail += mass;
  }
  return Math.min(1, tail / all);
}
export function binomialPower(
  n: number,
  p0: number,
  p1: number,
  alpha: number,
) {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha >= 1)
    throw Error("显著性水平应在 [0,1) 内。");
  if (alpha === 0) {
    const threshold = p0 === 0 ? 1 : n + 1;
    return {
      threshold,
      typeOne: binomialTail(n, p0, threshold),
      power: binomialTail(n, p1, threshold),
    };
  }
  let low = 0,
    high = n + 1;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (binomialTail(n, p0, middle) > alpha) low = middle + 1;
    else high = middle;
  }
  const threshold = low;
  return {
    threshold,
    typeOne: binomialTail(n, p0, threshold),
    power: binomialTail(n, p1, threshold),
  };
}
export function expectedDecision(
  event: number,
  missCost: number,
  reviewCost: number,
) {
  const ignore = event * missCost;
  return {
    ignore,
    review: reviewCost,
    preferred:
      ignore < reviewCost ? "忽略" : ignore > reviewCost ? "复核" : "相同",
  };
}
