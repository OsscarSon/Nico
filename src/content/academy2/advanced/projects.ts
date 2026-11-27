export const projectLabs: Record<
  string,
  {
    name: string;
    lab: string;
    task: string;
    primary: string;
    companion?: string[];
    reference?: { title: string; url: string };
  }
> = {
  "intermediate-programming": {
    name: "用 Python 与 TypeScript 核对学习记录",
    lab: "study-log",
    task: "先在浏览器的 TypeScript 实验和两份 CSV 中核对总计。再独立实现 Python 聚合，比较两种语言的类型转换、错误范围和边界。",
    primary: "总分钟",
  },
  "foundation-programming": {
    name: "Python 学习时长管理工具",
    lab: "study-log",
    task: "用 CSV 对照汇总合法时长和拒收结果。随后在 Python 判题里实现同样的纯函数，完成实跑和种子变式。",
    primary: "总分钟",
  },
  "foundation-security": {
    name: "数据发布与资料可信度审查",
    lab: "privacy",
    task: "使用合成资料，比较两个隐私参数与发布值。报告完成前核对必要字段、可信来源、不能做的解释及访问权限。",
    primary: "机制尺度",
  },
  "intermediate-security": {
    name: "防御性系统审查与研究报告",
    lab: "adjustment",
    task: "固定合成观测，改目标总体权重并记录风险差。结合威胁模型描述访问控制、数据范围与残余风险。",
    primary: "调整风险差",
  },
  "intermediate-systems": {
    name: "虚拟计算机与企业网络核验",
    lab: "virtual",
    task: "比较虚拟地址读写的权限差异。再运行调度、租约和拥塞模拟，借企业网络旧课复核路由隔离。",
    primary: "状态",
    companion: ["scheduling", "lease", "congestion"],
    reference: { title: "企业网络工程 · 原版互动", url: "#/lesson/a-i04" },
  },
  "advanced-mathematics": {
    name: "数值算法误差报告",
    lab: "integrate",
    task: "用两种分段数分别运行积分。解释不同误差阶的证据，并讨论非光滑函数会带来什么变化。",
    primary: "Simpson 误差",
    companion: ["optimization"],
  },
  "advanced-statistics": {
    name: "统计建模、预测与分层分析",
    lab: "bootstrap",
    task: "保持种子，改变离群观测并比较 Bootstrap 区间。另运行时间切分和风险分层，解释差异及各方法假设。",
    primary: "标准误",
    companion: ["ar", "adjustment"],
  },
  "advanced-programming": {
    name: "表达式解释器与字节码对照",
    lab: "compiler",
    task: "用两个表达式检查优先级和结合性，至少包含一个可折叠的子表达式。说明为何两个执行器吻合。",
    primary: "解释/编译结果",
  },
  "advanced-systems": {
    name: "节点隔离演练",
    lab: "quorum",
    task: "保持一个集群规模，设置可选举与无法选举的情况。运行复制和两阶段提交，分开记录三种安全性证据。",
    primary: "选举结果",
    companion: ["replication", "transactions"],
  },
  "advanced-data-science": {
    name: "可复现批处理与质量检查",
    lab: "pipeline",
    task: "运行一个包含错误或重复事件的批次。修复输入并复跑，再观察重放与迟到事件，报告批处理和流处理的边界。",
    primary: "拒收",
    companion: ["streaming"],
  },
  "advanced-ai": {
    name: "小型模型训练与配置对照",
    lab: "neural",
    task: "用相同的 XOR 数据训练两次，改变一种配置。比较实际损失，解释在四个训练点验证的局限。",
    primary: "最后损失",
    companion: ["quantization", "attention"],
  },
  "advanced-software": {
    name: "服务等级与容量决策",
    lab: "slo",
    task: "在同一目标下运行一个预算内场景和一个超预算场景。以两份可复算结果提出短期应对。",
    primary: "剩余预算",
    companion: ["workload", "gateway"],
  },
  "advanced-security": {
    name: "独立复算机会均等指标",
    lab: "fairness",
    task: "按 Hardt、Price 与 Srebro 的 equal opportunity 定义，在同一合成标签下对比两个阈值。复算 TPR 差、说明样本与原论文的范围，并核对一个替代发布机制。",
    primary: "TPR 差 A−B",
    companion: ["privacy"],
    reference: {
      title: "Equality of Opportunity in Supervised Learning",
      url: "https://arxiv.org/abs/1610.02413",
    },
  },
};
