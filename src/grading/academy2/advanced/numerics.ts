const sum = (values: number[]) => values.reduce((a, x) => a + x, 0);
export const dot = (a: number[], b: number[]) =>
  sum(a.map((value, i) => value * b[i]!));

export function compensatedSum(values: number[]) {
  let total = 0,
    correction = 0;
  for (const value of values) {
    const next = total + value;
    correction +=
      Math.abs(total) >= Math.abs(value)
        ? total - next + value
        : value - next + total;
    total = next;
  }
  return total + correction;
}

export function plu(matrix: number[][]) {
  const n = matrix.length,
    upper = matrix.map((row) => row.slice());
  const scale = Math.max(...upper.flat().map(Math.abs));
  if (
    !n ||
    !Number.isFinite(scale) ||
    !scale ||
    upper.some((row) => row.length !== n)
  )
    throw Error("需要非零有限方阵。");
  const permutation = upper.map((_, i) => i);
  const lower = upper.map((_, i) => upper.map((_, j) => Number(i === j)));
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++)
      if (Math.abs(upper[i]![k]!) > Math.abs(upper[pivot]![k]!)) pivot = i;
    if (Math.abs(upper[pivot]![k]!) <= Number.EPSILON * n * scale)
      throw Error("矩阵奇异或近奇异。");
    [upper[k], upper[pivot]] = [upper[pivot]!, upper[k]!];
    [permutation[k], permutation[pivot]] = [
      permutation[pivot]!,
      permutation[k]!,
    ];
    for (let j = 0; j < k; j++)
      [lower[k]![j], lower[pivot]![j]] = [lower[pivot]![j]!, lower[k]![j]!];
    for (let i = k + 1; i < n; i++) {
      const multiplier = upper[i]![k]! / upper[k]![k]!;
      lower[i]![k] = multiplier;
      upper[i]![k] = 0;
      for (let j = k + 1; j < n; j++)
        upper[i]![j]! -= multiplier * upper[k]![j]!;
    }
  }
  return { lower, upper, permutation };
}

export function thinQr(matrix: number[][]) {
  const n = matrix[0]?.length ?? 0;
  if (
    !n ||
    matrix.length < n ||
    matrix.some(
      (row) => row.length !== n || row.some((v) => !Number.isFinite(v)),
    )
  )
    throw Error("需要行数不少于列数的有限矩阵。");
  const columns = matrix[0]!.map((_, j) => matrix.map((row) => row[j]!));
  const scale = Math.max(...columns.map((col) => Math.hypot(...col)));
  const basis: number[][] = [],
    r = columns.map(() => Array<number>(n).fill(0));
  for (const [i, col] of columns.entries()) {
    let v = [...col];
    for (const [j, q] of basis.entries()) {
      r[j]![i] = dot(q, v);
      v = v.map((value, k) => value - r[j]![i]! * q[k]!);
    }
    r[i]![i] = Math.hypot(...v);
    if (r[i]![i]! <= Number.EPSILON * matrix.length * scale)
      throw Error("列数值上不独立。");
    basis.push(v.map((value) => value / r[i]![i]!));
  }
  return { q: matrix.map((_, i) => basis.map((col) => col[i]!)), r };
}

export function integrate(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
) {
  if (!Number.isInteger(n) || n < 2 || n % 2)
    throw Error("Simpson 需要 >= 2 的偶数分段。");
  const h = (b - a) / n;
  let middle = 0,
    trapezoid = (f(a) + f(b)) / 2,
    simpson = f(a) + f(b);
  for (let i = 0; i < n; i++) {
    middle += f(a + (i + 0.5) * h);
    if (i > 0) {
      const value = f(a + i * h);
      trapezoid += value;
      simpson += (i % 2 ? 4 : 2) * value;
    }
  }
  return {
    midpoint: middle * h,
    trapezoid: trapezoid * h,
    simpson: (simpson * h) / 3,
  };
}

