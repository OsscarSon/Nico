import type { Question } from "../../../content/academy2/teaching/schema";

const applicable = new Set([
  "csv",
  "json",
  "missing",
  "outliers",
  "standard",
  "group",
  "sql",
  "join",
  "window",
  "classification",
  "logistic",
  "linear",
  "neural",
  "knn",
  "softmax",
  "cluster",
  "rules",
  "astar",
  "minimax",
]);

export function dataVariant(
  lab: string,
  recipe: string | undefined,
  seed: number,
  verification = false,
): Question | undefined {
  const name = recipe ?? lab;
  if (!applicable.has(name)) return undefined;
  const random = [17, 39, 71, 103].map(
    (value) => 1 + ((Math.imul(seed + value, value * 29) >>> 0) % 11),
  );
  const [a, b, c, d] = random as [number, number, number, number];
  const xy = (x: number, y: number) => [x, y] as const;
  let example: string = "",
    answer = 0,
    explanation = "";
  switch (name) {
    case "csv":
    case "json":
    case "sql":
      example = `a 列有 ${a} 个有效数字、${b} 个缺失。求有效记录数。`;
      answer = a;
      explanation = "只数非空记录。";
      break;
    case "missing":
    case "outliers":
      example = `源观测为 ${a}、缺失、${a + 2 * b}。求有效观测中位数。`;
      answer = a + b;
      explanation = "两点间取中间值。";
      break;
    case "standard":
      example = `训练均值 ${a}、标准差 ${b}，求观测 ${a + c * b} 的 z 值。`;
      answer = c;
      explanation = "先减训练均值，再除训练标准差。";
      break;
    case "group":
      example = `A 组有 ${a} 项、均值 ${b}；B 组有 ${c} 项、均值 ${d}。求汇总均值。`;
      answer = (a * b + c * d) / (a + c);
      explanation = "以有效观察数给各组加权。";
      break;
    case "join":
      example = `左表 A 键有 ${a} 行、右表 A 键有 ${b} 行，左表 B 键 ${c} 行且右表无 B。LEFT JOIN 一共几行？`;
      answer = a * b + c;
      explanation = "把匹配组合和无匹配左行相加。";
      break;
    case "window": {
      const n = 2 + (a % 4);
      const setup = [...Array<number>(n).fill(a + b), a];
      example = `窗口按值降序为 ${setup.join("、")}。最后一项的 RANK？`;
      answer = n + 1;
      explanation = "并列项都占据实际排序位置。";
      break;
    }
    case "classification":
      example = `TP=${a}、FP=${b}、FN=${c}，求 F1。`;
      answer = (2 * a) / (2 * a + b + c);
      explanation = "从 TP、FP、FN 合并比值。";
      break;
    case "logistic":
      example = `单个观测 x=${a}，标签 1，当前 w=b=0。二元交叉熵对 w 的导数是多少？`;
      answer = -a / 2;
      explanation = "预报 1/2，输出误差传给输入权重。";
      break;
    case "linear":
      example = `直线经过 (0,${a}) 与 (2,${a + 2 * b})，求 x=${c} 的预测。`;
      answer = a + b * c;
      explanation = "固定截距，按两点求单位斜率。";
      break;
    case "neural":
      example = `隐藏值 0，输出权重 ${a}，预测 0.5，标签 1，输入 ${b}。求一层权重梯度。`;
      answer = (-a * b) / 2;
      explanation = "tanh 在隐藏值 0 时导数为 1。";
      break;
    case "knn":
      example = `回归 KNN 最近两个邻居的目标分别 ${a} 与 ${b}，等权预测是多少？`;
      answer = (a + b) / 2;
      explanation = "回归对邻居目标取均值。";
      break;
    case "softmax":
      example = `两个候选的未归一化 Gibbs 权重为 ${a} 与 ${b}。第一个候选的概率？`;
      answer = a / (a + b);
      explanation = "以两个正权重的总和为分母。";
      break;
    case "cluster":
      example = `单簇已有观测 ${a}、${a + 2 * b}。求更新后的质心。`;
      answer = a + b;
      explanation = "平方误差最小由样本均值达到。";
      break;
    case "rules":
      example = `规则链共有 ${a + 2} 个不同事实，每个推出下一项。只给第一个事实，能新增多少项？`;
      answer = a + 1;
      explanation = "从起点沿规则链依次添加。";
      break;
    case "astar": {
      const goal = xy(a, b);
      example = `四邻域单位网格，无障碍，从 (0,0) 到 (${goal.join(",")}) 需要多少步？`;
      answer = a + b;
      explanation = "按横纵分别计至少的步数，且可达到。";
      break;
    }
    case "minimax":
      example = `深度 2 的二叉树叶按序 ${a},${b},${c},${d}，根为 MAX，求极小极大值。`;
      answer = Math.max(Math.min(a, b), Math.min(c, d));
      explanation = "先两组取小，再从组结果取大。";
      break;
  }
  return {
    id: (verification ? "p3-verify-" : "p3-variant-") + name + "-" + seed,
    level: verification ? "transfer" : "application",
    type: "number",
    prompt: example,
    hint: "写出每一步使用的统计量、规则或输入边界。",
    explanation,
    answer,
    tolerance: 0.0005,
    allowFraction: true,
    allowPercent: true,
  };
}
