# P3 实施报告

基于合并 PR #23 的主分支提交 `07a5f50`。四门课程共 87 个课时。Word 原列 79 个知识点，加深后另设 8 个课时，延续十领域、三级、30 门主要课程。新课质量状态均为草稿。[逐知识点覆盖](COVERAGE.md)

- Data Studio 可导入带引号的 CSV 或平铺 JSON 记录。数据质量面板区分缺值、有效零、文本标识和连续量。清洗支持中位数插补、类型转换、围栏筛查、标准化、去重、撤销和导出。
- Python 与 SQL 单元读取同一张清洗后的数据表。运行时按同语言依赖重放前置单元。SQLite 支持 JOIN、CTE、窗口、事务和数据库导出，索引比较同时复算结果和运行计划。可保存图表规格、筛选、Notebook 及数据，再经学习备份恢复。
- ML Playground 包含 13 种实际模型。监督任务支持分层二元切分、回归、训练集内部交叉验证、L2、重采样、伪标签、PCA、阈值和独立留出结果。聚类包括 K-means、平均连接凝聚法和 DBSCAN。权重、预测、曲线、混淆矩阵和 ROC 均从同一运行生成。
- 智能系统实验包含规则链、A*、α–β 剪枝、稳定温度归一化和可追踪的本地词频检索。已有 C 路线互动课和原 AI 工具通过课程链接继续可用。
- 四个可核验项目分别完成原始空气质量 Dashboard、SQL 数据库报告、二元分类与证据助手、同一分割的多模型研究。项目评分核对实际数据与计算。解释与局限交由人工评阅。
- Data Studio 与 ML Playground 的实验导师复用原 AI Tutor，可解释关联公式和操作。只发送公开课材、实验目标及本人填写的问题。
- P2 的 12 项扩展编程题和 P3 的 12 项编程规格都复用原判题。学习者可以切换种子以检查新输入。P2 的随机题使用独立算法与竞技场交叉检验。

真实数据来源为 UCI Iris 测量记录和 R `datasets::airquality` 的 1973 年纽约观测。Iris 复用 P1 已核对的版本，Air Quality 保留原来的缺值。数据按各原始测量单位解释。[UCI Iris，CC BY 4.0](https://archive.ics.uci.edu/dataset/53/iris) · [R Air Quality 原始说明](https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/airquality.html) · [Rdatasets 表格归档](https://vincentarelbundock.github.io/Rdatasets/doc/datasets/airquality.html)

## 已知限制和后续验证

- SQLite 按项目重放单元，由显式导出数据库文件实现复用。它适合本机教学与静态网站。工作区支持上限内的小型样本，复杂查询由 Worker 限时。
- CSV 提供可关闭的数值推断，JSON 读入记录对象数组。嵌套数据在 Python/SQL 中先按业务粒度展开。图表显示观测关系，因果推断需要额外设计。
- 监督分类采用 one-vs-rest 的二元课堂实验。划分按行并对分类分层。用户有重复个体、时序或位置依赖时，需要另选分组或时间切分。SVM 分数用于阈值或排序，概率校准须用独立数据。
- 数据较小时本机时间经常由初次编译和测量粒度支配。比较报告要读查询计划、样本规模及实际运行结果。每项专业 Python 库需首次加载。
- 本地检索助手引用输入证据，在缺证据时拒答。它的四个固定任务用于核验检索流程。生成型 AI 和既有工具继续使用原课程入口及 AI Tutor。
- 新课需要真实学员试学及独立教学审核。全部练习可通过实际代码或可核查看法验证。高阶数据工程与高阶 AI 的目录维持规划。

[开源选型](TECHNOLOGY.md) · [训练输出与独立核查](RESULTS.md) · [浏览器截图与测试命令](../qa/academy-2-p3/README.md)

## 文件范围

课材、注册表、项目规格和真实数据在 `src/content/academy2/data`，状态和计算在 `src/grading/academy2/data`。界面在 `src/features/academy2/data`，沿用现有算法区、课程目录、教学渲染、学习资料及 AI Tutor。可选 Python 教学库入口在 `src/runtime/notebookPython.ts` 与 `public/workers/notebook`。测试在 `tests/academy2-p3.test.ts` 及 `scripts/smoke-academy2-data-ml.mjs`。
