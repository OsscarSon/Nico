import { choose, apply, gcd, type Matrix, type Pair } from "../../../grading/academy2/p1/math";
import {
  classifyHessian,
  eigen2,
  graphReport,
  nearLimit,
  projection,
  quadraticDescent,
  reduceRows,
  svd2,
  taylor,
  trapezoid,
  unitCircle,
} from "../../../grading/academy2/p15/math";
import { display, graphEdges, integer, numberList, toNumber } from "../p1/workbench";
import { control as f, coord, matrixRows, series, tuple, type Experiment } from "./types";

function matrix(raw: string | undefined): Matrix {
  const rows = matrixRows(raw, 2, 2);
  if (rows[0]!.length !== 2) throw Error("请输入 2×2 矩阵。");
  return [
    [rows[0]![0]!, rows[0]![1]!],
    [rows[1]![0]!, rows[1]![1]!],
  ];
}
const models = {
  square: {
    fun: (x: number) => x * x,
    derivative: (x: number) => 2 * x,
    integral: (x: number) => x ** 3 / 3,
  },
  sine: { fun: Math.sin, derivative: Math.cos, integral: (x: number) => -Math.cos(x) },
  exp: { fun: Math.exp, derivative: Math.exp, integral: Math.exp },
};
function functionModel(key: string) {
  if (key === "平方") return models.square;
  if (key === "正弦") return models.sine;
  return models.exp;
}
const graph = (label: string, points: Pair[]) => ({ label, points });
export const mathExperiments: Experiment[] = [
  {
    id: "functions",
    topic: "fm-inverse",
    title: "函数绘图与图像变换",
    objective: "改平移与尺度后比较 f(x) 与 a·f(b(x−h))+k。输入角度是弧度。",
    controls: [
      f("函数", "平方", ["平方", "正弦", "指数"]),
      f("纵向尺度 a", 2),
      f("横向系数 b", 0.5),
      f("横移 h", 1),
      f("纵移 k", -1),
    ],
    run: ([model, a, b, h, k]) => {
      const [A, B, H, K] = [a, b, h, k].map((v) => toNumber(v, -5, 5));
      if (B === 0) throw Error("横向系数不能为零。");
      const fn = functionModel(model!).fun,
        transformed = (x: number) => A! * fn(B! * (x - H!)) + K!;
      return {
        values: [
          ["f(0)", display(fn(0))],
          ["变换后 g(0)", display(transformed(0))],
          ["变换后 g(h)", display(transformed(H!))],
        ],
        curves: [
          graph("原函数", series(-2, 2, 80, fn)),
          graph("变换后", series(-2, 2, 80, transformed)),
        ],
      };
    },
  },
  {
    id: "unit-circle",
    topic: "fm-trig",
    title: "单位圆与弧度",
    objective: "比较终点坐标和角度，增加整周会回到同一位置。",
    controls: [f("角度（度）", 60)],
    run: ([raw]) => {
      const angle = toNumber(raw, -1080, 1080),
        point = unitCircle(angle);
      return {
        values: [
          ["弧度", display((angle * Math.PI) / 180)],
          ["(cos θ, sin θ)", coord(point)],
          ["平方和", display(point[0] ** 2 + point[1] ** 2)],
        ],
        curves: [
          graph(
            "单位圆",
            Array.from({ length: 81 }, (_, i) => unitCircle(i * 4.5)),
          ),
          graph("单位向量", [[0, 0], point]),
          graph("垂直投影", [point, [point[0], 0]]),
        ],
      };
    },
  },
  {
    id: "projection",
    topic: "im-projection",
    title: "向量投影与正交分解",
    objective: "调整目标方向，检查投影与残差点积是否为零。",
    controls: [f("原向量 x,y", "4,0"), f("方向 x,y", "1,1")],
    run: ([a, b]) => {
      const u = tuple(a),
        v = tuple(b),
        r = projection(u, v);
      return {
        values: [
          ["投影系数", display(r.coefficient)],
          ["投影", coord(r.point)],
          ["残差", coord(r.residual)],
          ["残差·方向", display(r.residual[0] * v[0] + r.residual[1] * v[1])],
        ],
        curves: [
          graph("原向量", [[0, 0], u]),
          graph("投影", [[0, 0], r.point]),
          graph("残差", [r.point, u]),
        ],
      };
    },
  },
  {
    id: "matrix-map",
    topic: "im-transformation",
    title: "矩阵变换与方向",
    objective: "输入 2×2 矩阵，用变换后的单位正方形观察面积及定向。",
    controls: [f("矩阵（行用分号）", "1,1;0,2")],
    run: ([raw]) => {
      const m = matrix(raw),
        square: Pair[] = [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        a = apply(m, [1, 0]),
        b = apply(m, [0, 1]);
      const area = a[0] * b[1] - a[1] * b[0];
      return {
        values: [
          ["第一列", coord(a)],
          ["第二列", coord(b)],
          ["有向面积", display(area)],
          ["面积", display(Math.abs(area))],
        ],
        curves: [
          graph("单位正方形", square),
          graph(
            "变换后的轮廓",
            square.map((point) => apply(m, point)),
          ),
        ],
      };
    },
  },
  {
    id: "elimination",
    topic: "im-systems",
    title: "Gaussian 消元与 RREF",
    objective: "对增广矩阵执行主元选择、换行、归一和消元。可用于唯一解、无穷多解和无解。",
    controls: [f("增广矩阵（行用分号）", "0,2,4;1,1,3"), f("系数列数", 2)],
    run: ([raw, count]) => {
      const rows = matrixRows(raw, 1),
        columns = integer(count, 1, 5);
      if (columns + 1 !== rows[0]!.length) throw Error("本实验最后一列为等号右侧，须比系数列多一列。");
      const r = reduceRows(rows, columns);
      return {
        values: [
          ["主元列", r.pivots.map((i) => i + 1).join(", ") || "无"],
          ["秩", r.pivots.length],
          ["解分类", r.inconsistent ? "无解" : r.pivots.length === columns ? "唯一解" : "无穷多解"],
        ],
        steps: r.stages,
      };
    },
  },
  {
    id: "eigen",
    topic: "im-eigen",
    title: "特征值与特征向量",
    objective: "比较 Av 和 λv，并试验重根及只有复数特征值的实矩阵。",
    controls: [f("矩阵（行用分号）", "3,1;1,3")],
    run: ([raw]) => {
      const m = matrix(raw),
        e = eigen2(m);
      return {
        values: e.pairs.length
          ? e.pairs.flatMap(
              ({ value, vector, dimension }, i) =>
                [
                  ["λ" + (i + 1), display(value)],
                  ["单位特征向量", coord(vector)],
                  ["Av", coord(apply(m, vector))],
                  ["特征空间维数", dimension],
                ] as [string, string | number][],
            )
          : [["复特征值", display(e.real) + " ± " + display(e.imaginary) + "i"]],
        curves: e.pairs.flatMap(({ vector }, i) => [
          graph("v" + (i + 1), [[0, 0], vector]),
          graph("Av" + (i + 1), [[0, 0], apply(m, vector)]),
        ]),
      };
    },
  },
  {
    id: "svd",
    topic: "im-svd",
    title: "SVD 分解与秩一近似",
    objective: "比较两条奇异方向、完整分解及截断误差。试验秩零与秩一矩阵。",
    controls: [f("矩阵（行用分号）", "2,1;1,2")],
    run: ([raw]) => {
      const r = svd2(matrix(raw));
      return {
        values: [
          ["σ₁", display(r.s1)],
          ["σ₂", display(r.s2)],
          ["U 的两列", coord(r.u1) + " " + coord(r.u2)],
          ["V 的两列", coord(r.v1) + " " + coord(r.v2)],
          ["秩一误差 ‖A−A₁‖F", display(r.error)],
        ],
        steps: [{ label: "秩一重建", matrix: r.rankOne }],
      };
    },
  },
  {
    id: "limit",
    topic: "im-limit",
    title: "从两侧接近极限",
    objective: "研究简化前 f(x)=(x²−a²)/(x−a)，在 x=a 处挖空；左右步长可缩小。",
    controls: [f("中心 a", 3), f("步距 h", 0.1)],
    run: ([a, h]) => {
      const center = toNumber(a, -100, 100),
        step = toNumber(h, 1e-8, 5),
        r = nearLimit(center, step);
      return {
        values: [
          ["分母为零的点", center],
          ["左侧", display(r.left)],
          ["右侧", display(r.right)],
          ["共同极限", display(r.limit)],
        ],
        curves: [
          graph(
            "定义域左侧",
            series(center - 1, center - step / 2, 40, (x) => x + center),
          ),
          graph(
            "定义域右侧",
            series(center + step / 2, center + Math.max(1, step), 40, (x) => x + center),
          ),
        ],
      };
    },
  },
  {
    id: "tangent",
    topic: "im-derivative",
    title: "割线、切线与中心差分",
    objective: "缩小步长，比较中心差商、解析导数与误差。选择非二次函数可看到误差变化。",
    controls: [f("函数", "正弦", ["平方", "正弦", "指数"]), f("切点 x", 0.5), f("步长 h", 0.2)],
    run: ([model, x, h]) => {
      const { fun, derivative } = functionModel(model!),
        a = toNumber(x, -4, 4),
        step = toNumber(h, 1e-7, 1);
      const secant = (fun(a + step) - fun(a - step)) / (2 * step),
        slope = derivative(a);
      return {
        values: [
          ["中心差分", display(secant)],
          ["切线斜率", display(slope)],
          ["绝对误差", display(Math.abs(secant - slope))],
        ],
        curves: [
          graph("原函数", series(a - 1, a + 1, 80, fun)),
          graph(
            "切线",
            series(a - 1, a + 1, 2, (y) => fun(a) + slope * (y - a)),
          ),
          graph("割线", [
            [a - step, fun(a - step)],
            [a + step, fun(a + step)],
          ]),
        ],
      };
    },
  },
  {
    id: "integral",
    topic: "im-integral",
    title: "定积分与梯形近似",
    objective: "改变分段数，核对梯形面积、精确积分和误差。有向积分允许上限小于下限。",
    controls: [f("函数", "平方", ["平方", "正弦", "指数"]), f("下限", 0), f("上限", 2), f("分段数", 8)],
    run: ([model, lo, hi, n]) => {
      const { fun, integral } = functionModel(model!),
        a = toNumber(lo, -6, 6),
        b = toNumber(hi, -6, 6),
        count = integer(n, 1, 400);
      const exact = integral(b) - integral(a),
        ap = trapezoid(fun, a, b, count);
      return {
        values: [
          ["梯形近似", display(ap)],
          ["精确值", display(exact)],
          ["绝对误差", display(Math.abs(ap - exact))],
        ],
        curves: [graph("被积函数", series(a, b, 80, fun)), graph("梯形顶部", series(a, b, count, fun))],
      };
    },
  },
  {
    id: "taylor",
    topic: "im-hessian",
    title: "Taylor 多项式与余项界",
    objective: "改变阶数和 x，比较近似、真值和 Lagrange 上界。展开中心为 0。",
    controls: [f("函数", "exp", ["exp", "sin", "cos"]), f("代入 x", 1), f("阶数", 3)],
    run: ([model, x, n]) => {
      const degree = integer(n, 0, 16),
        a = toNumber(x, -4, 4),
        kind = model as "exp" | "sin" | "cos";
      const r = taylor(a, degree, kind);
      return {
        values: [
          ["近似值", display(r.total)],
          ["真值", display(r.actual)],
          ["真实误差", display(r.error)],
          ["误差上界", display(r.bound)],
        ],
        curves: [
          graph("函数", series(-2, 2, 80, Math[kind])),
          graph(
            "近似",
            series(-2, 2, 80, (v) => taylor(v, degree, kind).total),
          ),
        ],
      };
    },
  },
  {
    id: "gradient",
    topic: "im-gradient",
    title: "梯度下降与步长",
    objective: "二次目标 a·x²+b·y² 的各轴误差可独立收缩。观察过大步长怎样振荡或发散。",
    controls: [f("起点 x,y", "2,1"), f("正曲率 a,b", "1,2"), f("步长", 0.15), f("迭代数", 12)],
    run: ([start, curvature, eta, n]) => {
      const [a, b] = tuple(curvature);
      if (Math.min(a, b) <= 0 || Math.max(a, b) > 20)
        throw Error("两个曲率系数都要大于 0 且不超过 20。");
      const step = toNumber(eta, 0, 2),
        r = quadraticDescent(tuple(start), [a, b], step, integer(n, 1, 40));
      return {
        values: [
          ["收缩步长上界（不含）", display(r.limit)],
          ["起始目标值", display(r.iterations[0]!.value)],
          ["最终目标值", display(r.iterations.at(-1)!.value)],
        ],
        curves: [
          graph(
            "目标值",
            r.iterations.map((v, i) => [i, v.value]),
          ),
        ],
      };
    },
  },
  {
    id: "hessian",
    topic: "im-hessian",
    title: "Hessian、曲率与驻点",
    objective: "对称二阶矩阵表示原点附近的二次曲率。改变交叉项，比较特征值和驻点类型。",
    controls: [f("对称 Hessian（行用分号）", "2,-4;-4,2")],
    run: ([raw]) => {
      const m = matrix(raw),
        r = classifyHessian(m),
        e = eigen2(m);
      return {
        values: [
          ["行列式", display(r.delta)],
          ["特征值", e.pairs.map((p) => display(p.value)).join(", ")],
          ["原点分类", r.label],
        ],
        curves: e.pairs.map(({ value }, i) =>
          graph(
            "方向 " + (i + 1),
            series(-1, 1, 40, (x) => (value * x * x) / 2),
          ),
        ),
      };
    },
  },
  {
    id: "discrete",
    topic: "im-graphs",
    title: "离散数学：图、组合与同余",
    objective:
      "建立无向图并求 BFS 最短路。至多 10 个顶点时枚举 Hamilton 路径。用整数参数同时观察组合计数、最大公因数和模值。",
    controls: [
      f("无向边", "A-B,B-C,A-D,D-C"),
      f("起点", "A"),
      f("终点", "C"),
      f("组合 n,k", "6,2"),
      f("Euclid 两整数", "35,12"),
    ],
    run: ([edges, a, b, counts, integers]) => {
      const r = graphReport(graphEdges(edges), a!.toUpperCase(), b!.toUpperCase());
      const [n, k] = numberList(counts, 2, 2),
        [x, y] = numberList(integers, 2, 2);
      if (![n, k, x, y].every(Number.isInteger) || n! < 0 || n! > 25 || k! < 0 || k! > n! || y === 0)
        throw Error("组合须 0≤k≤n≤25，模除数须非零整数。");
      const modulo = Math.abs(y!);
      return {
        values: [
          ["BFS 最短路径", r.path?.join(" → ") ?? "不可达"],
          ["连通", r.connected ? "是" : "否"],
          ["是不是树", r.tree ? "是" : "否"],
          ["奇度顶点", r.odd],
          ["Euler 路径", r.euler ? "存在" : "不存在"],
          [
            "Hamilton 路径",
            r.hamilton === undefined ? "顶点过多，未枚举" : (r.hamilton?.join(" → ") ?? "不存在"),
          ],
          ["组合数", choose(n!, k!)],
          ["gcd", gcd(x!, y!)],
          ["模（正模数）", ((x! % modulo) + modulo) % modulo],
        ],
      };
    },
  },
];
