import { determinant, shortestPath, type Matrix, type Pair } from "../p1/math";

export function reduceRows(input: number[][], coefficientColumns: number) {
  if (!input.length || input.some((row) => row.length !== input[0]!.length))
    throw Error("矩阵各行必须等宽。");
  const a = input.map((row) => [...row]),
    pivots: number[] = [];
  const stages: { label: string; matrix: number[][] }[] = [
    { label: "原始矩阵", matrix: input.map((row) => [...row]) },
  ];
  const save = (label: string) =>
    stages.push({
      label,
      matrix: a.map((row) => row.map((value) => (Math.abs(value) < 1e-11 ? 0 : value))),
    });
  for (let col = 0, row = 0; col < coefficientColumns && row < a.length; col++) {
    let pivot = row;
    for (let i = row + 1; i < a.length; i++)
      if (Math.abs(a[i]![col]!) > Math.abs(a[pivot]![col]!)) pivot = i;
    const scale = Math.abs(a[pivot]![col]!);
    if (scale < 1e-10) continue;
    if (pivot !== row) {
      [a[pivot], a[row]] = [a[row]!, a[pivot]!];
      save("交换 R" + (pivot + 1) + " 与 R" + (row + 1));
    }
    const divisor = a[row]![col]!;
    if (divisor !== 1) {
      a[row] = a[row]!.map((value) => value / divisor);
      save("归一化 R" + (row + 1) + " 的主元");
    }
    for (let i = 0; i < a.length; i++) {
      const factor = a[i]![col]!;
      if (i === row || Math.abs(factor) < 1e-11) continue;
      a[i] = a[i]!.map((value, j) => value - factor * a[row]![j]!);
      save("消去 R" + (i + 1) + " 第 " + (col + 1) + " 列");
    }
    pivots.push(col);
    row++;
  }
  return {
    pivots,
    stages,
    matrix: stages.at(-1)!.matrix,
    inconsistent: a.some(
      (row) =>
        row.slice(0, coefficientColumns).every((value) => Math.abs(value) < 1e-10) &&
        row.slice(coefficientColumns).some((value) => Math.abs(value) >= 1e-10),
    ),
  };
}

export function unitCircle(degrees: number): Pair {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
}
export function projection(from: Pair, onto: Pair) {
  const square = onto[0] ** 2 + onto[1] ** 2;
  if (square === 0) throw Error("投影方向不能是零向量。");
  const coefficient = (from[0] * onto[0] + from[1] * onto[1]) / square;
  const point: Pair = [onto[0] * coefficient, onto[1] * coefficient];
  const residual: Pair = [from[0] - point[0], from[1] - point[1]];
  return { coefficient, point, residual };
}
const normalized = (x: number, y: number): Pair =>
  x || y ? [x / Math.hypot(x, y), y / Math.hypot(x, y)] : [1, 0];