export function interpolate(x: number[], y: number[], at: number) {
  if (!x.length || x.length !== y.length || new Set(x).size !== x.length)
    throw Error("插值节点须有限且各不相同。");
  const match = x.indexOf(at);
  if (match >= 0) return y[match]!;
  const terms = x.map(
    (node, i) =>
      1 /
      x.reduce(
        (prod, other, j) => (i === j ? prod : prod * (node - other)),
        at - node,
      ),
  );
  return dot(terms, y) / sum(terms);
}

export function ode(
  f: (t: number, y: number) => number,
  y0: number,
  dt: number,
  steps: number,
  method: "euler" | "rk4",
) {
  let y = y0;
  const path = [{ x: 0, y }];
  for (let i = 0; i < steps; i++) {
    const t = i * dt,
      a = f(t, y);
    if (method === "euler") y += dt * a;
    else {
      const b = f(t + dt / 2, y + (dt * a) / 2);
      const c = f(t + dt / 2, y + (dt * b) / 2);
      const d = f(t + dt, y + dt * c);
      y += (dt * (a + 2 * b + 2 * c + d)) / 6;
    }
    path.push({ x: t + dt, y });
  }
  return path;
}

export function heat(initial: number[], cour: number, steps: number) {
  if (!initial.length || cour < 0 || cour > 0.5 || !Number.isFinite(cour))
    throw Error("显式热扩散需满足 0 ≤ αΔt/Δx² ≤ 1/2。");
  let line = initial.slice();
  for (let t = 0; t < steps; t++) {
    line = line.map(
      (center, i) =>
        (1 - 2 * cour) * center +
        cour *
          (line[(i + line.length - 1) % line.length]! +
            line[(i + 1) % line.length]!),
    );
  }
  return line;
}

export function minimizeQuartic(
  x: number,
  method: "newton" | "gradient",
  rate: number,
  steps: number,
) {
  const f = (x: number) => x ** 4 / 4 + x * x - 2 * x;
  const path = [{ x, loss: f(x) }];
  for (let i = 0; i < steps; i++) {
    const derivative = x ** 3 + 2 * x - 2;
    x -= method === "newton" ? derivative / (3 * x * x + 2) : rate * derivative;
    if (!Number.isFinite(f(x))) throw Error("迭代发散。请减小学习率。");
    path.push({ x, loss: f(x) });
  }
  return path;
}

export function constrainedSum(total: number) {
  return {
    x: total / 2,
    y: total / 2,
    multiplier: -total,
    squaredNorm: (total * total) / 2,
  };
}

export function packing(a: number, b: number, capacity: number) {
  // Teaching model: nonnegative x,y with 2x+3y<=capacity, maximizing ax+by.
  const continuous = a / 2 >= b / 3 ? [capacity / 2, 0] : [0, capacity / 3];
  let integer = [0, 0],
    objective = 0;
  for (let y = 0; y <= Math.floor(capacity / 3); y++) {
    const x = Math.floor((capacity - 3 * y) / 2);
    if (a * x + b * y > objective) {
      integer = [x, y];
      objective = a * x + b * y;
    }
  }
  return { continuous, integer, upper: dot(continuous, [a, b]), objective };
}

export function dft(values: number[]) {
  return values.map((_, k) => {
    const phase = values.map((_, j) => (-2 * Math.PI * k * j) / values.length);
    const real = dot(values, phase.map(Math.cos)),
      imag = dot(values, phase.map(Math.sin));
    return { real, imag, amplitude: Math.hypot(real, imag) };
  });
}

export function information(p: number[], q: number[]) {
  const probability = (x: number[]) =>
    x.length &&
    x.every((v) => Number.isFinite(v) && v >= 0) &&
    Math.abs(sum(x) - 1) < 1e-9;
  if (p.length !== q.length || !probability(p) || !probability(q))
    throw Error("两组概率需各自和为 1。");
  return {
    entropy: -sum(p.map((x) => (x ? x * Math.log2(x) : 0))),
    kl: sum(p.map((x, i) => (x ? x * Math.log2(x / q[i]!) : 0))),
  };
}
