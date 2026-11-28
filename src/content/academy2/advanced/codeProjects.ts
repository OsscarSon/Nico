export const codeProjects: Record<
  string,
  { task: string; path: string; notebook: string }
> = {
  "advanced-mathematics": {
    task: "numerical",
    path: "numerical.py",
    notebook:
      "实现带主元的线性求解、Simpson 积分和 RK4。提交步长敏感性表及异常输入。",
  },
  "advanced-programming": {
    task: "language",
    path: "language.py",
    notebook:
      "实现整数语言的词法、语法和解释器。提交程序、AST、输出和至少两个错误用例。",
  },
  "advanced-systems": {
    task: "distributed",
    path: "distributed.py",
    notebook:
      "在独立本机进程中发送分片，重启未返回的工作进程。对照单进程聚合。",
  },
  "advanced-data-science": {
    task: "pipeline",
    path: "pipeline.py",
    notebook:
      "交付从事件 JSONL 到可查询 SQLite 的数据管道。记录拒收、冲突、重放和迟到。",
  },
  "advanced-ai": {
    task: "ai",
    path: "verify.py",
    notebook:
      "在本机实际训练、冻结和重载模型。验证独立测试点、版本契约和非法请求。",
  },
  "advanced-software": {
    task: "service",
    path: "service.py",
    notebook: "设计幂等持久写入。报告真实本机负载、p95、冲突及备份恢复验证。",
  },
  "advanced-security": {
    task: "paper",
    path: "paper.py",
    notebook:
      "复现 Dijkstra 1959 的最小生成树和最短路径。用图枚举及 Floyd–Warshall独立复算。",
  },
};
