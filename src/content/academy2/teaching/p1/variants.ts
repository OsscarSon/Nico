import type { Question } from "../schema";

const item = (prompt: string, answer: number) => ({ prompt, answer });
const models: Record<string, (n: number) => ReturnType<typeof item>> = {
  "fm-equations": (n) => item("解方程 3x + " + (n + 2) + " = " + (4 * n + 2) + "，填写 x。", n),
  "fm-polynomial": (n) => item("求 x³−2x+4 除以 x−" + n + " 的余数。", n ** 3 - 2 * n + 4),
  "fm-exponential": (n) => item("以 " + n + " 为底，" + n ** 3 + " 的对数是多少？", 3),
  "fm-sequences": (n) => item("等差数列首项为 " + n + "、公差 3，第七项是多少？", n + 18),
  "fm-dot": (n) => item("向量 (" + n + ",2) 与 (3,4) 的点积是多少？", 3 * n + 8),
  "fs-mean": (n) => item("两人组均值 " + n + "，四人组均值 " + (n + 3) + "。合并均值是多少？", n + 2),
  "fs-variance": (n) => item("样本 0、" + n + "、" + 2 * n + " 的样本方差是多少？", n * n),
  "fs-bayes": (n) =>
    item("100 个对象中 " + n + " 个真阳性、10 个假阳性。已知阳性后的真实比例是多少？", n / (n + 10)),
  "im-determinant": (n) => item("矩阵 [" + n + ",2; 3,4] 的行列式是多少？", 4 * n - 6),
  "im-derivative": (n) => item("f(x)=x³ 在 x=" + n + " 的切线斜率是多少？", 3 * n * n),
  "im-integral": (n) => item("求函数 2x 在 0 到 " + n + " 之间的定积分。", n * n),
  "im-gradient": (n) => item("f(x)=x²，从 x=" + 2 * n + " 用步长 1/4 走一步，新 x 是多少？", n),
  "is-expectation": (n) =>
    item("X 取 " + n + " 与 " + (n + 4) + "，概率分别为 1/4、3/4。求 E[X]。", n + 3),
  "is-variance": (n) => item("Var(X)=4，Var(" + n + "X−1) 是多少？", 4 * n * n),
  "is-sampling": (n) => item("总体标准差 " + 2 * n + "、独立样本数 16，样本均值标准误是多少？", n / 2),
  "is-ztest": (n) =>
    item(
      "A组有 " + 10 * n + " 次成功/100，B组有 " + (10 * n + 8) + " 次成功/100。输入 B−A 的百分点数。",
      8,
    ),
};
export function createVariant(id: string, seed: number, verification = false): Question | null {
  const model = models[id];
  if (!model) return null;
  const n = 2 + ((seed >>> 0) % 7),
    v = model(n);
  // Ensure that both the setting and the required computation change for verification.
  const followup =
    id === "fm-exponential"
      ? item("以 " + n + " 为底，" + n ** 4 + " 的对数是多少？", 4)
      : id === "is-ztest"
        ? item(
            "A组有 " +
              8 * n +
              " 次成功/100，B组有 " +
              (8 * n + 12) +
              " 次成功/100。输入 A−B 的百分点数。",
            -12,
          )
        : v;
  return {
    id: verification ? "parameter-verification" : "parameter-practice",
    type: "number",
    level: verification ? "transfer" : "application",
    ...(verification ? followup : v),
    allowFraction: true,
    tolerance: 0.0005,
    explanation: "计算正确。试着解释这一步为什么适用。",
    hint: "先写出模型与等式，再把题目给定的参数代入。",
  };
}

const grade = (id: string, prompt: string) => ({
  id,
  prompt,
  level: "analysis" as const,
  explanation: "核验通过。",
  hint: "按给出的维数、顺序或模型条件逐项复算。",
});
const opt = (id: string, label: string) => ({ id, label });
const field = (label: string, answer: number, hint: string) => ({
  label,
  answer,
  hint,
  tolerance: 1e-8,
});
export const extendedQuestions: Record<string, Question[]> = {
  "im-matrix": [
    {
      ...grade("matrix-product", "求矩阵 [1,2;0,1] 与 [2,0;3,1] 的乘积，按行填写。"),
      type: "matrix",
      answer: [
        [8, 2],
        [3, 1],
      ],
      tolerance: 1e-8,
    },
  ],
  "im-systems": [
    {
      ...grade("elimination-order", "将主元为零的方阵化为 RREF。排列本列的三个动作。"),
      type: "order",
      options: [
        opt("normalize", "归一化主元"),
        opt("eliminate", "消去本列其他行"),
        opt("swap", "找到非零主元并交换到当前行"),
      ],
      answer: ["swap", "normalize", "eliminate"],
    },
  ],
  "is-variable": [
    {
      ...grade("match-models", "将每个概念与输出匹配。"),
      type: "match",
      options: [
        opt("mass", "点概率"),
        opt("density", "区间积分能给概率"),
        opt("cdf", "不超过阈值的概率"),
      ],
      rows: [
        { label: "CDF", answer: "cdf" },
        { label: "PMF", answer: "mass" },
        { label: "PDF", answer: "density" },
      ],
    },
  ],
  "is-ci": [
    {
      ...grade("interval-fields", "均值 20，标准误 1.5，临界值取 2。填入区间与误差幅度。"),
      type: "fields",
      fields: [
        field("误差幅度", 3, "标准误乘临界值。"),
        field("下界", 17, "均值减幅度。"),
        field("上界", 23, "均值加幅度。"),
      ],
    },
  ],
  "fm-equations": [
    {
      ...grade("solve-in-steps", "按步骤解 −2(x−1)≥6，先整理成 −2x≥c，再写出 x 的上界。"),
      type: "steps",
      fields: [field("右端 c", 4, "展开 −2x+2，然后移项。"), field("上界", -2, "除以负数要反向。")],
    },
  ],
  "fs-mean": [
    {
      ...grade(
        "code-mean",
        "实现 Python 函数 mean(values)，返回非空数列的算术平均；对多组输入实际运行检查。",
      ),
      type: "program",
      functionName: "mean",
      starter: "def mean(values):\n    # 返回总和除以项数\n    return None",
      cases: [
        { args: [[1, 2, 6]], expected: 3 },
        { args: [[-8, 2]], expected: -3 },
        { args: [[4.5]], expected: 4.5 },
      ],
      tolerance: 1e-8,
    },
  ],
};
