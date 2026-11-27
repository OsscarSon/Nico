import type { DataCourse } from "./registry";
export const projectsP3 = {
  "foundation-data-science": {
    title: "纽约每日空气质量 Dashboard",
    summary: "从原始气象表检查臭氧缺失，再制作可筛选的统计图与结论。",
    steps: [
      "打开原始 Air Quality，记录环境与测量单位。检查 37 个缺失臭氧值。",
      "执行一项改变表的清洗。记录两种有效图表，再按月透视汇总。",
      "说明分析只覆盖观测时期和地点。导出数据、图和报告。",
    ],
  },
  "intermediate-data-science": {
    title: "可复现的空气质量 SQL 数据库",
    summary: "从实际日记录建立月度汇总，并用独立的逐行计算核验窗口指标。",
    steps: [
      "保留原始 Air Quality。输入查询获取五个月的月号、有效臭氧天数、平均值、累计有效天数。",
      "用 CTE 表示月份和汇总，LEFT JOIN 保留全月份，再用窗口计算累计量。验证完整覆盖。",
      "保存 SQL、报告与 SQLite 数据库。说明空值、单位和局限。",
    ],
  },
  "foundation-ai": {
    title: "小型分类模型与可追踪资料助手",
    summary:
      "训练实际 Iris 分类模型，并创建一个会引用三份资料、证据不足时拒答的助手。",
    steps: [
      "使用二元分类，从花朵测量预测是否为选定物种。记录种子、预测目标及验证指标。",
      "编辑三份本地资料，并验证查询、文档归属和低分拒答。",
      "报告分类不同错误与证据不足的处理规则。",
    ],
  },
  "intermediate-ai": {
    title: "对照两种学习模型的研究报告",
    summary:
      "用相同切分、目标和预处理比较两个实际模型，再解释最终测试、泛化与限度。",
    steps: [
      "选择数据集与目标并说明数据生成方式。拟合预处理和一个基线模型。",
      "固定种子、目标和特征，用同一验证集训练另一模型。完成至少一次训练集内交叉验证。",
      "锁定模型后查看留出指标，记录分析假设、部署时点、泛化与限制。",
    ],
  },
} satisfies Record<
  DataCourse,
  { title: string; summary: string; steps: string[] }
>;
