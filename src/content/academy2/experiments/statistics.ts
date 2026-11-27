import { choose } from "../../../grading/academy2/p1/math";
import {
  anova,
  average,
  binomial,
  chiSquare2x2,
  describe,
  mannWhitney,
  normalTail,
  poisson,
  proportions,
  sampleVariance,
  welch,
} from "../../../grading/academy2/p1/statistics";
import {
  association,
  boxSummary,
  continuous,
  criticalValue,
  fTail,
  gammaTail,
  knownSigmaPower,
  kruskal,
  permutationDifference,
  residuals,
  sampleMeans,
  signedRanks,
  tTail,
  type Continuous,
} from "../../../grading/academy2/p15/stats";
import { display, integer, numberList, pairList, toNumber } from "../p1/workbench";
import { control as f, coord, histogram, series, type Experiment } from "./types";

function groups(text: string | undefined) {
  const parts = text?.split(/[;；]/) ?? [];
  if (parts.length < 2 || parts.length > 6) throw Error("请用分号输入 2 至 6 个组，每组至少两个数。");
  return parts.map((part) => numberList(part));
}
const extents: Record<Continuous, (a: number, b: number) => [number, number]> = {
  normal: (mean, sd) => [mean - 4 * sd, mean + 4 * sd],
  uniform: (a, b) => [a - (b - a) / 4, b + (b - a) / 4],
  exponential: (a) => [0, 6 / a],
  student: () => [-6, 6],
  chisquare: (a) => [0, a + 6 * Math.sqrt(2 * a)],
  fisher: () => [0, 12],
};
export const statExperiments: Experiment[] = [
  {
    id: "descriptive",
    topic: "fs-mean",
    title: "描述统计与异常值",
    objective: "编辑样本，比较平均、中位数和样本标准差随异常值如何变化。",
    controls: [f("样本（逗号分隔）", "2,3,4,5,6,7,12,20")],
    run: ([raw]) => {
      const vals = numberList(raw),
        r = describe(vals);
      return {
        values: [
          ["样本量", r.size],
          ["平均数", display(r.mean)],
          ["中位数", display(r.median)],
          ["众数", r.modes.join(", ")],
          ["样本标准差", display(r.sd)],
          ["经验 IQR", display(r.iqr)],
        ],
        curves: [{ label: "频数直方图", points: histogram(vals, 8), type: "bars" }],
      };
    },
  },
  {
    id: "boxplot",
    topic: "fs-quartiles",
    title: "箱线图与异常值",
    objective: "箱须止于 1.5 IQR 围栏内最远的观测，越界点单独显示。分位数采用线性插值。",
    controls: [f("样本", "1,2,3,4,5,25")],
    run: ([raw]) => {
      const r = boxSummary(numberList(raw));
      return {
        values: [
          ["Q1 / 中位数 / Q3", coord([r.q1, r.median, r.q3])],
          ["左须、右须", coord([r.left, r.right])],
          ["围栏外", r.outside.join(", ") || "无"],
        ],
        curves: [
          {
            label: "箱体",
            points: [
              [r.q1, 0],
              [r.q1, 1],
              [r.q3, 1],
              [r.q3, 0],
              [r.q1, 0],
            ],
          },
          {
            label: "中位数",
            points: [
              [r.median, 0],
              [r.median, 1],
            ],
          },
          {
            label: "箱须",
            points: [
              [r.left, 0.5],
              [r.q1, 0.5],
            ],
          },
          {
            label: "箱须",
            points: [
              [r.q3, 0.5],
              [r.right, 0.5],
            ],
          },
          { label: "越界点", points: r.outside.map((x) => [x, 0.5]), type: "dots" },
        ],
      };
    },
  },
  {
    id: "correlation",
    topic: "fs-correlation",
    title: "Pearson 与 Spearman 相关",
    objective: "改变某个点，比较线性相关和平均秩后的相关。并列值按平均秩计算。",
    controls: [f("配对（用分号分隔）", "1,1;2,4;3,9;4,16;5,25")],
    run: ([raw]) => {
      const pairs = pairList(raw),
        r = association(pairs);
      return {
        values: [
          ["Pearson r", display(r.linear?.r ?? null)],
          ["Spearman ρ", display(r.spearman)],
          ["有效对数", pairs.length],
        ],
        curves: [{ label: "配对散点", points: pairs, type: "dots" }],
      };
    },
  },
  {
    id: "pmf",
    topic: "is-binomial",
    title: "离散分布 PMF 与 CDF",
    objective:
      "按模型检查有限支持与无穷支持。图只显示前若干项，仍注明右尾质量。超几何固定 N=30，成功项 K=参数 A，抽样 n=参数 B。",
    controls: [
      f("模型", "二项", ["二项", "泊松", "几何", "超几何"]),
      f("参数 A（n、λ、p 或 K）", 10),
      f("参数 B（p 或 n，其他模型忽略）", 0.3),
      f("查询 k", 3),
    ],
    run: ([model, a, b, k]) => {
      const point = integer(k, 0, 1000);
      const start = model === "几何" ? 1 : 0;
      let end = 36,
        pmf: (i: number) => number;
      if (model === "二项") {
        end = integer(a, 1, 60);
        const p = toNumber(b, 0, 1);
        pmf = (i) => (i < 0 ? 0 : binomial(end, p, i));
      } else if (model === "泊松") {
        const rate = toNumber(a, 0.001, 50);
        end = Math.ceil(rate + 7 * Math.sqrt(rate));
        pmf = (i) => (i < 0 ? 0 : poisson(rate, i));
      } else if (model === "几何") {
        const p = toNumber(a, 0.01, 1);
        end = Math.min(100, Math.ceil(7 / p));
        pmf = (i) => (i < 1 ? 0 : (1 - p) ** (i - 1) * p);
      } else {
        const successes = integer(a, 0, 30),
          n = integer(b, 1, 30);
        end = n;
        pmf = (i) => (choose(successes, i) * choose(30 - successes, n - i)) / choose(30, n);
      }
      let total = 0;
      const cdf = Array.from({ length: end - start + 1 }, (_, i) => {
        const x = start + i;
        total += pmf(x);
        return [x, total] as const;
      });
      const at = Array.from({ length: Math.max(0, point - start + 1) }, (_, i) => pmf(i + start)).reduce(
        (acc, p) => acc + p,
        0,
      );
      return {
        values: [
          ["P(X=k)", display(pmf(point))],
          ["P(X≤k)", display(Math.min(1, at))],
          ["图右尾质量", display(Math.max(0, 1 - total))],
        ],
        curves: [
          { label: "质量 PMF", points: cdf.map(([x]) => [x, pmf(x)]), type: "bars" },
          { label: "累计概率 CDF", points: cdf, step: true },
        ],
      };
    },
  },
  {
    id: "pdf",
    topic: "is-variable",
    title: "连续 PDF 与 CDF",
    objective:
      "比较正态、均匀、指数、Student t、卡方及 F。在图中密度高度与累计概率使用同一数轴，但量纲不同。",
    controls: [
      f("模型", "normal", ["normal", "uniform", "exponential", "student", "chisquare", "fisher"]),
      f("参数 A（μ、下限、λ 或 df₁）", 0),
      f("参数 B（σ、上限或 df₂）", 1),
      f("查询 x", 1),
    ],
    run: ([model, x, y, target]) => {
      const kind = model as Continuous;
      const a = toNumber(x, -50, 50),
        b = toNumber(y, -50, 100),
        p = toNumber(target, -1e3, 1e3);
      if (
        (kind === "uniform" && b <= a) ||
        (kind === "normal" && b <= 0) ||
        (["exponential", "student", "chisquare", "fisher"].includes(kind) && a <= 0) ||
        (kind === "fisher" && b <= 0)
      )
        throw Error("区间上限须大于下限，标准差、速率与自由度须为正。");
      const [lo, hi] = extents[kind](a, b);
      const [pdf, cdf] = continuous(kind, p, a, b);
      const start = (kind === "chisquare" || kind === "fisher") && a < 2 && lo === 0 ? hi / 5000 : lo;
      return {
        values: [
          ["密度 f(x)", Number.isFinite(pdf) ? display(pdf) : "趋于无穷"],
          ["累计 F(x)", display(cdf)],
          ["P(X>x)", display(1 - cdf)],
        ],
        curves: [
          { label: "PDF", points: series(start, hi, 85, (v) => continuous(kind, v, a, b)[0]) },
          { label: "CDF", points: series(lo, hi, 85, (v) => continuous(kind, v, a, b)[1]) },
        ],
      };
    },
  },
  {
    id: "clt",
    topic: "is-clt",
    title: "CLT 与重复抽样",
    objective: "从较偏的指数或伯努利总体抽样，对照样本均值分布和理论标准误。相同种子可复现。",
    controls: [
      f("总体", "exponential", ["exponential", "bernoulli", "uniform"]),
      f("每组样本量", 20),
      f("重复组数", 600),
      f("随机种子", 2027),
    ],
    run: ([model, n, rounds, seed]) => {
      const r = sampleMeans(
        model as "exponential" | "bernoulli" | "uniform",
        integer(n, 1, 500),
        integer(rounds, 20, 2000),
        integer(seed, 0, 4294967295),
      );
      return {
        values: [
          ["实际均值", display(r.mean)],
          ["理论均值", display(r.expected)],
          ["模拟标准误", display(r.sd)],
          ["理论标准误", display(r.se)],
        ],
        curves: [{ label: "样本均值频数", points: histogram(r.means, 18), type: "bars" }],
      };
    },
  },
  {
    id: "confidence",
    topic: "is-ci",
    title: "t 置信区间",
    objective: "用原始独立样本、自由度及置信水平计算均值区间。覆盖率指反复使用程序的频率。",
    controls: [f("样本", "9,13,11,10,14,12"), f("置信水平（0.70–0.999）", 0.95)],
    run: ([raw, c]) => {
      const vals = numberList(raw),
        confidence = toNumber(c, 0.7, 0.999),
        avg = average(vals),
        df = vals.length - 1;
      const se = Math.sqrt(sampleVariance(vals) / vals.length);
      if (!se) throw Error("样本标准差为零，当前 t 区间模型不适用。");
      const critical = criticalValue((t) => tTail(t, df), (1 - confidence) / 2),
        lo = avg - critical * se,
        hi = avg + critical * se;
      return {
        values: [
          ["样本均值", display(avg)],
          ["标准误", display(se)],
          ["临界值", display(critical)],
          ["置信区间", coord([lo, hi])],
        ],
        curves: [
          {
            label: "均值区间",
            points: [
              [lo, 0],
              [hi, 0],
            ],
          },
          { label: "均值", points: [[avg, 0]], type: "dots" },
        ],
      };
    },
  },
  {
    id: "testing",
    topic: "is-ttest",
    title: "Welch、单样本与配对 t 检验",
    objective: "选择研究设计和双侧或右侧备择。配对输入两个等长数组，逐项 B−A。单样本用 B 对假设均值。",
    controls: [
      f("设计", "Welch", ["Welch", "单样本", "配对"]),
      f("A 样本", "8,9,11,12,13"),
      f("B 样本", "10,12,11,15,18"),
      f("参考均值（仅单样本）", 10),
      f("方向", "双侧", ["双侧", "右侧"]),
      f("显著水平", 0.05),
    ],
    run: ([model, a, b, mu, side, alpha]) => {
      const second = numberList(b),
        level = toNumber(alpha, 0.001, 0.25);
      let stats: { t: number; df: number } | null;
      if (model === "Welch") stats = welch(numberList(a), second);
      else {
        const first = model === "配对" ? numberList(a) : [];
        if (model === "配对" && first.length !== second.length) throw Error("配对数据长度必须一致。");
        const sample = model === "配对" ? second.map((v, i) => v - first[i]!) : second;
        const ref = model === "配对" ? 0 : toNumber(mu),
          se = Math.sqrt(sampleVariance(sample) / sample.length);
        stats = se ? { t: (average(sample) - ref) / se, df: sample.length - 1 } : null;
      }
      if (!stats) throw Error("样本标准误为零，无法使用该检验。");
      const p = side === "双侧" ? 2 * tTail(Math.abs(stats.t), stats.df) : tTail(stats.t, stats.df);
      return {
        values: [
          ["统计量 t", display(stats.t)],
          ["自由度", display(stats.df)],
          ["p 值", display(p)],
          ["统计决策", p <= level ? "拒绝 H₀" : "未拒绝 H₀"],
        ],
      };
    },
  },
  {
    id: "rejection",
    topic: "is-pvalue",
    title: "拒绝域与显著水平",
    objective: "在标准正态零分布上标出由 α 决定的拒绝域和观察统计量。双侧分别占 α/2。",
    controls: [f("显著水平", 0.05), f("备择", "双侧", ["双侧", "右侧", "左侧"]), f("观察 Z", 2.1)],
    run: ([raw, side, observed]) => {
      const alpha = toNumber(raw, 0.001, 0.25),
        z = toNumber(observed, -8, 8),
        c = criticalValue(normalTail, alpha / (side === "双侧" ? 2 : 1));
      const p = side === "双侧" ? 2 * normalTail(Math.abs(z)) : normalTail(side === "左侧" ? -z : z);
      const density = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
      const tails =
        side === "双侧"
          ? [
              [-8, -c],
              [c, 8],
            ]
          : side === "左侧"
            ? [[-8, -c]]
            : [[c, 8]];
      return {
        values: [
          ["临界绝对值", display(c)],
          ["p 值", display(p)],
          ["观测在拒绝域", p <= alpha ? "是" : "否"],
        ],
        curves: [
          { label: "标准正态密度", points: series(-8, 8, 120, density) },
          ...tails.map(([a, b]) => ({ label: "拒绝域", points: series(a!, b!, 30, density) })),
          {
            label: "观测 Z",
            points: [
              [z, 0],
              [z, density(z)],
            ],
          },
        ],
      };
    },
  },
  {
    id: "power",
    topic: "is-testing",
    title: "Z 检验力与最小效果",
    objective: "设总体标准差已知，改变样本量、显著水平和真均值变化，比较第一、二类错误。",
    controls: [
      f("真实差值", 0.5),
      f("样本量", 30),
      f("总体标准差", 1),
      f("显著水平", 0.05),
      f("方向", "双侧", ["双侧", "右侧"]),
    ],
    run: ([delta, n, s, a, side]) => {
      const effect = toNumber(delta, -10, 10),
        size = integer(n, 2, 1000),
        sd = toNumber(s, 0.001, 100),
        alpha = toNumber(a, 0.001, 0.25),
        mode = side === "双侧" ? "two" : "greater";
      const r = knownSigmaPower(effect, size, sd, alpha, mode),
        radius = Math.max(Math.abs(effect), (sd * 4) / Math.sqrt(size));
      return {
        values: [
          ["临界值", display(r.threshold)],
          ["检验力", display(r.power)],
          ["第二类错误率", display(1 - r.power)],
        ],
        curves: [
          {
            label: "真实效应与检验力",
            points: series(-radius, radius, 80, (x) => knownSigmaPower(x, size, sd, alpha, mode).power),
          },
        ],
      };
    },
  },
  {
    id: "residuals",
    topic: "is-regression",
    title: "线性回归残差诊断",
    objective: "查看残差对拟合值的图。加入弯曲趋势或极端值，观察拟合诊断与决定系数是否一致。",
    controls: [f("x,y 数据对", "0,1;1,3;2,4;3,9;4,8")],
    run: ([raw]) => {
      const r = residuals(pairList(raw)),
        x = r.points.map(([fit]) => fit);
      return {
        values: [
          ["斜率", display(r.slope)],
          ["截距", display(r.intercept)],
          ["R²", display(r.r === null ? null : r.r ** 2)],
          ["残差平方和", display(r.sse)],
          ["残差标准误", display(r.sd)],
        ],
        curves: [
          { label: "残差（拟合值，实际减拟合）", points: r.points, type: "dots" },
          {
            label: "零参照线",
            points: [
              [Math.min(...x), 0],
              [Math.max(...x), 0],
            ],
          },
        ],
      };
    },
  },
  {
    id: "anova",
    topic: "is-anova",
    title: "ANOVA 分析表与组间比较",
    objective: "分解总平方和和自由度，并计算 F 的上尾概率。所用经典模型假设独立、正态及等方差。",
    controls: [f("各组，以分号分隔", "1,2,3,4;3,5,4,6;5,6,6,7")],
    run: ([raw]) => {
      const g = groups(raw),
        r = anova(g),
        a = g.length - 1,
        b = g.flat().length - g.length;
      if (r.f === null) throw Error("组内均方为零，需要重新核对模型。");
      return {
        values: [
          ["组间 SS / df / MS", coord([r.between, a, r.between / a])],
          ["组内 SS / df / MS", coord([r.within, b, r.within / b])],
          ["总 SS / df", coord([r.between + r.within, a + b])],
          ["F", display(r.f)],
          ["上尾 p", display(fTail(r.f, a, b))],
        ],
        curves: [{ label: "组均值", points: g.map((v, i) => [i + 1, average(v)]), type: "bars" }],
      };
    },
  },
  {
    id: "rank",
    topic: "is-nonparametric",
    title: "非参数秩与置换检验",
    objective:
      "对全部输入组做带并列校正的 Kruskal–Wallis，对头两组做 U 和双侧均值差置换。另用给定配对差比较 Wilcoxon，假设每个非零差的符号在零假设下独立等可能。",
    controls: [
      f("独立组", "1,2,3;3,4,6;6,8,9"),
      f("置换次数", 800),
      f("种子", 73),
      f("Wilcoxon 配对差（另一组数据）", "-1,2,3,-4"),
    ],
    run: ([raw, n, s, paired]) => {
      const signed = signedRanks(numberList(paired, 2, 18));
      const g = groups(raw),
        r = kruskal(g),
        p = permutationDifference(g[0]!, g[1]!, integer(n, 99, 4000), integer(s, 0, 4294967295));
      return {
        values: [
          ["Kruskal–Wallis H", display(r.statistic)],
          ["H 的渐近 p", display(r.p)],
          ["前两组 U₁", display(mannWhitney(g[0]!, g[1]!))],
          ["前两组均值差", display(p.observed)],
          ["Monte Carlo 置换 p", display(p.p)],
          ["Wilcoxon W", display(signed.statistic)],
          ["Wilcoxon 双侧条件 p", display(signed.p)],
        ],
        curves: [{ label: "置换零分布", points: histogram(p.values, 16), type: "bars" }],
      };
    },
  },
  {
    id: "ab",
    topic: "is-ztest",
    title: "A/B Test 效应与区间",
    objective:
      "输入独立随机单位的成功总数，用合并 Z 检验和未合并 Wald 区间分别回答两个问题。小计数暂停近似。",
    controls: [
      f("A 总量", 400),
      f("A 成功", 80),
      f("B 总量", 400),
      f("B 成功", 100),
      f("实际门槛（比例）", 0.01),
    ],
    run: ([na, xa, nb, xb, threshold]) => {
      const r = proportions(
        integer(na, 1, 1e6),
        integer(xa, 0, 1e6),
        integer(nb, 1, 1e6),
        integer(xb, 0, 1e6),
      );
      if (!r) throw Error("成功数不得超过本组总量。");
      const gate = toNumber(threshold, 0, 1);
      return {
        values: [
          ["A / B", coord([r.a, r.b])],
          ["差值（百分点）", display(r.difference * 100)],
          ["双侧 p", display(r.p)],
          [
            "95% 区间（百分点）",
            r.ci ? coord(r.ci.map((v) => v * 100)) : "计数不足，建议精确或随机化方法",
          ],
          ["区间下界高于门槛", r.ci ? (r.ci[0] > gate ? "是" : "否") : "无法判断"],
        ],
      };
    },
  },
  {
    id: "chi-square",
    topic: "is-chisquare",
    title: "卡方独立性检验",
    objective: "更改 2×2 表，比较观察与独立假设的期望。期望不足 5 暂不输出近似 p。",
    controls: [f("第一行", "30,20"), f("第二行", "20,30")],
    run: ([a, b]) => {
      const observed = [...numberList(a, 2, 2), ...numberList(b, 2, 2)];
      if (observed.some((x) => x < 0 || !Number.isInteger(x))) throw Error("频数须为非负整数。");
      const result = chiSquare2x2(observed as [number, number, number, number]);
      if (!result) throw Error("各行各列边缘频数必须为正。");
      return {
        values: [
          ["期望频数", coord(result.expected)],
          ["Pearson χ²", display(result.stat)],
          ["自由度", 1],
          [
            "渐近 p",
            result.expected.every((x) => x >= 5)
              ? display(gammaTail(0.5, result.stat / 2))
              : "期待计数不足，考虑 Fisher 精确检验",
          ],
        ],
      };
    },
  },
];
