import type { LabArea } from "../../../content/academy2/advanced/registry";
import {
  compensatedSum,
  constrainedSum,
  dft,
  heat,
  information,
  integrate,
  interpolate,
  minimizeQuartic,
  ode,
  packing,
  plu,
  thinQr,
} from "./numerics";
import {
  bernoulliEstimate,
  binomialPower,
  expectedDecision,
  kalman,
  bootstrap,
  forecastAR,
  kaplanMeier,
  markov,
  monteCarloPi,
  multipleTests,
  normalChain,
  standardizedDifference,
} from "./statistics";
import { emit, fold, interpret, parse, run, scan } from "./compiler";
import {
  errorBudget,
  databaseSnapshot,
  indexedRange,
  lamport,
  lru,
  partitionVote,
  workload,
  routeService,
  replicaCommit,
  transactionDecision,
  distribute,
  recover,
  roundRobin,
  waitCycle,
  windows,
} from "./systems";
import {
  attention,
  recurrent,
  autodiffPolynomial,
  diffusionForward,
  variationalLoss,
  lowRank,
  banditLogits,
  conv2d,
  decoderBlock,
  nearestEmbedding,
  noisyCount,
  quantize,
  rates,
  trainCorridor,
  visionScores,
  bigram,
  graphAggregate,
  trainToyGan,
} from "./learning";
import { eigenvectors } from "../data/ml-metrics";
import { fit } from "../data/ml-models";
import { initialOptions } from "../data/ml";
import { grouped, parseCSV, profile } from "../data/table";

