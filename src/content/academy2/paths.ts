export const personalPaths = [
  { id: "data-science", title: "数据科学", english: "Data Science", intro: "从数学习惯与 Python 出发，用 SQL 分析数据，再进入建模和数据管道。", steps: [
    ["数学", "foundation-mathematics"], ["统计学", "foundation-statistics"], ["Python", "foundation-programming"],
    ["SQL", "intermediate-data-science", "sql"], ["数据分析", "intermediate-data-science", "analysis"],
    ["机器学习", "intermediate-ai", "supervised"], ["数据工程", "advanced-data-science", "pipelines"],
  ] },
  { id: "artificial-intelligence", title: "人工智能", english: "Artificial Intelligence", intro: "把数学、概率和算法变成能训练、评估和交付的智能系统。", steps: [
    ["数学", "foundation-mathematics"], ["概率论", "intermediate-statistics", "variables"], ["Python", "foundation-programming"],
    ["算法", "intermediate-algorithms"], ["机器学习", "intermediate-ai"], ["深度学习", "advanced-ai", "deep-models"], ["AI Systems", "advanced-ai", "mlops"],
  ] },
  { id: "computer-science", title: "计算机科学", english: "Computer Science", intro: "从离散数学与程序推理出发，连接底层系统、算法与软件工程。", steps: [
    ["离散数学", "intermediate-mathematics", "discrete"], ["编程", "foundation-programming"], ["数据结构", "intermediate-algorithms", "structures"],
    ["计算理论", "advanced-algorithms", "computability"], ["计算机系统", "intermediate-systems"], ["软件工程", "intermediate-software"], ["分布式系统", "advanced-systems", "distributed"],
  ] },
  { id: "data-engineering", title: "数据工程", english: "Data Engineering", intro: "连接 Python、SQL 和底层系统，设计可以长期运行的数据管道。", steps: [
    ["Python", "foundation-programming"], ["SQL", "intermediate-data-science", "sql"], ["数据库", "intermediate-data-science", "database-design"],
    ["Linux", "intermediate-systems", "os"], ["分布式系统", "advanced-systems", "distributed"], ["数据管道", "advanced-data-science", "pipelines"], ["云平台", "advanced-systems", "production"],
  ] },
  { id: "software-engineering", title: "软件工程", english: "Software Engineering", intro: "从编程与 Web 到团队协作、应用架构和可观测的生产系统。", steps: [
    ["编程", "foundation-programming"], ["算法", "foundation-algorithms"], ["Web", "foundation-software"], ["数据库", "intermediate-data-science", "database-design"],
    ["软件设计", "intermediate-software", "design"], ["系统架构", "advanced-software", "architecture"], ["DevOps", "advanced-software", "operations"],
  ] },
  { id: "statistics", title: "统计学", english: "Statistics", intro: "从数学基础进入概率和统计推断，最后尝试贝叶斯建模与因果分析。", steps: [
    ["微积分", "intermediate-mathematics", "calculus"], ["线性代数", "intermediate-mathematics", "linear-algebra"], ["概率论", "intermediate-statistics", "variables"],
    ["统计推断", "intermediate-statistics", "inference"], ["统计建模", "advanced-statistics", "modeling"], ["贝叶斯", "advanced-statistics", "bayesian"], ["因果推断", "advanced-statistics", "causal"],
  ] },
] as const;

export type PersonalPathId = (typeof personalPaths)[number]["id"];
export const getPersonalPath = (id: string) => personalPaths.find(path => path.id === id);

export const studyAllocation = [
  ["数学", 20], ["统计学", 15], ["编程", 15], ["算法", 15], ["人工智能", 15], ["数据科学", 10], ["其它领域", 10],
] as const;

export const studyTimeline = [
  ["SPM 后的假期", "Python、函数、向量、描述统计"],
  ["2027 高三上半年", "概率、基础算法、SQL、线性代数入门"],
  ["统考备考期间", "优先准备统考，Nico 用于复习"],
  ["统考结束后", "Pandas、微积分、数据结构、统计推断"],
  ["大学入学前", "机器学习基础与完整数据分析项目"],
  ["大学一至二年级", "完成中阶核心课程"],
  ["大学三年级以后", "探索进阶与专项研究"],
] as const;