const perpendicular = ([x, y]: Pair): Pair => [-y, x];
export function eigen2(matrix: Matrix) {
  const [[a, b], [c, d]] = matrix;
  const middle = (a + d) / 2;
  const discriminant = ((a - d) / 2) ** 2 + b * c;
  if (discriminant < 0) return { real: middle, imaginary: Math.sqrt(-discriminant), pairs: [] };
  const eigenvalues =
    discriminant === 0 ? [middle] : [middle + Math.sqrt(discriminant), middle - Math.sqrt(discriminant)];
  const pairs = eigenvalues.map((value) => {
    const row1: Pair = [a - value, b],
      row2: Pair = [c, d - value];
    const row = Math.hypot(...row1) >= Math.hypot(...row2) ? row1 : row2;
    const all = row.every((x) => x === 0);
    return {
      value,
      vector: all ? ([1, 0] as Pair) : normalized(-row[1], row[0]),
      dimension: all ? 2 : 1,
    };
  });
  return { real: middle, imaginary: 0, pairs };
}
export function svd2(matrix: Matrix) {
  const [[a, b], [c, d]] = matrix;
  const angle = 0.5 * Math.atan2(2 * (a * b + c * d), a * a + c * c - b * b - d * d);
  const v1: Pair = [Math.cos(angle), Math.sin(angle)],
    v2 = perpendicular(v1);
  const left = (v: Pair): Pair => [a * v[0] + b * v[1], c * v[0] + d * v[1]];
  const av1 = left(v1),
    s1 = Math.hypot(...av1);
  const s2 = s1 === 0 ? 0 : Math.abs(determinant(matrix)) / s1;
  const u1 = normalized(...av1),
    orthogonal = perpendicular(u1);
  const sign = determinant(matrix) < 0 ? -1 : 1;
  const u2: Pair = [sign * orthogonal[0], sign * orthogonal[1]];
  const rankOne = [
    [s1 * u1[0] * v1[0], s1 * u1[0] * v1[1]],
    [s1 * u1[1] * v1[0], s1 * u1[1] * v1[1]],
  ];
  const error = Math.hypot(
    ...matrix.flatMap((row, i) => row.map((value, j) => value - rankOne[i]![j]!)),
  );
  return { s1, s2, u1, u2, v1, v2, rankOne, error };
}
export function nearLimit(a: number, h: number) {
  return { left: 2 * a - h, right: 2 * a + h, limit: 2 * a };
}
export function trapezoid(f: (x: number) => number, a: number, b: number, n: number) {
  if (!Number.isInteger(n) || n < 1 || n > 5000) throw Error("分段数须在 1 到 5000。");
  const h = (b - a) / n;
  let total = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) total += f(a + i * h);
  return h * total;
}
export function taylor(x: number, degree: number, model: "exp" | "sin" | "cos") {
  let term = 1,
    total = model === "sin" ? 0 : 1;
  for (let k = 1; k <= degree; k++) {
    term *= x / k;
    if (model === "exp") total += term;
    else if (model === "sin" && k % 2 === 1) total += (-1) ** ((k - 1) / 2) * term;
    else if (model === "cos" && k % 2 === 0) total += (-1) ** (k / 2) * term;
  }
  const actual = Math[model](x);
  const next = Math.abs((term * x) / (degree + 1));
  return {
    total,
    actual,
    error: Math.abs(total - actual),
    bound: next * (model === "exp" ? Math.exp(Math.max(0, x)) : 1),
  };
}
export function quadraticDescent([x, y]: Pair, [a, b]: Pair, step: number, n: number) {
  const iterations = [{ x, y, value: a * x * x + b * y * y }];
  for (let i = 0; i < n; i++) {
    x *= 1 - 2 * a * step;
    y *= 1 - 2 * b * step;
    iterations.push({ x, y, value: a * x * x + b * y * y });
  }
  return { iterations, limit: 1 / Math.max(a, b) };
}
export function classifyHessian(h: Matrix) {
  if (h[0][1] !== h[1][0]) throw Error("本实验假定二阶偏导连续，Hessian 必须对称。");
  const delta = determinant(h);
  return {
    delta,
    label: delta < 0 ? "鞍点" : delta === 0 ? "二阶判别无结论" : h[0][0] > 0 ? "局部极小" : "局部极大",
  };
}
export function graphReport(edges: readonly (readonly [string, string])[], a: string, b: string) {
  const unique = new Map(edges.map(([x, y]) => [[x, y].sort().join("-"), [x, y] as const]));
  const degree = new Map<string, number>();
  for (const [x, y] of unique.values()) {
    degree.set(x, (degree.get(x) ?? 0) + 1);
    degree.set(y, (degree.get(y) ?? 0) + 1);
  }
  if (!degree.has(a) || !degree.has(b)) throw Error("起点、终点必须出现在图中。");
  const all = [...degree.keys()],
    edgeList = [...unique.values()];
  const connected = all.every((node) => shortestPath(edgeList, a, node) !== null);
  const odd = [...degree.values()].filter((d) => d % 2 !== 0).length;
  function walk(path: string[]): string[] | null {
    if (path.length === all.length) return path;
    const final = path.at(-1);
    const neighbors = edgeList.flatMap(([x, y]) => (x === final ? [y] : y === final ? [x] : []));
    for (const neighbor of neighbors)
      if (!path.includes(neighbor)) {
        const found = walk([...path, neighbor]);
        if (found) return found;
      }
    return null;
  }
  let hamilton: string[] | null | undefined;
  if (all.length <= 10) {
    hamilton = null;
    for (const start of all) {
      hamilton = walk([start]);
      if (hamilton) break;
    }
  }
  return {
    path: shortestPath(edgeList, a, b),
    connected,
    odd,
    tree: connected && unique.size === all.length - 1,
    euler: connected && (odd === 0 || odd === 2),
    hamilton,
  };
}
