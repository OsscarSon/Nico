import { algorithmKey, type AlgorithmCourse } from "./registry";

export const projectsP2 = {
  "foundation-algorithms": {
    title: "制作可重播的算法可视化工具",
    brief:
      "为初学者整理一组可复现实验，将真实比较轨迹导出成可单步浏览的独立 HTML。",
    steps: [
      "用同一组自定义数据运行插入、选择和归并排序，核对三个输出。",
      "再用另一组包含重复值的数据对比。解释何时比较次数发生变化。",
      "选择一个轨迹，导出独立播放器和实验报告。",
    ],
    rubric:
      "自动核验两组数据、三个有序输出和重复值情景。人工检查复杂度解释、为何选择该案例以及可视化是否能指出关键步骤。",
    reading: ["sorting", "cost"],
  },
  "intermediate-algorithms": {
    title: "最短路径求解器与算法竞赛训练",
    brief: "给地图编辑器选择最短路策略，再用背包和有序两数之和做赛前练习。",
    steps: [
      "用自己的非负图比较 Dijkstra 和 Bellman–Ford，再构造含负边但最短路有界的图。",
      "求解背包或有序两数之和，说明状态或指针淘汰理由。",
      "用一个微型负环案例验证求解器会报告无法定义的最短路，最后导出报告。",
    ],
    rubric:
      "自动核验非负图、负边和影响终点的负环、竞赛练习。人工检查输入假设、策略选择、路径与复杂度分析。",
    reading: ["dijkstra", "bellman", "dp", "pointers"],
  },
  "advanced-algorithms": {
    title: "高级算法工具库与性能基准",
    brief:
      "构建并验证可互换的区间和工具，再分别比较节点访问次数和真实运行时间。",
    steps: [
      "设计混合的点更新及至少两条区间查询，并用朴素扫描核验全部结果。",
      "增加一组有重叠匹配的字符串测试，说明报告中的下标约定。",
      "使用两种规模重复基准，辨别预热、规模、计时噪声与理论差异。",
    ],
    rubric:
      "自动核验两个区间结构的全量查询、重叠匹配及两种规模基准。人工检查可复现性、计时限制和对高风险边界的解释。",
    reading: ["segment", "fenwick", "kmp", "amortized"],
  },
} satisfies Record<
  AlgorithmCourse,
  {
    title: string;
    brief: string;
    steps: string[];
    rubric: string;
    reading: string[];
  }
>;

export const projectReading = (course: AlgorithmCourse) =>
  projectsP2[course].reading.map((key) => algorithmKey(key)!);