type Control = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
};
const control = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  initial: number,
): Control => ({ key, label, min, max, step, initial });
export type LabOutput = {
  metrics: [label: string, value: number | string | null][];
  trace: unknown;
  points?: { x: number; y: number; group?: number }[];
};
export type LabDefinition = {
  area: LabArea;
  title: string;
  objective: string;
  kind: "计算" | "模拟";
  controls: Control[];
  text?: { label: string; initial: string };
  run: (values: Record<string, number>, text: string) => LabOutput;
};
const math = (
  title: string,
  objective: string,
  controls: Control[],
  run: LabDefinition["run"],
): LabDefinition => ({
  area: "math",
  title,
  objective,
  kind: "计算",
  controls,
  run,
});
const stats = (
  title: string,
  objective: string,
  controls: Control[],
  run: LabDefinition["run"],
): LabDefinition => ({
  area: "statistics",
  title,
  objective,
  kind: "计算",
  controls,
  run,
});
const studio = (
  area: LabArea,
  title: string,
  objective: string,
  kind: LabDefinition["kind"],
  controls: Control[],
  run: LabDefinition["run"],
  text?: LabDefinition["text"],
): LabDefinition => ({ area, title, objective, kind, controls, run, text });
const f = (x: number) => Math.exp(x);
const stable: Control[] = [control("large", "大分量的指数", 8, 20, 1, 16)];
export const labs: Record<string, LabDefinition> = {
  precision: math(
    "浮点抵消与补偿求和",
    "提高大分量的数量级，比较表示误差如何吞掉一个增量。",
    stable,
    ({ large = 16 }) => {
      const data = [10 ** large, 1, -(10 ** large)],
        naive = data.reduce((a, b) => a + b, 0),
        corrected = compensatedSum(data);
      return {
        metrics: [
          ["普通求和", naive],
          ["补偿求和", corrected],
          ["绝对误差", Math.abs(naive - 1)],
        ],
        trace: data,
      };
    },
  ),
  factorizations: math(
    "主元和矩阵分解",
    "修改左上角近零主元，对照置换、三角阵、正交基与重构误差。",
    [control("leading", "左上角", 0, 0.5, 0.05, 0)],
    ({ leading = 0 }) => {
      const matrix = [
          [leading, 2],
          [1, 3],
        ],
        lu = plu(matrix),
        qr = thinQr(matrix);
      const delta = matrix.flatMap((row, i) =>
        row.map((_, j) => {
          const product = lu.lower[i]!.reduce(
            (sum, l, k) => sum + l * lu.upper[k]![j]!,
            0,
          );
          return Math.abs(product - matrix[lu.permutation[i]!]![j]!);
        }),
      );
      return {
        metrics: [
          ["置换顺序", lu.permutation.join(", ")],
          ["LU 重构最大误差", Math.max(...delta)],
          [
            "R 的对角项",
            qr.r.map((row, i) => row[i]!.toPrecision(5)).join(", "),
          ],
        ],
        trace: { matrix, lu, qr },
      };
    },
  ),
  integrate: math(
    "三种积分规则",
    "增加区间数，比较对 exp(x) 的三种误差。准确值为 e−1。",
    [control("segments", "分段数", 2, 40, 2, 4)],
    ({ segments = 4 }) => {
      const approx = integrate(f, 0, 1, segments),
        exact = Math.E - 1;
      const points = Array.from({ length: segments + 1 }, (_, i) => ({
        x: i / segments,
        y: f(i / segments),
      }));
      return {
        metrics: [
          ["中点误差", Math.abs(approx.midpoint - exact)],
          ["梯形误差", Math.abs(approx.trapezoid - exact)],
          ["Simpson 误差", Math.abs(approx.simpson - exact)],
        ],
        trace: { exact, approx },
        points,
      };
    },
  ),
  interpolate: math(
    "重心插值",
    "移动查询点并比较插值结果和真实二次函数。",
    [control("point", "查询点", -1, 3, 0.25, 0.5)],
    ({ point = 0.5 }) => {
      const x = [0, 1, 2],
        y = [1, 2, 5],
        predicted = interpolate(x, y, point);
      return {
        metrics: [
          ["插值", predicted],
          ["真实值", point ** 2 + 1],
        ],
        trace: { x, y, point, predicted },
        points: Array.from({ length: 17 }, (_, i) => ({
          x: i / 4 - 1,
          y: interpolate(x, y, i / 4 - 1),
        })),
      };
    },
  ),
  ode: math(
    "Euler 和 RK4 误差",
    "针对 y′=−2y 改变步数。比较归一终点 1 的误差。",
    [control("steps", "步数", 2, 40, 1, 5)],
    ({ steps = 5 }) => {
      const e = ode((_, y) => -2 * y, 1, 1 / steps, steps, "euler"),
        r = ode((_, y) => -2 * y, 1, 1 / steps, steps, "rk4"),
        exact = Math.exp(-2);
      return {
        metrics: [
          ["Euler 终点误差", Math.abs(e.at(-1)!.y - exact)],
          ["RK4 终点误差", Math.abs(r.at(-1)!.y - exact)],
        ],
        trace: { euler: e, rk4: r },
        points: r,
      };
    },
  ),
  heat: math(
    "周期边界热扩散",
    "改变时间步的扩散比，观察离散热量总和与峰值。",
    [
      control("ratio", "扩散比", 0, 0.5, 0.05, 0.25),
      control("steps", "时间步数", 1, 25, 1, 6),
    ],
    ({ ratio = 0.25, steps = 6 }) => {
      const line = heat([0, 0, 1, 3, 1, 0, 0], ratio, steps);
      return {
        metrics: [
          ["热量总和", compensatedSum(line)],
          ["峰值", Math.max(...line)],
        ],
        trace: line,
        points: line.map((y, x) => ({ x, y })),
      };
    },
  ),
  optimization: math(
    "梯度下降和 Newton",
    "求四次凸函数的最小值，观察过大的步长如何导致发散。",
    [
      control("start", "初始 x", -2, 2, 0.25, 1.5),
      control("step", "梯度学习率", 0.01, 0.8, 0.01, 0.1),
    ],
    ({ start = 1.5, step = 0.1 }) => {
      const a = minimizeQuartic(start, "gradient", step, 8),
        b = minimizeQuartic(start, "newton", step, 8);
      return {
        metrics: [
          ["梯度下降最后 x", a.at(-1)!.x],
          ["Newton 最后 x", b.at(-1)!.x],
          ["Newton 目标值", b.at(-1)!.loss],
        ],
        trace: { gradient: a, newton: b },
        points: a.map(({ loss: y }, x) => ({ x, y })),
      };
    },
  ),
  lagrange: math(
    "等式约束最小化",
    "在 x+y 固定时最小化 x²+y²。比较解析驻点和任意可行点。",
    [control("total", "固定总数", -8, 12, 1, 6)],
    ({ total = 6 }) => {
      const solution = constrainedSum(total);
      return {
        metrics: [
          ["x", solution.x],
          ["y", solution.y],
          ["乘子", solution.multiplier],
          ["最小目标", solution.squaredNorm],
        ],
        trace: solution,
        points: Array.from({ length: 17 }, (_, i) => {
          const x = total / 2 + i - 8;
          return { x, y: x * x + (total - x) ** 2 };
        }),
      };
    },
  ),
  packing: math(
    "线性松弛与整数装载",
    "给两种器材分配容量。比较连续多面体顶点和整数可行值。",
    [
      control("capacity", "总容量", 3, 30, 1, 7),
      control("reward", "第二种价值", 2, 10, 1, 5),
    ],
    ({ capacity = 7, reward = 5 }) => {
      const o = packing(3, reward, capacity);
      return {
        metrics: [
          ["连续上界", o.upper],
          ["整数最优值", o.objective],
          ["整数方案", o.integer.join(", ")],
        ],
        trace: o,
      };
    },
  ),
  dft: math(
    "离散频谱",
    "修改正弦频率，观察非整周采样引入的谱泄漏。",
    [control("frequency", "观察区间内周期数", 1, 7, 0.25, 3)],
    ({ frequency = 3 }) => {
      const signal = Array.from({ length: 16 }, (_, i) =>
          Math.sin((2 * Math.PI * frequency * i) / 16),
        ),
        spectrum = dft(signal);
      const first = spectrum
        .slice(0, 9)
        .map(({ amplitude: y }, x) => ({ x, y }));
      const peak = first.reduce((top, p) => (p.y > top.y ? p : top), first[0]!);
      return {
        metrics: [
          ["最强频格", peak.x],
          ["幅度", peak.y],
        ],
        trace: { signal, spectrum },
        points: first,
      };
    },
  ),
  tensor: math(
    "批次矩阵乘法",
    "选择输出位置并查看每个缩并项和输出形状。",
    [
      control("column", "输出列", 0, 3, 1, 1),
      control("batch", "批次索引", 0, 1, 1, 0),
    ],
    ({ column = 1, batch = 0 }) => {
      const left = [
        [
          [1, 2, 3],
          [0, 2, 4],
        ],
        [
          [2, 1, 0],
          [1, 1, 1],
        ],
      ];
      const right = [
        [
          [1, 0, 1, 2],
          [2, 0, 0, 1],
          [1, 1, 2, 0],
        ],
        [
          [0, 1, 1, 2],
          [1, 2, 0, 0],
          [2, 0, 1, 1],
        ],
      ];
      const output = left.map((matrix, b) =>
        matrix.map((row) =>
          right[b]![0]!.map((_, j) =>
            row.reduce((sum, a, i) => sum + a * right[b]![i]![j]!, 0),
          ),
        ),
      );
      return {
        metrics: [
          ["输出形状", "2 × 2 × 4"],
          ["所选第 0 行值", output[batch]![0]![column]!],
        ],
        trace: { left, right, output },
      };
    },
  ),
  entropy: math(
    "信息量与 KL",
    "改变两个伯努利参数，比较熵的最大点与 KL 的非对称。",
    [
      control("a", "分布 P 的成功概率", 0, 1, 0.025, 0.5),
      control("b", "参照 Q 的成功概率", 0, 1, 0.025, 0.25),
    ],
    ({ a = 0.5, b = 0.25 }) => {
      const out = information([a, 1 - a], [b, 1 - b]),
        reverse = information([b, 1 - b], [a, 1 - a]);
      const text = (x: number) => (Number.isFinite(x) ? x : "+∞");
      return {
        metrics: [
          ["H(P) 比特", out.entropy],
          ["KL(P∥Q)", text(out.kl)],
          ["KL(Q∥P)", text(reverse.kl)],
        ],
        trace: { p: [a, 1 - a], q: [b, 1 - b] },
      };
    },
  ),
  estimation: stats(
    "最大似然、MAP 与后验均值",
    "同一观察下调整对称 Beta 先验的强度，比较三个估计量。",
    [
      control("success", "成功次数", 0, 10, 1, 7),
      control("strength", "先验 Beta 形状", 2, 10, 1, 3),
    ],
    ({ success = 7, strength = 3 }) => {
      const o = bernoulliEstimate(success, 10 - success, strength, strength);
      return {
        metrics: [
          ["MLE", o.mle],
          ["MAP", o.map],
          ["后验均值", o.average],
          ["后验标准差", o.sd],
        ],
        trace: o,
      };
    },
  ),
  bayes: stats(
    "生成模型与证据更新",
    "改事件的基准率与误报率，观察同一阳性观测下的后验。",
    [
      control("prior", "事件基准率", 0.01, 0.5, 0.01, 0.1),
      control("falsePositive", "误报率", 0.01, 0.5, 0.01, 0.05),
    ],
    ({ prior = 0.1, falsePositive = 0.05 }) => {
      const truePositive = 0.9,
        alert = prior * truePositive + (1 - prior) * falsePositive;
      return {
        metrics: [
          ["P(阳性)", alert],
          ["P(事件 | 阳性)", (prior * truePositive) / alert],
        ],
        trace: { prior, falsePositive, truePositive },
      };
    },
  ),
  glm: stats(
    "概率链接与拟合",
    "用一组固定二元观察拟合 logit 链接，观察输入及最后损失。",
    [control("x", "查询输入", -3, 4, 0.25, 1)],
    ({ x = 1 }) => {
      const data = [
        { x: [-2], y: 0 },
        { x: [-1], y: 0 },
        { x: [0], y: 1 },
        { x: [1], y: 0 },
        { x: [2], y: 1 },
        { x: [3], y: 1 },
      ];
      const model = fit("logistic", data, {
        ...initialOptions,
        epochs: 240,
        lambda: 0,
      });
      return {
        metrics: [
          ["条件均值/概率", model.predict([x])],
          ["最后损失", model.losses.at(-1)!],
        ],
        trace: { weights: model.weights, data },
        points: Array.from({ length: 20 }, (_, i) => ({
          x: (i - 9) / 3,
          y: model.predict([(i - 9) / 3]),
        })),
      };
    },
  ),
  kalman: stats(
    "局部水平状态空间模型",
    "改变测量噪声方差，对照 Kalman 增益和过滤均值。",
    [control("noise", "观测方差", 0.2, 12, 0.1, 2)],
    ({ noise = 2 }) => {
      const trace = kalman([1.2, 2.1, 1, -0.8, -1, 0.4], 1, 0.2, noise),
        last = trace.at(-1)!;
      return {
        metrics: [
          ["最后过滤均值", last.mean],
          ["最后过滤方差", last.variance],
          ["Kalman 增益", last.gain],
        ],
        trace,
        points: trace.map((row, x) => ({ x, y: row.mean })),
      };
    },
  ),
  power: stats(
    "精确二项检验的功效",
    "改样本量与备择参数，枚举二项上尾选拒绝门槛。",
    [
      control("n", "样本量", 6, 120, 2, 20),
      control("alternative", "备择成功率", 0.51, 0.95, 0.01, 0.7),
    ],
    ({ n = 20, alternative = 0.7 }) => {
      const out = binomialPower(n, 0.5, alternative, 0.05);
      return {
        metrics: [
          ["至少成功次数", out.threshold],
          ["实际一类错误", out.typeOne],
          ["备择功效", out.power],
        ],
        trace: { n, nullProbability: 0.5, alternative, ...out },
      };
    },
  ),
  decision: stats(
    "期望损失与决策阈值",
    "改变预计事件概率及错失代价。复核成本固定 2，并假定复核可避免全部损失。",
    [
      control("probability", "事件概率", 0, 1, 0.02, 0.2),
      control("miss", "错失代价", 1, 20, 1, 12),
    ],
    ({ probability = 0.2, miss = 12 }) => {
      const out = expectedDecision(probability, miss, 2);
      return {
        metrics: [
          ["忽略的期望损失", out.ignore],
          ["复核成本", out.review],
          ["最小期望损失动作", out.preferred],
        ],
        trace: { probability, miss, ...out },
      };
    },
  ),
  covariance: stats(
    "二维联合变化与投影",
    "改变第二列离散程度，比较主方向和样本方差。",
    [control("stretch", "第二列缩放", 0.25, 3, 0.25, 1)],
    ({ stretch = 1 }) => {
      const input = [
        [1, 2],
        [2, 0],
        [3, 4],
        [4, 2],
      ].map(([x, y]) => [x!, y! * stretch]);
      const out = eigenvectors(input, 2);
      return {
        metrics: [
          ["第一主成分方差", out.variances[0]!],
          ["第二主成分方差", out.variances[1]!],
        ],
        trace: {
          input,
          mean: out.mean,
          basis: out.basis,
          variances: out.variances,
        },
        points: input.map(([x, y]) => ({ x: x!, y: y!, group: 0 })),
      };
    },
  ),
  bootstrap: stats(
    "均值 Bootstrap",
    "改变极端值与种子，观察重抽样标准误和百分位区间。",
    [
      control("outlier", "最后一个观测", 8, 50, 1, 15),
      control("seed", "种子", 1, 20, 1, 9),
    ],
    ({ outlier = 15, seed = 9 }) => {
      const o = bootstrap([7, 8, 9, 10, 11, outlier], 800, seed);
      return {
        metrics: [
          ["样本均值", o.sample],
          ["标准误", o.standardError],
          ["2.5% 分位", o.low],
          ["97.5% 分位", o.high],
        ],
        trace: o.means.filter((_, i) => i % 10 === 0),
      };
    },
  ),
  montecarlo: stats(
    "Monte Carlo 面积",
    "在单位正方形抽点。比较不同样本量的标准误和 π 估计。",
    [
      control("n", "样本规模", 50, 1500, 50, 250),
      control("seed", "种子", 1, 20, 1, 7),
    ],
    ({ n = 250, seed = 7 }) => {
      const o = monteCarloPi(n, seed);
      return {
        metrics: [
          ["π 估计", o.value],
          ["标准误", o.standardError],
          ["误差", Math.abs(o.value - Math.PI)],
        ],
        trace: o.points.slice(0, 10),
        points: o.points.slice(0, 500),
      };
    },
  ),
  mcmc: stats(
    "Metropolis 随机游走",
    "调提议步长并读接受率和轨迹。目标为标准正态。",
    [
      control("jump", "提议标准差", 0.1, 5, 0.1, 1.2),
      control("seed", "种子", 1, 20, 1, 8),
    ],
    ({ jump = 1.2, seed = 8 }) => {
      const o = normalChain(3000, jump, seed);
      return {
        metrics: [
          ["接受率", o.acceptance],
          ["丢弃预热后均值", o.mean],
          ["方差", o.variance],
        ],
        trace: o.values.slice(0, 15),
        points: o.values.slice(0, 180).map((y, x) => ({ x, y })),
      };
    },
  ),
  markov: stats(
    "两态 Markov 链",
    "调转移概率后观察边缘概率传播与平稳分布。",
    [
      control("enter", "0→1 概率", 0, 1, 0.05, 0.3),
      control("leave", "1→0 概率", 0, 1, 0.05, 0.2),
    ],
    ({ enter = 0.3, leave = 0.2 }) => {
      const o = markov(0, enter, leave, 20);
      return {
        metrics: [
          ["末期 P(1)", o.prob.at(-1)!.y],
          ["平稳 P(1)", o.stationary],
        ],
        trace: o.prob,
        points: o.prob,
      };
    },
  ),
  ar: stats(
    "AR(1) 与时间切分",
    "按时间顺序取前缀拟合。紧接训练期的一行用于一步预测误差。",
    [control("prefix", "训练前缀长度", 5, 11, 1, 8)],
    ({ prefix = 8 }) => {
      const input = [4, 5, 6, 6, 7, 5, 4, 4, 6, 7, 5, 4],
        o = forecastAR(input.slice(0, prefix)),
        actual = input[prefix]!;
      return {
        metrics: [
          ["AR(1) 系数", o.phi],
          ["一步预测", o.forecast],
          ["实际", actual],
          ["绝对误差", Math.abs(actual - o.forecast)],
        ],
        trace: { used: input.slice(0, prefix), actual, ...o },
        points: input.map((y, x) => ({ x, y, group: Number(x >= prefix) })),
      };
    },
  ),
  survival: stats(
    "风险集与生存估计",
    "更改一个观测为右删失，比较同一时间的风险集和曲线。",
    [control("event", "第 3 单位的观察是否为事件", 0, 1, 1, 0)],
    ({ event = 0 }) => {
      const rows = kaplanMeier([
        { time: 2, event: true },
        { time: 3, event: !!event },
        { time: 5, event: true },
        { time: 7, event: false },
        { time: 9, event: true },
      ]);
      return {
        metrics: [
          ["第 3 单位生存率", rows[1]!.survival],
          [
            "首次降到 0.5 的时间",
            rows.find((row) => row.survival <= 0.5)?.time ?? null,
          ],
        ],
        trace: rows,
        points: rows.map((row) => ({ x: row.time, y: row.survival })),
      };
    },
  ),
  adjustment: stats(
    "分层标准化",
    "改变目标总体的风险分层权重，比较粗差异和调整差异。",
    [control("weight", "高风险人群权重", 0.1, 0.9, 0.1, 0.5)],
    ({ weight = 0.5 }) => {
      const inputs = [
        {
          treated: 80,
          treatedEvent: 44,
          controls: 20,
          controlEvent: 12,
          weight,
        },
        {
          treated: 20,
          treatedEvent: 2,
          controls: 80,
          controlEvent: 16,
          weight: 1 - weight,
        },
      ];
      const o = standardizedDifference(inputs);
      return {
        metrics: [
          ["粗风险差", o.crude],
          ["调整风险差", o.adjusted],
        ],
        trace: inputs,
      };
    },
  ),
  multiple: stats(
    "两种多重检验校正",
    "改变错误率目标，对照同一批次的 Bonferroni 与 BH 决策。",
    [control("alpha", "错误率目标", 0.01, 0.2, 0.01, 0.05)],
    ({ alpha = 0.05 }) => {
      const p = [0.002, 0.015, 0.023, 0.09, 0.7],
        o = multipleTests(p, alpha);
      return {
        metrics: [
          ["Bonferroni 拒绝数", o.bonferroni.filter(Boolean).length],
          ["BH 拒绝数", o.bh.filter(Boolean).length],
        ],
        trace: { p, ...o },
      };
    },
  ),

  "study-log": studio(
    "algorithms",
    "学习记录的数据契约",
    "编辑 CSV。检查时长字段及错误记录，聚合后用独立算式核对总量。",
    "计算",
    [],
    (_, text) => {
      const data = parseCSV(text);
      const name = data.columns.indexOf("topic"),
        minutes = data.columns.indexOf("minutes");
      if (name < 0 || minutes < 0) throw Error("使用 topic,minutes 两列。");
      const valid = data.rows.filter(
        (row) =>
          typeof row[name] === "string" &&
          typeof row[minutes] === "number" &&
          Number.isInteger(row[minutes]) &&
          Number(row[minutes]) > 0,
      );
      const groups = grouped({ ...data, rows: valid }, "topic", "minutes");
      return {
        metrics: [
          ["有效行数", valid.length],
          ["总分钟", valid.reduce((sum, row) => sum + Number(row[minutes]), 0)],
          ["拒收行数", data.rows.length - valid.length],
        ],
        trace: { valid, groups },
      };
    },
    {
      label: "学习记录 CSV",
      initial: `topic,minutes
math,20
web,12
math,5
web,0`,
    },
  ),
  viewport: studio(
    "systems",
    "响应式排列与触达尺寸",
    "改变可用宽度，计算保持最小宽度与间距时能排几列。这里只算布局预算。",
    "模拟",
    [
      control("width", "内容区宽度", 260, 1200, 10, 360),
      control("target", "最小触达尺寸", 24, 72, 2, 44),
    ],
    ({ width = 360, target = 44 }) => {
      const gap = 16,
        columns = Math.max(1, Math.floor((width + gap) / (180 + gap))),
        cell = (width - gap * (columns - 1)) / columns;
      return {
        metrics: [
          ["列数", columns],
          ["实际列宽 px", cell],
          ["设定触达尺寸 px", target],
        ],
        trace: { width, gap, columns, cell, target },
      };
    },
  ),
  closures: studio(
    "algorithms",
    "参数与捕获环境",
    "固定函数创建时捕获的值，再改变调用参数。检查闭包求值和不同外部绑定。",
    "计算",
    [
      control("capture", "闭包创建时捕获的 n", -10, 10, 1, 3),
      control("argument", "调用参数 x", -10, 10, 1, 4),
    ],
    ({ capture = 3, argument = 4 }) => {
      const makeAdder = (n: number) => (x: number) => x + n;
      const result = makeAdder(capture)(argument),
        alternate = makeAdder(capture + 1)(argument);
      return {
        metrics: [
          ["原闭包输出", result],
          ["新闭包输出", alternate],
        ],
        trace: { captured: capture, argument, result, alternate },
      };
    },
  ),
  memory: studio(
    "systems",
    "根引用与可达对象",
    "切换根是否引用一个成环子图，比较从根开始的真实标记。",
    "模拟",
    [control("linked", "根连到环（1＝是）", 0, 1, 1, 0)],
    ({ linked = 0 }) => {
      const links: Record<string, string[]> = {
        root: linked ? ["live", "cycleA"] : ["live"],
        live: [],
        cycleA: ["cycleB"],
        cycleB: ["cycleA"],
      };
      const active = new Set<string>(),
        work = ["root"];
      while (work.length) {
        const key = work.pop()!;
        if (active.has(key)) continue;
        active.add(key);
        work.push(...links[key]!);
      }
      const reclaim = Object.keys(links).filter((key) => !active.has(key));
      return {
        metrics: [
          ["可达对象", active.size],
          ["可回收对象", reclaim.length],
        ],
        trace: { links, marked: [...active], reclaim },
      };
    },
  ),
  hot: studio(
    "systems",
    "热点编译阈值和成本估计",
    "指定调用次数和阈值，比较固定单次成本及一次编译。这里没有执行机器码。",
    "模拟",
    [
      control("calls", "调用总次数", 1, 1000, 1, 120),
      control("threshold", "编译热点阈值", 1, 1000, 1, 30),
    ],
    ({ calls = 120, threshold = 30 }) => {
      const interpreted = Math.min(calls, threshold),
        native = calls - interpreted;
      const cost = interpreted * 5 + native + Number(native > 0) * 60;
      return {
        metrics: [
          ["解释调用", interpreted],
          ["编译后调用", native],
          ["估计代价", cost],
          ["全解释的代价", calls * 5],
        ],
        trace: { calls, threshold, interpreted, native, cost },
      };
    },
  ),
  compiler: studio(
    "algorithms",
    "从 token 到栈字节码",
    "输入一个整数表达式。对照 AST 解释和栈执行，比较常量折叠前后的指令数。",
    "计算",
    [control("x", "变量 x", -10, 10, 1, 4)],
    ({ x = 4 }, source) => {
      const tokens = scan(source),
        ast = parse(tokens),
        optimized = fold(ast),
        code = emit(optimized);
      const vars = new Map([["x", x]]),
        direct = interpret(ast, vars),
        evaluated = run(code, vars);
      if (direct !== evaluated.value) throw Error("解释与编译结果不一致。");
      return {
        metrics: [
          ["解释/编译结果", direct],
          ["未优化指令", emit(ast).length],
          ["优化后指令", code.length],
        ],
        trace: { tokens, ast, optimized, code, execution: evaluated.trace },
      };
    },
    { label: "整数表达式", initial: "x*(2+3)-4" },
  ),
  scheduling: studio(
    "systems",
    "Round Robin 进程调度",
    "调整时间片，比较响应、等待和完成时间。使用单核及零切换开销假设。",
    "模拟",
    [
      control("quantum", "时间片", 1, 8, 1, 2),
      control("duration", "进程 A 的 CPU 时间", 1, 14, 1, 5),
    ],
    ({ quantum = 2, duration = 5 }) => {
      const o = roundRobin(
        [
          { id: "A", release: 0, duration },
          { id: "B", release: 1, duration: 3 },
          { id: "C", release: 3, duration: 4 },
        ],
        quantum,
      );
      return {
        metrics: [
          ["时间片切分次数", o.trace.length],
          ["最后完成时间", Math.max(...o.done.map((x) => x.finish))],
          [
            "平均等待",
            o.done.reduce((sum, x) => sum + x.wait, 0) / o.done.length,
          ],
        ],
        trace: o,
      };
    },
  ),
  deadlock: studio(
    "systems",
    "等待图与死锁",
    "改变最后一条等待边。此模型假设每种资源只有一个实例。",
    "模拟",
    [control("cycle", "C 等待 A（1＝是）", 0, 1, 1, 1)],
    ({ cycle = 1 }) => {
      const edges: [string, string][] = [
        ["A", "B"],
        ["B", "C"],
      ];
      if (cycle) edges.push(["C", "A"]);
      const result = waitCycle(edges);
      return {
        metrics: [
          ["环", result.join(" → ") || "无"],
          ["等待边数", edges.length],
        ],
        trace: { edges, cycle: result },
      };
    },
  ),
  cache: studio(
    "systems",
    "LRU 缓存与容量",
    "给出键读取序列，对照缓存淘汰顺序和命中率。一个键代表一个等大小页。",
    "模拟",
    [control("capacity", "缓存容量", 1, 12, 1, 3)],
    ({ capacity = 3 }, text) => {
      const keys = text
        .trim()
        .split(/[\s,，]+/)
        .filter(Boolean);
      if (!keys.length || keys.length > 50) throw Error("输入 1–50 个键。");
      const o = lru(keys, capacity);
      return {
        metrics: [
          ["命中", o.hits],
          ["缺失", o.misses],
          ["命中率", o.hits / keys.length],
        ],
        trace: o.trace,
      };
    },
    { label: "键读取序列", initial: "A B C A D B A" },
  ),
  clocks: studio(
    "systems",
    "Lamport 时钟",
    "改变消息传递前的本地操作数，对照时钟推进。只表示顺序，不表示墙钟时间。",
    "模拟",
    [control("extra", "节点 A 额外本地操作", 0, 8, 1, 2)],
    ({ extra = 2 }) => {
      const events = [
        ...Array.from({ length: extra }, () => ({ on: 0 })),
        { on: 0 },
        { on: 1, from: 0 },
        { on: 1 },
        { on: 0, from: 1 },
      ];
      const o = lamport(2, events);
      return {
        metrics: [
          ["节点 A", o.at(-1)![0]!],
          ["节点 B", o.at(-1)![1]!],
        ],
        trace: o,
      };
    },
  ),
  quorum: studio(
    "systems",
    "分区与多数派选举",
    "改变可达节点及其日志资格，观察是否达到多数。仅模拟一任投票。",
    "模拟",
    [
      control("nodes", "节点总数", 3, 9, 2, 5),
      control("reachable", "候选人可达节点", 1, 9, 1, 3),
      control("stale", "拒绝过期候选人的节点数", 0, 8, 1, 0),
    ],
    ({ nodes = 5, reachable = 3, stale = 0 }) => {
      if (reachable > nodes || stale >= reachable)
        throw Error("候选人可达数含自己，自己不能拒绝自己。");
      const o = partitionVote(nodes, reachable, stale);
      return {
        metrics: [
          ["多数票门槛", o.required],
          ["实际同意票", o.obtained],
          ["选举结果", o.canElect ? "多数" : "失败"],
        ],
        trace: o,
      };
    },
  ),
  virtual: studio(
    "systems",
    "虚拟地址翻译",
    "输入虚拟地址和写权限请求。模型使用 16 字节页与给定页表。",
    "模拟",
    [
      control("address", "虚拟地址", 0, 63, 1, 21),
      control("write", "写访问（1＝是）", 0, 1, 1, 0),
    ],
    ({ address = 21, write = 0 }) => {
      const virtual = Math.floor(address / 16),
        offset = address % 16;
      const pages = [
        { frame: 2, write: true },
        { frame: 5, write: false },
        null,
        { frame: 0, write: true },
      ];
      const entry = pages[virtual];
      const physical =
        entry && (!write || entry.write) ? 16 * entry.frame + offset : null;
      return {
        metrics: [
          ["虚拟页号", virtual],
          ["页内偏移", offset],
          ["物理地址", physical],
          ["状态", !entry ? "缺页" : physical === null ? "权限拒绝" : "可访问"],
        ],
        trace: { pages, virtual, offset, physical },
      };
    },
  ),
  sync: studio(
    "systems",
    "并发计数与同步",
    "改变是否将读改写当作一个临界区。同步运行对比相同两项操作。",
    "模拟",
    [control("atomic", "连续执行临界区（1＝是）", 0, 1, 1, 0)],
    ({ atomic = 0 }) => {
      let value = 0;
      const a = value;
      if (atomic) value = a + 1;
      const b = value;
      if (!atomic) value = a + 1;
      value = b + 1;
      return {
        metrics: [
          ["最终计数", value],
          ["丢失更新", 2 - value],
        ],
        trace: { observedA: a, observedB: b, initial: 0, final: value },
      };
    },
  ),
  congestion: studio(
    "systems",
    "TCP 拥塞窗口变化",
    "选择哪一轮发生超时。轮以 RTT 为单位，模拟教学版慢启动和拥塞避免。",
    "模拟",
    [
      control("loss", "超时 RTT（0＝无）", 0, 8, 1, 5),
      control("threshold", "初始慢启动阈值", 2, 20, 1, 8),
    ],
    ({ loss = 5, threshold = 8 }) => {
      let cwnd = 1,
        ssthresh = threshold;
      const trace = [];
      for (let rtt = 1; rtt <= 8; rtt++) {
        const before = cwnd;
        if (rtt === loss) {
          ssthresh = Math.max(2, Math.floor(cwnd / 2));
          cwnd = 1;
        } else cwnd = cwnd < ssthresh ? Math.min(2 * cwnd, ssthresh) : cwnd + 1;
        trace.push({ rtt, before, cwnd, ssthresh, timeout: rtt === loss });
      }
      return {
        metrics: [
          ["末轮拥塞窗口", cwnd],
          ["末轮慢启动阈值", ssthresh],
        ],
        trace,
        points: trace.map((row) => ({ x: row.rtt, y: row.cwnd })),
      };
    },
  ),
  lease: studio(
    "systems",
    "地址租约与回收",
    "按到达时间给唯一设备分配地址。修改租约秒数并核对耗尽和回收。",
    "模拟",
    [control("seconds", "租约秒数", 2, 10, 1, 5)],
    ({ seconds = 5 }) => {
      const owners = new Map<string, { ip: number; expires: number }>();
      const trace = [
        ["A", 0],
        ["B", 1],
        ["C", 3],
        ["C", 6],
        ["D", 8],
      ].map(([name, t]) => {
        for (const [key, v] of owners)
          if (v.expires <= Number(t)) owners.delete(key);
        const used = new Set([...owners.values()].map((x) => x.ip));
        const ip =
          owners.get(String(name))?.ip ?? [10, 11].find((n) => !used.has(n));
        if (ip !== undefined)
          owners.set(String(name), { ip, expires: Number(t) + seconds });
        return { name, t, ip: ip ?? null };
      });
      return {
        metrics: [
          ["未取到地址", trace.filter((row) => row.ip === null).length],
          ["末次租约数", owners.size],
        ],
        trace,
      };
    },
  ),
  parallel: studio(
    "systems",
    "并行树归约",
    "对相同数据真正构建折半求和树。计算工作量与关键路径，时间模型假设每层加法可同时进行。",
    "模拟",
    [control("count", "输入元素数", 2, 32, 1, 7)],
    ({ count = 7 }) => {
      let row = Array.from({ length: count }, (_, i) => i + 1);
      const levels = [row];
      let work = 0;
      while (row.length > 1) {
        const carry: number[] = [];
        for (let i = 0; i < row.length; i += 2) {
          if (i + 1 === row.length) carry.push(row[i]!);
          else {
            carry.push(row[i]! + row[i + 1]!);
            work++;
          }
        }
        row = carry;
        levels.push(row);
      }
      return {
        metrics: [
          ["求和", row[0]!],
          ["实际加法次数", work],
          ["依赖层数", levels.length - 1],
        ],
        trace: levels,
      };
    },
  ),
  vector: studio(
    "systems",
    "SIMD 吞吐与尾部",
    "以元素为单位改变 1–8 个 SIMD lanes，计算整数向量指令与尾部元素。无硬件计时。",
    "模拟",
    [
      control("size", "元素数量", 1, 100, 1, 19),
      control("lanes", "向量 lanes", 1, 8, 1, 4),
    ],
    ({ size = 19, lanes = 4 }) => {
      const groups = Math.floor(size / lanes),
        tail = size % lanes;
      return {
        metrics: [
          ["完整向量指令", groups],
          ["标量尾部", tail],
          ["掩码处理时向量指令", groups + Number(tail > 0)],
        ],
        trace: { size, lanes, groups, tail },
      };
    },
  ),
  snapshot: studio(
    "data",
    "MVCC 版本可见性",
    "改变观察的提交版本，核对更新、删除标记与旧快照。课堂对已提交历史做一致性读取。",
    "模拟",
    [control("revision", "读取快照版本", 0, 6, 1, 3)],
    ({ revision = 3 }) => {
      const history = [
        { key: "A", revision: 1, value: 4 },
        { key: "B", revision: 2, value: 7 },
        { key: "A", revision: 4, value: 6 },
        { key: "B", revision: 5, value: null },
      ];
      const rows = databaseSnapshot(history, revision);
      return {
        metrics: [
          ["可见记录", rows.length],
          ["快照值合计", rows.reduce((sum, row) => sum + row.value!, 0)],
        ],
        trace: { revision, history, rows },
      };
    },
  ),
  index: studio(
    "data",
    "有序叶页和范围查询",
    "改变页容量和范围，比较实际索引页访问数。课堂是批量构造的两层索引。",
    "模拟",
    [
      control("page", "叶页容量", 2, 6, 1, 3),
      control("start", "起始键", 0, 30, 1, 5),
      control("width", "范围长度", 0, 12, 1, 6),
    ],
    ({ page = 3, start = 5, width = 6 }) => {
      const keys = [1, 4, 5, 5, 7, 8, 9, 11, 13, 17, 17, 18, 21, 24, 28, 29];
      const out = indexedRange(keys, page, start, start + width);
      return {
        metrics: [
          ["匹配键数", out.values.length],
          ["读取叶页", out.reads],
          ["查分隔键比较次数", out.comparisons],
        ],
        trace: out,
      };
    },
  ),
  replication: studio(
    "systems",
    "一条当前任期记录的复制",
    "改变可达副本和确认数。提交建立在多数确认上，此处只检查一条当前任期记录。",
    "模拟",
    [
      control("reachable", "可达副本（含 leader）", 1, 5, 1, 3),
      control("ack", "耐久确认数（含 leader）", 1, 5, 1, 2),
    ],
    ({ reachable = 3, ack = 2 }) => {
      const out = replicaCommit(5, reachable, ack);
      return {
        metrics: [
          ["多数门槛", out.majority],
          ["确认数", ack],
          ["允许提交", out.committed ? "是" : "否"],
        ],
        trace: out,
      };
    },
  ),
  transactions: studio(
    "systems",
    "两阶段提交的状态",
    "切换参与者投票与协调记录持久化。观察协调者失联时准备状态能否退出。",
    "模拟",
    [
      control("vote", "第二参与者（0拒绝、1同意、2未返回）", 0, 2, 1, 1),
      control("durable", "协调者决定已持久化（1＝是）", 0, 1, 1, 0),
    ],
    ({ vote = 1, durable = 0 }) => {
      const votes = [true, vote === 2 ? null : !!vote],
        out = transactionDecision(votes, !!durable);
      return {
        metrics: [
          ["完成决定", out.decision ?? "未完成"],
          ["准备中", out.participants.filter((x) => x === "prepared").length],
        ],
        trace: { votes, ...out },
      };
    },
  ),
  balancing: studio(
    "systems",
    "健康实例分流",
    "改变可服务的实例数和请求总量。逐条按 Round Robin 分配，故障实例不接收。",
    "模拟",
    [
      control("replicas", "配置的实例数", 1, 8, 1, 4),
      control("down", "故障实例数", 0, 8, 1, 1),
      control("jobs", "请求数量", 1, 100, 1, 17),
    ],
    ({ replicas = 4, down = 1, jobs = 17 }) => {
      if (down > replicas) throw Error("故障实例数不能超过配置总数。");
      const out = distribute(jobs, replicas, down);
      return {
        metrics: [
          ["健康数", out.healthy],
          ["无法路由的请求", out.unserved],
          ["各实例请求数", out.counts.join(", ")],
        ],
        trace: out,
      };
    },
  ),
  wal: studio(
    "data",
    "WAL 与崩溃恢复",
    "改变崩溃前刷盘的日志记录数。只恢复提交标记已持久化的教学事务。",
    "模拟",
    [control("durable", "崩溃前持久化记录数", 0, 6, 1, 4)],
    ({ durable = 4 }) => {
      const o = recover(
        { inventory: 12 },
        [
          { kind: "begin", tx: "t1" },
          { kind: "write", tx: "t1", key: "inventory", value: 10 },
          { kind: "commit", tx: "t1" },
          { kind: "begin", tx: "t2" },
          { kind: "write", tx: "t2", key: "inventory", value: 8 },
          { kind: "commit", tx: "t2" },
        ],
        durable,
      );
      return {
        metrics: [
          ["恢复的库存", o.rows.inventory!],
          ["已恢复提交", o.committed.join(", ") || "无"],
          ["忽略未提交", o.aborted.join(", ") || "无"],
        ],
        trace: o,
      };
    },
  ),
  pipeline: studio(
    "data",
    "导入、质量检查与批次聚合",
    "上传前可直接粘贴 CSV。按批次保留有效金额和去重记录，并核对拒收原因。",
    "计算",
    [],
    (_, text) => {
      const raw = parseCSV(text);
      const attrs = ["id", "group", "value"].map((name) =>
        raw.columns.indexOf(name),
      );
      if (attrs.includes(-1)) throw Error("CSV 需要 id,group,value 列。");
      const [id, group, value] = attrs as [number, number, number],
        seen = new Set<string>(),
        rejected: { line: number; reason: string }[] = [];
      const valid = raw.rows.filter((row, i) => {
        const key = row[id],
          groupName = row[group],
          amount = row[value];
        const label = String(key);
        const reason =
          key == null || groupName == null
            ? "缺少键或分组"
            : typeof amount !== "number" || amount < 0
              ? "金额无效"
              : seen.has(label)
                ? "重复事件"
                : "";
        if (reason) {
          rejected.push({ line: i + 2, reason });
          return false;
        }
        seen.add(label);
        return true;
      });
      const clean = { ...raw, rows: valid },
        output = grouped(clean, "group", "value");
      return {
        metrics: [
          ["原始记录", raw.rows.length],
          ["有效记录", valid.length],
          ["拒收", rejected.length],
          ["分组数", output.length],
        ],
        trace: {
          source: profile(raw),
          rejected,
          byGroup: output,
          lineage: ["raw CSV", "row checks", "first valid id", "group SUM"],
        },
      };
    },
    {
      label: "CSV 数据批次",
      initial: `id,group,value
a,north,2
b,south,5
a,north,2
c,north,-1
d,north,4`,
    },
  ),
  streaming: studio(
    "data",
    "事件时间与迟到窗口",
    "按到达顺序输入事件，改变允许迟到区间，观察去重、迟到和窗口关闭。模型运行在本机且不连接消息服务。",
    "模拟",
    [control("lateness", "允许迟到量", 0, 20, 1, 3)],
    ({ lateness = 3 }, text) => {
      const table = parseCSV(text, false);
      const names = ["id", "time", "value"].map((key) =>
        table.columns.indexOf(key),
      );
      if (!table.rows.length || names.includes(-1))
        throw Error("至少输入一条 id,time,value 事件。");
      const events = table.rows.map((row, index) => {
        const id = row[names[0]!] ?? "",
          time = row[names[1]!],
          value = row[names[2]!];
        if (
          typeof id !== "string" ||
          !id.trim() ||
          time == null ||
          value == null ||
          !Number.isSafeInteger(Number(time)) ||
          Number(time) < 0 ||
          !Number.isFinite(Number(value))
        )
          throw Error(
            "第 " + (index + 2) + " 行需要非空 ID、非负整数时间和有限数值。",
          );
        return { id: id.trim(), time: Number(time), value: Number(value) };
      });
      const o = windows(events, 10, lateness);
      return {
        metrics: [
          ["水位线", o.watermark],
          ["已关闭窗口", o.emitted.length],
          ["迟到数", o.late.length],
          ["重复事件", o.duplicates.length],
        ],
        trace: { events, ...o },
      };
    },
    {
      label: "事件流 CSV（按到达顺序）",
      initial: "id,time,value\na,1,3\nb,14,7\nc,4,5\nb,14,7\nd,21,2",
    },
  ),
  backprop: studio(
    "ml",
    "标量计算图与自动微分",
    "改变输入及系数。对照链式累加与有限差分。",
    "计算",
    [
      control("x", "变量 x", -3, 4, 0.25, 2),
      control("a", "系数 a", -2, 3, 0.25, 1),
    ],
    ({ x = 2, a = 1 }) => {
      const o = autodiffPolynomial(x, a),
        delta = 1e-5,
        f = (t: number) => a * t * t + t;
      return {
        metrics: [
          ["函数值", o.value],
          ["反向梯度", o.derivative],
          ["差分参考", (f(x + delta) - f(x - delta)) / (2 * delta)],
        ],
        trace: o.tape,
      };
    },
  ),
  recurrent: studio(
    "ml",
    "RNN、LSTM 与 GRU 记忆",
    "改变递归权重和 LSTM 保留率。固定一次脉冲输入，比较三种状态传播。",
    "计算",
    [
      control("w", "递归权重", 0, 2, 0.1, 0.8),
      control("retain", "LSTM 遗忘门保留率", 0, 1, 0.05, 0.75),
    ],
    ({ w = 0.8, retain = 0.75 }) => {
      const o = recurrent([1, 0, 0, 0, 0, 0], w, retain),
        last = o.at(-1)!;
      return {
        metrics: [
          ["末步 RNN", last.rnn],
          ["末步 LSTM cell", last.cell],
          ["末步 GRU", last.gru],
        ],
        trace: o,
        points: o.map((row) => ({ x: row.step, y: row.cell })),
      };
    },
  ),
  diffusion: studio(
    "ml",
    "扩散的前向加噪",
    "调累计信号权重。使用可复现高斯噪声，沿条件分布采样。",
    "计算",
    [
      control("alpha", "累计信号权重", 0, 1, 0.05, 0.55),
      control("seed", "种子", 1, 30, 1, 11),
    ],
    ({ alpha = 0.55, seed = 11 }) => {
      const o = diffusionForward(2, alpha, seed);
      return {
        metrics: [
          ["输入", o.original],
          ["加噪输出", o.result],
          ["条件方差", 1 - alpha],
        ],
        trace: o,
      };
    },
  ),
  variational: studio(
    "ml",
    "VAE 重参数化与 ELBO",
    "改变后验提议的均值与方差。计算一次潜变量样本、重构项和解析 KL。",
    "计算",
    [
      control("mean", "后验均值", -2, 2, 0.1, 0.5),
      control("logv", "对数方差", -4, 2, 0.25, -1),
      control("noise", "给定标准正态噪声样本值", -2, 2, 0.25, 0.5),
    ],
    ({ mean = 0.5, logv = -1, noise = 0.5 }) => {
      const o = variationalLoss(mean, logv, noise, 1);
      return {
        metrics: [
          ["潜变量", o.latent],
          ["到标准正态的 KL", o.kl],
          ["负 ELBO 样本量", o.total],
        ],
        trace: o,
      };
    },
  ),
  lora: studio(
    "ml",
    "低秩权重更新",
    "拖动适配幅度。二维权重保持冻结，计算秩一增量。",
    "计算",
    [control("scale", "适配增益", 0, 3, 0.25, 1)],
    ({ scale = 1 }) => {
      const base = [
          [1, 2],
          [3, 4],
        ],
        left = [1, -1],
        right = [2, 3],
        total = lowRank(base, left, right, scale);
      return {
        metrics: [
          ["更新后 (0,0)", total[0]![0]!],
          ["更新后 (1,1)", total[1]![1]!],
        ],
        trace: { base, left, right, total },
      };
    },
  ),
  policy: studio(
    "ml",
    "策略梯度与强化学习",
    "在两动作赌博机中用实际采样和 reward×∇logπ 更新 logits。",
    "计算",
    [
      control("advantage", "第二动作奖励", 0, 1, 0.05, 0.75),
      control("rate", "学习率", 0.01, 0.5, 0.01, 0.12),
    ],
    ({ advantage = 0.75, rate = 0.12 }) => {
      const o = banditLogits([0.25, advantage], 150, rate, 11);
      return {
        metrics: [
          ["第二动作概率", o.probabilities[1]!],
          ["最后期望奖励", o.history.at(-1)!.y],
        ],
        trace: o.logits,
        points: o.history,
      };
    },
  ),
  vision: studio(
    "ml",
    "检测框与像素掩码 IoU",
    "分别改变识别框的位移与像素阈值。计算两种交并比，理解每种标注的粒度。",
    "计算",
    [
      control("offset", "预测框水平位移", -5, 5, 1, 1),
      control("cutoff", "像素阈值", 0.1, 0.9, 0.05, 0.5),
    ],
    ({ offset = 1, cutoff = 0.5 }) => {
      const out = visionScores(offset, cutoff);
      return {
        metrics: [
          ["框 IoU", out.boxIoU],
          ["掩码 IoU", out.maskIoU],
        ],
        trace: out,
      };
    },
  ),
  bigram: studio(
    "ml",
    "用自己的文本拟合二元语言模型",
    "使用空白切分与 Laplace 平滑，下一词作为自监督标签。可修改语料并重新拟合。",
    "计算",
    [],
    (_, text) => {
      const [query, ...corpus] = text.split("\n");
      const out = bigram(corpus.join(" "), query ?? "");
      return {
        metrics: [
          ["词元数", out.tokens],
          ["词表大小", out.vocab.length],
          ["训练困惑度", out.trainingPerplexity],
          ["最高概率后继", out.distribution[0]!.token],
        ],
        trace: out,
      };
    },
    { label: "第一行查询 token，后面为训练语料", initial: "a\na b a b a c" },
  ),
  graphai: studio(
    "ml",
    "图邻居聚合",
    "调整一个节点特征，与相邻节点（含自身）一起平均以传播信息。",
    "计算",
    [
      control("node", "节点 0 特征", -8, 12, 1, 6),
      control("edge", "增加 0 到 2 的边（1＝是）", 0, 1, 1, 0),
    ],
    ({ node = 6, edge = 0 }) => {
      const edges: [number, number][] = [
        [0, 1],
        [1, 2],
      ];
      if (edge) edges.push([0, 2]);
      const output = graphAggregate([node, 0, 3], edges);
      return {
        metrics: [
          ["节点 0 输出", output[0]!],
          ["节点 2 输出", output[2]!],
        ],
        trace: { edges, output },
      };
    },
  ),
  gan: studio(
    "ml",
    "一维 GAN 交替训练",
    "选择迭代次数和学习率。真实反向更新单标量生成器和二元判别器，目标数据点固定为 2。",
    "计算",
    [
      control("steps", "迭代轮次", 5, 250, 5, 80),
      control("rate", "步长", 0.025, 0.25, 0.025, 0.1),
    ],
    ({ steps = 80, rate = 0.1 }) => {
      const out = trainToyGan(steps, rate);
      return {
        metrics: [
          ["生成标量", out.generator],
          ["判别器给生成样本的概率", out.estimated],
        ],
        trace: { w: out.w, b: out.b },
        points: out.losses,
      };
    },
  ),
  convolution: studio(
    "ml",
    "二维卷积层的局部响应",
    "移动边缘并调整卷积核系数，观察没有填充的互相关输出。",
    "计算",
    [
      control("edge", "边缘位置", 0, 3, 1, 2),
      control("gain", "核系数", 1, 4, 1, 1),
    ],
    ({ edge = 2, gain = 1 }) => {
      const input = Array.from({ length: 3 }, () =>
        Array.from({ length: 4 }, (_, j) => Number(j >= edge)),
      );
      const kernel = [
          [-gain, gain],
          [-gain, gain],
        ],
        output = conv2d(input, kernel);
      return {
        metrics: [
          ["输出行数", output.length],
          ["输出列数", output[0]!.length],
          ["最大响应", Math.max(...output.flat())],
        ],
        trace: { input, kernel, output },
      };
    },
  ),
  attention: studio(
    "ml",
    "缩放点积、掩码和注意力",
    "改变查询分量，并切换因果掩码。比较第一位置和第二位置的键权重。",
    "计算",
    [
      control("q", "查询第一分量", -3, 5, 0.25, 1),
      control("mask", "因果掩码（1＝开启）", 0, 1, 1, 1),
    ],
    ({ q = 1, mask = 1 }) => {
      const out = attention(
        [
          [q, 0],
          [1, 1],
        ],
        [
          [1, 0],
          [1, 1],
        ],
        [[10], [20]],
        !!mask,
      );
      return {
        metrics: [
          ["第一位置给第二键的权重", out.weights[0]![1]!],
          ["第一位置输出", out.embeddings[0]![0]!],
          ["第二位置输出", out.embeddings[1]![0]!],
        ],
        trace: out,
      };
    },
  ),
  transformer: studio(
    "ml",
    "小型 Transformer 解码层",
    "改变最后位置的嵌入。检查因果掩码使前缀表示不受后续输入影响。",
    "计算",
    [control("token", "最后位置的嵌入", -5, 5, 0.5, 1)],
    ({ token = 1 }) => {
      const o = decoderBlock([
        [1, 0],
        [1, 1],
        [token, 0],
      ]);
      return {
        metrics: [
          ["位置数", o.output.length],
          ["首位置对末位置的注意力", o.weights[0]![2]!],
          ["末位置最后一维", o.output[2]![1]!],
        ],
        trace: o,
      };
    },
  ),
  embedding: studio(
    "ml",
    "向量检索与归一化",
    "改变二维查询向量。比较方向接近程度及返回顺序。",
    "计算",
    [control("angle", "查询角度（度）", 0, 360, 10, 20)],
    ({ angle = 20 }) => {
      const a = (angle * Math.PI) / 180,
        o = nearestEmbedding(
          [Math.cos(a), Math.sin(a)],
          [
            { id: "A", vector: [1, 0] },
            { id: "B", vector: [0, 1] },
            { id: "C", vector: [1, 1] },
          ],
        );
      return {
        metrics: [
          ["首位证据", o[0]!.id],
          ["最高余弦", o[0]!.similarity],
        ],
        trace: o,
      };
    },
  ),
  neural: studio(
    "ml",
    "用反向传播训练 XOR",
    "真实训练两层 tanh 网络。在固定的四个真值点比较损失和预测，观察初始化与学习率影响。",
    "计算",
    [
      control("rate", "学习率", 0.05, 1, 0.05, 0.7),
      control("epochs", "迭代轮次", 20, 500, 20, 500),
      control("seed", "初始化种子", 1, 20, 1, 7),
    ],
    ({ rate = 0.7, epochs = 500, seed = 7 }) => {
      const sample = [
        { x: [-1, -1], y: 0 },
        { x: [-1, 1], y: 1 },
        { x: [1, -1], y: 1 },
        { x: [1, 1], y: 0 },
      ];
      const o = fit("neural", sample, {
        ...initialOptions,
        rate,
        epochs,
        seed,
        k: 4,
        lambda: 0,
      });
      const predict = sample.map((row) => o.predict(row.x));
      return {
        metrics: [
          ["初始损失", o.losses[0]!],
          ["最后损失", o.losses.at(-1)!],
          [
            "训练真值点命中",
            predict.filter((p, i) => Number(p >= 0.5) === sample[i]!.y).length,
          ],
        ],
        trace: { predict, weights: o.weights },
        points: o.losses.map((y, x) => ({ x, y })),
      };
    },
  ),
  reinforce: studio(
    "ml",
    "走廊 Q-learning",
    "自己调整探索率、学习率和折扣，比较实际奖励与从 Q 表导出的策略。",
    "计算",
    [
      control("epsilon", "探索率", 0, 1, 0.05, 0.2),
      control("gamma", "折扣系数", 0, 1, 0.05, 0.9),
      control("length", "状态个数", 3, 9, 1, 5),
    ],
    ({ epsilon = 0.2, gamma = 0.9, length = 5 }) => {
      const o = trainCorridor(length, 120, 0.4, gamma, epsilon, 37);
      return {
        metrics: [
          ["最后一轮回报", o.returns.at(-1)!.y],
          ["当前位置的策略", o.policy[0]!],
          [
            "最后十轮平均回报",
            o.returns.slice(-10).reduce((sum, p) => sum + p.y, 0) / 10,
          ],
        ],
        trace: { q: o.rows, policy: o.policy },
        points: o.returns,
      };
    },
  ),
  quantization: studio(
    "ml",
    "对称整数权重量化",
    "降低位宽后重构权重，识别精度与表示大小的权衡。",
    "计算",
    [control("bits", "位宽", 2, 12, 1, 4)],
    ({ bits = 4 }) => {
      const input = [-0.73, 0.12, 0.41, 1.13, -1.2, 0],
        o = quantize(input, bits);
      return {
        metrics: [
          ["量化步长", o.scale],
          ["最大绝对误差", o.maxError],
          ["用位数（不含元数据）", input.length * bits],
        ],
        trace: { input, ...o },
      };
    },
  ),
  workload: studio(
    "systems",
    "服务容量与请求积压",
    "设置每轮处理量和队列上限。重放同一合成负载，观察吞吐、堆积与拒绝。",
    "模拟",
    [
      control("capacity", "每轮处理能力", 1, 12, 1, 4),
      control("limit", "含本轮入队的最大队列容量", 3, 30, 1, 12),
    ],
    ({ capacity = 4, limit = 12 }) => {
      const trace = workload([2, 6, 12, 8, 3, 1, 0, 0], capacity, limit),
        last = trace.at(-1)!;
      return {
        metrics: [
          ["完成请求", last.completed],
          ["累计拒绝", last.dropped],
          ["末轮积压", last.queued],
        ],
        trace,
        points: trace.map(({ time: x, queued: y }) => ({ x, y })),
      };
    },
  ),
  gateway: studio(
    "systems",
    "入口路由与幂等请求",
    "选择请求路径、身份和上游状态。按相同请求 ID 送两次，核对业务写入数。",
    "模拟",
    [
      control("auth", "凭证有效（1＝是）", 0, 1, 1, 1),
      control("online", "业务上游健康（1＝是）", 0, 1, 1, 1),
    ],
    ({ auth = 1, online = 1 }, path) => {
      const request = path.trim(),
        known = new Set<string>();
      const first = routeService(request, !!auth, !!online, "demo", known);
      if (first.accepted) known.add("demo");
      const retry = routeService(request, !!auth, !!online, "demo", known);
      return {
        metrics: [
          ["首次状态", first.status],
          ["重试状态", retry.status],
          ["实际新增数", Number(first.accepted) + Number(retry.accepted)],
        ],
        trace: { request, first, retry },
      };
    },
    { label: "虚构请求路径", initial: "/loans" },
  ),
  slo: studio(
    "systems",
    "服务等级与错误预算",
    "按实际计数计算 SLI。误差预算使用离散请求数。",
    "计算",
    [
      control("failed", "失败请求数", 0, 50, 1, 11),
      control("target", "SLO 百分比", 95, 99.9, 0.1, 99),
    ],
    ({ failed = 11, target = 99 }) => {
      const o = errorBudget(1000, 1000 - failed, target / 100);
      return {
        metrics: [
          ["SLI", o.sli],
          ["错误预算", o.budget],
          ["剩余预算", o.remaining],
        ],
        trace: o,
      };
    },
  ),
  federated: studio(
    "research",
    "联邦平均的实际参数更新",
    "在两组本机合成数据上独立更新一维模型。比较按样本数聚合与等权聚合。",
    "模拟",
    [
      control("second", "第二组目标值", -4, 8, 1, 4),
      control("rounds", "本地训练轮次", 1, 10, 1, 2),
    ],
    ({ second = 4, rounds = 2 }) => {
      const local = (target: number) => {
        let w = 0;
        for (let t = 0; t < rounds; t++) w -= 0.2 * (w - target);
        return w;
      };
      const a = local(1),
        b = local(second),
        weighted = (3 * a + b) / 4;
      return {
        metrics: [
          ["客户端 A 参数", a],
          ["客户端 B 参数", b],
          ["样本数加权参数", weighted],
          ["等权参数", (a + b) / 2],
        ],
        trace: { counts: [3, 1], local: [a, b], weighted },
      };
    },
  ),
  explanation: studio(
    "research",
    "可加模型的局部解释",
    "改变输入数值，计算两个特征相对于基准输入的输出贡献。",
    "计算",
    [
      control("x", "第一个输入特征", -4, 5, 0.25, 2),
      control("y", "第二个输入特征", -4, 5, 0.25, 3),
    ],
    ({ x = 2, y = 3 }) => {
      const first = 2 * x,
        second = -y,
        prediction = 1 + first + second;
      return {
        metrics: [
          ["基准预测", 1],
          ["第一个特征贡献", first],
          ["第二个特征贡献", second],
          ["最终预测", prediction],
        ],
        trace: { base: [0, 0], inputs: [x, y], formula: "1+2x-y" },
      };
    },
  ),
  privacy: studio(
    "research",
    "Laplace 计数机制",
    "比较 ε 对噪声尺度的影响。使用可重现课堂种子，只对合成布尔数据演示。",
    "模拟",
    [
      control("eps", "ε", 0.1, 3, 0.1, 1),
      control("seed", "演示种子", 1, 100, 1, 41),
    ],
    ({ eps = 1, seed = 41 }) => {
      const o = noisyCount([true, false, true, true, false], eps, seed);
      return {
        metrics: [
          ["真实计数（仅课堂）", o.count],
          ["机制尺度", o.scale],
          ["扰动后发布数", o.released],
        ],
        trace: o,
      };
    },
  ),
  fairness: studio(
    "research",
    "组间公平性诊断",
    "改变第二组分类阈值，比较组间选择率、真阳率和假阳率；阈值调整属于教学对照。",
    "计算",
    [control("threshold", "第二组阈值", 0.1, 0.95, 0.05, 0.5)],
    ({ threshold = 0.5 }) => {
      const y = [true, true, false, false, false],
        a = rates(
          y,
          [0.8, 0.6, 0.65, 0.32, 0.12].map((s) => s >= 0.5),
        ),
        b = rates(
          y,
          [0.85, 0.45, 0.55, 0.43, 0.32].map((s) => s >= threshold),
        );
      return {
        metrics: [
          ["选择率差 A−B", a.selection - b.selection],
          ["TPR 差 A−B", a.tpr! - b.tpr!],
          ["FPR 差 A−B", a.fpr! - b.fpr!],
        ],
        trace: { a, b },
      };
    },
  ),
};

export function runLab(
  id: string,
  values: Record<string, number>,
  text: string,
) {
  const lab = labs[id];
  if (!lab || text.length > 16000) throw Error("找不到实验或输入太长。");
  for (const { key, min, max } of lab.controls) {
    const value = values[key];
    if (
      value === undefined ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      throw Error("实验参数超出范围。");
  }
  return lab.run(values, text);
}
