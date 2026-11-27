# P2 数据结构与算法实施及验收

基于合并 PR #22 的主分支提交 `ecc53ad`，沿用 Nico Academy 2.0 的三阶段课程入口、稳定 ID、教学组件和学习记录。Word 蓝图的逐知识点对照见 [覆盖表](COVERAGE.md)。

## 教学和交互

- Foundation 从循环不变量与程序终止进入真实搜索、三种排序、数组、链表、栈、环形队列、散列冲突、递归、树与图。排序比较使用同一输入及同一种键比较单位。实践项目核查两组不同数据并导出可以离线单步执行的 HTML 轨迹播放器。
- Intermediate 从量化渐近界和递推推导进入结构不变量、图与算法设计。课程覆盖失衡 AVL 的双旋、惰性堆、非负图最短路与负环影响范围、交换论证、剪枝完备性以及背包原地更新次序。实践项目运行非负图、带负边图和负环回归，并完成一类竞赛题。
- Advanced 用势能证明、区间分解、失败链接、增广路、竞争比、参数化递推及对角反证连接算法和计算理论。3SAT 与 CLIQUE 实验会按文字出现构建实例，枚举小图最大团，并标明构造成本和搜索成本。实践项目用朴素扫描和逐位置匹配核验区间结构与字符串，实测两种规模的五轮查询及更新。
- 竞技场支持编辑输入、逐步播放、暂停、回退、定位、倍速和运行报告。图、AVL、凸包使用原生 SVG。快照记录操作、容器状态和变量值。复杂度比较按教学模型声明的操作单位，性能基准以浏览器时钟记录。
- 每页四道分层核验。通过前三道才取得完成状态。独立迁移题可以更新掌握记录。22 种模型提供使用独立种子的参数核验。17 个 Python 任务支持编辑、实际执行、公开边界用例和两组新种子的独立编程核验。独立编程核验的期望值由纯函数中的朴素算法或封闭式计算得出。
- 分步例题、KaTeX、公式及例题收藏、笔记、最近学习、术语、全文搜索、AI 导师与统一备份复用 P1.5。知识图谱的 Required、Recommended 和 Related 由内容关系手写。先修自评仍独立于掌握记录。
- 三个实践项目可保存、恢复及导出。自动评分核对运行数据、输入条件、参考计算与报告齐备性。研究解释、设计权衡与报告质量按页面量规人工审阅。

## 验证方法

- 逐题核对 240 道核心题的预期值和边界。单元回归另外用原生排序、Floyd–Warshall、枚举最小割和顶点覆盖、背包枚举、朴素区间与字符串扫描、穷举布尔赋值验证代表性算法。全部课时和公式经过 Schema 和 KaTeX 检查。
- CPython 运行 17 组手写及真实标准库实现。静态与可复现变式共运行 2,386 次，结果与题库期望一致。Playwright 另在应用正常入口实际运行 Pyodide WebAssembly，核验错解、正确解和双栏输出。
- Playwright 在 1440px、390px、360px 验证课时、键盘回放、判分、项目及下载。在 390px 逐页打开全部 60 个算法课时，并把掌握成绩、题库、笔记和四份实际报告恢复到另一浏览器上下文。AI 开启分支用本地测试响应核验公开课时信息和实验字段，关闭时课程继续独立可用。
- 截图和运行命令见 [浏览器验收](../qa/academy-2-p2/README.md)。

## 开源选型与性能

| 项目 | 维护及许可 | 选择 |
| --- | --- | --- |
| 原生 SVG、React、TypeScript | 项目已使用 React 与 TypeScript | 用现有渲染和状态组件重放纯函数快照。课时、竞技场、项目、公式及 Python 运行环境按使用入口加载。 |
| CodeMirror、Pyodide、Vitest、Playwright、KaTeX | P1.5 已集成 | 沿用现有编辑器、浏览器运行沙箱、测试框架和公式回退。 |
| D3 7.9.2 | ISC，npm 元数据最近更新 2026-11-03 | 布局和点图规模小，原生 SVG 支持所需投影及交互。 |
| Cytoscape.js 3.35.0 | MIT，npm 元数据最近更新 2026-11-10 | 适用于更复杂的大图布局。本轮输入有教学规模上限，图布局无需加载第二个运行时。 |
| Mermaid 12.3.0 | MIT，npm 元数据最近更新 2026-11-26 | 适合声明式流程图。本轮逐帧来自可核验算法状态，直接绘制保留完整的更新控制。 |

本轮不新增运行依赖。包风险与体积评估以实际构建产物及是否需要加载第三方代码为依据。许可证及版本用 npm 注册表元数据核对。[D3](https://www.npmjs.com/package/d3) · [Cytoscape.js](https://www.npmjs.com/package/cytoscape) · [Mermaid](https://www.npmjs.com/package/mermaid)

## 已知限制

- 全部新课为草稿，仍需真实学员试学和独立教学审核。
- 动画面向小规模输入。数组及图条目和轨迹帧都有上限。编辑过大或无效的输入会显示验证反馈。下载的 Markdown 历史保留前 180 帧，完整轨迹可用原输入重新运行。
- 真实运行时间由当前浏览器、数据分布、预热和系统负载决定。不同模型的操作计数按各单位解释。技术报告的结论需要结合理论界。
- 从零与库对照的部分标准库方案是简单基准。课程标注了适用边界，如后缀切片需要二次空间。Pyodide 最初加载固定版本的官方资源，加载异常保留已有反馈。
- AI 接口以本地测试响应验收。真实服务凭据和真实学员数据无需参与验收。

## 变更文件

| 区域 | 文件 |
| --- | --- |
| 教学内容 | `src/content/academy2/algorithms/{registry,index,authoring,foundation,intermediate,advanced,enrichment,python,projects,relationships}.ts` |
| 模拟运行和核验 | `src/grading/academy2/algorithms/{trace,fundamentals,graphs,structures,design,theory,index,variants,programCases,projects}.ts` |
| 教学页面与竞技场 | `src/features/academy2/algorithms/{P2Lesson.tsx,Arena.tsx,AlgorithmProject.tsx,navigation.ts,algorithms.css}` |
| 路由和学习集成 | `src/app/App.tsx`、`src/pages/pages.tsx`、`src/content/academy2/{knowledgeGraph.ts,resources.ts,teaching/library.ts}`、`src/features/academy2/{Curriculum.tsx,Guides.tsx,Labs.tsx,study/StudyPage.tsx,study/StudySaved.tsx,study/TopicTutor.tsx,teaching/TeachingBlocks.tsx}` |
| 质量验收 | `package.json`、`tests/academy2-p2.test.ts`、`scripts/smoke-academy2-algorithms.mjs`、`docs/STATUS.md`、`docs/academy-2-p2/`、`docs/qa/academy-2-p2/` |
