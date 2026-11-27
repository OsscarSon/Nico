import type { Output } from "./workbench";

export const rubrics: Record<string, readonly string[]> = {
  "foundation-mathematics": [
    "配置 1、3 两根与指定首项系数，通过三项独立数值证据（自动）。",
    "保留一次对照运行，说明系数变化如何影响交点、顶点或开口。",
    "解释使用精确求解检查图像的方法。陈述实验绘图区间或数值近似的限制。",
  ],
  "foundation-statistics": [
    "样本选择、单位、Iris 资料来源及三项统计核验（自动）。",
    "保存总体样本或另一物种作对照，在相同坐标变量下比较散点与相关。",
    "报告抽样及外推边界，区分相关与因果。",
  ],
  "intermediate-mathematics": [
    "矩阵方向变化、下降目标与 BFS 距离达到配置要求，提交三个独立读数（自动）。",
    "至少更改矩阵、步长或图边其中之一作对照，解释变化来自哪一模型。",
    "说明小矩阵、二次目标和无权图的适用范围。以库函数或手算复核。",
  ],
  "intermediate-statistics": [
    "随机化单位、两组计数和近似适用性合格，通过效应、p 值、区间下限证据（自动）。",
    "对照另一场景并说明门槛、统计决策与实际上线判断的差别。",
    "报告未确定的效果范围、重复观测或可选停止局限，强调教学计数为模拟。",
  ],
};
export type ReportData = {
  title: string;
  settings: readonly (readonly [string, string])[];
  measures: Output["values"];
  reference?: string;
  note: string;
  limits: string;
  measuredEvidence: { prompt: string; answer: string }[];
  comparison?: { settings: readonly (readonly [string, string])[]; measures: Output["values"] };
  readings: readonly (readonly [string, string])[];
};
const bullet = ([key, val]: readonly [string, string | number]) => "- " + key + "：" + val;
export function projectMarkdown(report: ReportData) {
  return [
    "# " + report.title,
    "## 任务与输入",
    ...report.settings.map(bullet),
    "## 计算结果",
    ...report.measures.map(bullet),
    "## 独立数值证据（已通过自动核验）",
    ...report.measuredEvidence.map(({ prompt, answer }) => bullet([prompt, answer])),
    ...(report.comparison
      ? [
          "## 对照运行",
          "### 参数",
          ...report.comparison.settings.map(bullet),
          "### 输出",
          ...report.comparison.measures.map(bullet),
        ]
      : []),
    "## 研究解释（人工复核）",
    report.note || "此部分尚未填写。",
    "## 局限（人工复核）",
    report.limits || "此部分尚未填写。",
    "## 数据与教材",
    ...(report.reference ? ["测量原始资料：" + report.reference] : []),
    ...report.readings.map(bullet),
  ].join("\n\n");
}
