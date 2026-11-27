import { average, normalTail, quantile, regression, sampleVariance } from "../p1/statistics";
import type { Pair } from "../p1/math";

export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function ranks(values: readonly number[]) {
  const sorted = values.map((value, i) => ({ value, i })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  let sumTies = 0;
  for (let i = 0; i < sorted.length; ) {
    let end = i + 1;
    while (end < sorted.length && sorted[end]!.value === sorted[i]!.value) end++;
    for (let j = i; j < end; j++) result[sorted[j]!.i] = (i + 1 + end) / 2;
    const ties = end - i;
    sumTies += ties ** 3 - ties;
    i = end;
  }
  return { result, sumTies };
}
export function association(pairs: Pair[]) {
  const x = ranks(pairs.map((p) => p[0])).result;
  const y = ranks(pairs.map((p) => p[1])).result;
  const linear = regression(pairs);
  return { linear, spearman: regression(x.map((v, i) => [v, y[i]!] as Pair))?.r ?? null };
}
export function boxSummary(values: number[]) {
  const q1 = quantile(values, 0.25),
    median = quantile(values, 0.5),
    q3 = quantile(values, 0.75);
  const low = q1 - 1.5 * (q3 - q1),
    high = q3 + 1.5 * (q3 - q1);
  const inside = values.filter((value) => value >= low && value <= high);
  return {
    q1,
    median,
    q3,
    left: Math.min(...inside),
    right: Math.max(...inside),
    outside: values.filter((value) => value < low || value > high),
  };
}

const lanczos = [
  676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905,
  -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
];
export function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  const t = x + 7.5;
  const sum = lanczos.reduce((s, c, i) => s + c / (x + i + 1), 0.99999999999980993);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
}
const tiny = 1e-300;
const away = (n: number) => (Math.abs(n) < tiny ? Math.sign(n || 1) * tiny : n);
function betaFraction(x: number, a: number, b: number) {
  let c = 1,
    d = 1 / away(1 - ((a + b) * x) / (a + 1)),
    h = d;
  for (let m = 1; m < 200; m++) {
    const twice = 2 * m;
    for (const term of [
      (m * (b - m) * x) / ((a + twice - 1) * (a + twice)),
      (-(a + m) * (a + b + m) * x) / ((a + twice) * (a + twice + 1)),
    ]) {
      d = 1 / away(1 + term * d);
      c = away(1 + term / c);
      h *= d * c;
    }
    if (Math.abs(d * c - 1) < 1e-13) return h;
  }
  return h;
}
export function betaRegular(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - betaRegular(1 - x, b, a);
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x),
  );
  return (front * betaFraction(x, a, b)) / a;
}
export function gammaTail(a: number, x: number) {
  if (x <= 0) return 1;
  const start = Math.exp(a * Math.log(x) - x - logGamma(a));
  if (x < a + 1) {
    let term = 1 / a,
      total = term;
    for (let i = 1; i < 1000; i++) {
      term *= x / (a + i);
      total += term;
      if (Math.abs(term) < Math.abs(total) * 1e-14) break;
    }
    return Math.max(0, 1 - start * total);
  }
  let b = x + 1 - a,
    c = 1 / tiny,
    d = 1 / away(b),
    h = d;
  for (let i = 1; i < 1000; i++) {
    const term = -i * (i - a);
    b += 2;
    d = 1 / away(term * d + b);
    c = away(b + term / c);
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.max(0, Math.min(1, start * h));
}
export const tTail = (t: number, df: number) =>
  t >= 0
    ? 0.5 * betaRegular(df / (df + t * t), df / 2, 0.5)
    : 1 - 0.5 * betaRegular(df / (df + t * t), df / 2, 0.5);
export const fTail = (f: number, a: number, b: number) =>
  f <= 0 ? 1 : betaRegular(b / (b + a * f), b / 2, a / 2);
export function criticalValue(tail: (z: number) => number, p: number) {
  let end = 1;
  while (tail(end) > p && end < 1e8) end *= 2;
  let start = 0;
  for (let i = 0; i < 80; i++) {
    const middle = (start + end) / 2;
    if (tail(middle) > p) start = middle;
    else end = middle;
  }
  return (start + end) / 2;
}

export type Continuous = "normal" | "uniform" | "exponential" | "student" | "chisquare" | "fisher";
export function continuous(kind: Continuous, x: number, a: number, b: number): Pair {
  switch (kind) {
    case "normal": {
      const z = (x - a) / b;
      return [Math.exp((-z * z) / 2) / (Math.sqrt(2 * Math.PI) * b), 1 - normalTail(z)];
    }
    case "uniform":
      return [x >= a && x <= b ? 1 / (b - a) : 0, Math.min(1, Math.max(0, (x - a) / (b - a)))];
    case "exponential":
      return x < 0 ? [0, 0] : [a * Math.exp(-a * x), -Math.expm1(-a * x)];
    case "student":
      return [
        Math.exp(
          logGamma((a + 1) / 2) -
            logGamma(a / 2) -
            0.5 * Math.log(a * Math.PI) -
            ((a + 1) / 2) * Math.log1p((x * x) / a),
        ),
        1 - tTail(x, a),
      ];
    case "chisquare":
      return x <= 0
        ? [x === 0 ? (a < 2 ? Infinity : a === 2 ? 0.5 : 0) : 0, 0]
        : [
            Math.exp((a / 2 - 1) * Math.log(x) - x / 2 - logGamma(a / 2) - (a / 2) * Math.log(2)),
            1 - gammaTail(a / 2, x / 2),
          ];
    case "fisher":
      return x <= 0
        ? [x === 0 ? (a < 2 ? Infinity : a === 2 ? 1 : 0) : 0, 0]
        : [
            Math.exp(
              (a / 2) * Math.log(a / b) +
                (a / 2 - 1) * Math.log(x) -
                ((a + b) / 2) * Math.log1p((a * x) / b) -
                logGamma(a / 2) -
                logGamma(b / 2) +
                logGamma((a + b) / 2),
            ),
            1 - fTail(x, a, b),
          ];
  }
}
export function sampleMeans(
  model: "bernoulli" | "exponential" | "uniform",
  n: number,
  rounds: number,
  seed: number,
) {
  const random = seeded(seed);
  const assumptions = {
    bernoulli: { sample: () => Number(random() < 0.25), mean: 0.25, variance: 0.1875 },
    exponential: { sample: () => -Math.log1p(-random()), mean: 1, variance: 1 },
    uniform: { sample: random, mean: 0.5, variance: 1 / 12 },
  }[model];
  const means = Array.from({ length: rounds }, () =>
    average(Array.from({ length: n }, assumptions.sample)),
  );
  return {
    means,
    mean: average(means),
    expected: assumptions.mean,
    sd: Math.sqrt(sampleVariance(means)),
    se: Math.sqrt(assumptions.variance / n),
  };
}
export function knownSigmaPower(
  effect: number,
  n: number,
  sigma: number,
  alpha: number,
  sided: "two" | "greater",
) {
  const threshold = criticalValue((z) => normalTail(z), sided === "two" ? alpha / 2 : alpha);
  const signal = (effect * Math.sqrt(n)) / sigma;
  return {
    threshold,
    power: normalTail(threshold - signal) + (sided === "two" ? normalTail(threshold + signal) : 0),
  };
}
export function permutationDifference(a: number[], b: number[], trials: number, seed: number) {
  const all = [...a, ...b],
    observed = average(a) - average(b),
    random = seeded(seed);
  let extreme = 0;
  const values = Array.from({ length: trials }, () => {
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    const delta = average(shuffled.slice(0, a.length)) - average(shuffled.slice(a.length));
    if (Math.abs(delta) >= Math.abs(observed) - 1e-12) extreme++;
    return delta;
  });
  return { observed, values, p: (extreme + 1) / (trials + 1) };
}
export function kruskal(groups: number[][]) {
  const flat = groups.flat(),
    { result, sumTies } = ranks(flat),
    n = flat.length;
  let position = 0;
  const sums = groups.map((group) => {
    const start = position;
    position += group.length;
    return result.slice(start, position).reduce((s, x) => s + x, 0);
  });
  const correction = 1 - sumTies / (n ** 3 - n);
  if (correction <= 0) throw Error("数据全部相同，秩检验无定义。");
  const statistic = Math.max(
    0,
    ((12 * sums.reduce((s, value, i) => s + value ** 2 / groups[i]!.length, 0)) / (n * (n + 1)) -
      3 * (n + 1)) /
      correction,
  );
  return { statistic, df: groups.length - 1, p: gammaTail((groups.length - 1) / 2, statistic / 2) };
}
export function residuals(pairs: Pair[]) {
  const fit = regression(pairs);
  if (!fit) throw Error("预测量必须有变化。");
  const points = pairs.map(([x, y]) => {
    const predicted = fit.intercept! + fit.slope! * x;
    return [predicted, y - predicted] as Pair;
  });
  const sse = points.reduce((s, point) => s + point[1] ** 2, 0);
  return { ...fit, points, sse, sd: pairs.length > 2 ? Math.sqrt(sse / (pairs.length - 2)) : null };
}

export function signedRanks(differences: number[]) {
  const retained = differences.filter((value) => value !== 0);
  if (retained.length < 2 || retained.length > 18)
    throw Error("Wilcoxon 模型需要 2 至 18 个非零配对差。");
  const weights = ranks(retained.map((value) => Math.abs(value))).result;
  const positive = weights.reduce((total, rank, i) => total + (retained[i]! > 0 ? rank : 0), 0);
  const total = weights.reduce((s, rank) => s + rank, 0),
    statistic = Math.min(positive, total - positive);
  let atLeast = 0;
  for (let mask = 0; mask < 2 ** weights.length; mask++) {
    const sum = weights.reduce((value, rank, i) => value + (mask & (1 << i) ? rank : 0), 0);
    if (Math.min(sum, total - sum) <= statistic) atLeast++;
  }
  return { positive, negative: total - positive, statistic, p: atLeast / 2 ** weights.length };
}
