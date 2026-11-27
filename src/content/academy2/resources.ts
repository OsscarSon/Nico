export const laboratories = [
  { id: "math", title: "数学实验室", english: "Math Lab", intro: "拖动系数，看函数如何变化。", available: true, primary: "一次与二次函数绘图", planned: "矩阵变换、特征向量、微积分、梯度下降、数值优化", course: "foundation-mathematics", links: [] },
  { id: "statistics", title: "统计实验室", english: "Statistics Lab", intro: "改变样本量，观察抽样分布的形状。", available: true, primary: "伯努利抽样与样本比例", planned: "假设检验、Bootstrap、Monte Carlo、贝叶斯更新、A/B Test", course: "foundation-statistics", links: [] },
  { id: "algorithms", title: "算法竞技场", english: "Algorithm Arena", intro: "输入自己的数据，回放真实执行路径，比较操作次数与复杂度。", available: true, primary: "搜索、排序、数据结构、图算法、计算模型", planned: "", course: "foundation-algorithms", links: [["数据结构实验", "/lesson/b-i06"]] },
  { id: "ml", title: "模型训练实验室", english: "ML Playground", intro: "从 AI 测评和检索实验开始，理解怎样检查模型输出。", available: false, primary: "现有 AI 练习", planned: "上传数据、训练模型、学习率、Loss、混淆矩阵及过拟合比较", course: "intermediate-ai", links: [["AI 助手评测", "/lesson/c18-assistant-project"], ["RAG 工程", "/lesson/c-i05"], ["Prompt 训练场", "/lab/prompt"]] },
  { id: "data", title: "数据科学工作台", english: "Data Studio", intro: "通过现有实验练习清洗、表格、查询与数据呈现。", available: false, primary: "现有数据练习", planned: "整合数据集、Python、SQL、清洗、统计与图表的 Notebook 工作区", course: "foundation-data-science", links: [["Python 与 CSV", "/lesson/b-i01"], ["查询与事务", "/lesson/b-i05"], ["数据发布与自动化项目", "/courses/foundation-data-science?module=stories"]] },
  { id: "research", title: "科研中心", english: "Research Hub", intro: "按领域阅读公开课程、教材与参考框架。", available: false, primary: "公开资源索引", planned: "论文复现任务、研究笔记、实验记录、引用管理与研究报告", course: "intermediate-security", links: [["查看公开教材与课程", "/resources"]] },
  { id: "systems", title: "计算机系统实验室", english: "Systems Lab", intro: "使用位开关、CPU、操作系统和网络实验。", available: true, primary: "位开关与现有系统实验", planned: "内存分配、进程调度、死锁、数据库事务与分布式系统实验", course: "foundation-systems", links: [["逻辑门", "/lesson/a03-logic-gates"], ["CPU 取指执行", "/lesson/a05-cpu-cycle"], ["操作系统", "/lesson/a07-os"], ["TCP 三次握手", "/lesson/a14-tcp"], ["网络工程", "/lesson/a-i04"]] },
] as const;

export const universityResources = [
  ["Harvard CS50", "计算机科学与编程基础", "https://cs50.harvard.edu/x/"],
  ["MIT OpenCourseWare", "线性代数、微积分、算法、概率", "https://ocw.mit.edu/"],
  ["Stanford CS229", "机器学习", "https://cs229.stanford.edu/"],
  ["Stanford CS231n", "深度学习与计算机视觉", "https://cs231n.stanford.edu/"],
  ["Stanford CS224N", "自然语言处理", "https://web.stanford.edu/class/cs224n/"],
  ["Berkeley Data 8", "数据科学基础", "https://www.data8.org/"],
  ["Berkeley Data 100", "数据科学原理与技术", "https://ds100.org/"],
  ["OpenIntro", "概率与统计学", "https://www.openintro.org/book/os/"],
  ["CMU Database Group", "数据库系统", "https://db.cs.cmu.edu/"],
  ["OSSU Computer Science", "计算机科学开放学习路线", "https://github.com/ossu/computer-science"],
  ["Operating Systems: Three Easy Pieces", "操作系统", "https://pages.cs.wisc.edu/~remzi/OSTEP/"],
  ["Nand2Tetris", "计算机底层原理", "https://www.nand2tetris.org/"],
  ["Dive into Deep Learning", "深度学习理论与实践", "https://d2l.ai/"],
  ["ACM / IEEE-CS / AAAI CS2023", "计算机科学课程框架", "https://csed.acm.org/"],
  ["MIT · Artificial Intelligence and Decision Making", "人工智能本科参考体系", "https://www.eecs.mit.edu/academics/undergraduate-programs/curriculum/6-4-artificial-intelligence-and-decision-making/"],
] as const;

export const teachingStandard = [
  ["概念", "Concept", "定义、概念与实际应用"],
  ["理论", "Theory", "数学原理、推导与证明"],
  ["可视化", "Visualization", "图像、动画与交互演示"],
  ["完整例题", "Worked Example", "完整推导与解题过程"],
  ["从零实现", "Implementation", "动手实现原理"],
  ["工具实务", "Library Practice", "使用专业库与真实工具"],
  ["互动实验", "Interactive Lab", "自主操作、检查输出"],
  ["练习", "Exercises", "基础题、应用题、挑战题"],
  ["评估", "Assessment", "检验知识与操作能力"],
  ["常见误区", "Common Mistakes", "辨别错误形成的原因"],
  ["参考资料", "References", "公开课程、教材及研究论文"],
  ["综合项目", "Project", "把知识用于可验证的成果"],
] as const;

export const roadmap = [
  ["P0", "重构课程架构", "10 个领域、30 个入口、层级、先修及旧课迁移。", "架构已接入"],
  ["P1", "补齐数学与统计学", "先完成基础和中阶课，并扩展数学及统计实验。", "初始实验可用"],
  ["P2", "独立算法体系", "从数据结构、算法设计到计算理论，扩展算法竞技场。", "初始实验可用"],
  ["P3", "数据科学与机器学习", "完善数据库、统计建模和训练工具。", "规划中"],
  ["P4", "大学进阶课程", "深度学习、高等统计、分布式系统与科研方法。", "规划中"],
  ["P5", "跨领域扩展", "游戏、图形学、硬件、科学计算与其他选修。", "规划中"],
] as const;
