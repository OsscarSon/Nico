# P1.5 技术选型

2026-11-26 核查 npm 的发行版本、许可证和声明的 Node 要求。浏览器回归使用项目锁定版本的 Playwright Chromium；候选项未逐一执行跨浏览器基准。Node 实测 24.22.3，满足仓库的 ≥22 要求。Vite 和 KaTeX 的 CLI 依赖 commander 都要求 Node 22.12 或更新版本。新运行时 npm 依赖只有 KaTeX。

| 技术 | 核查版本与许可证 | 决定与原因 |
| --- | --- | --- |
| KaTeX | 0.19.1，MIT；字形字体 SIL OFL 1.1 | 采用。支持中文注释、LaTeX 和 MathML，桌面与移动 Chromium 实测。通过懒加载，主页不请求引擎、样式或字体。 |
| Markdown / GFM，remark-math，rehype-katex | 现有 marked 为 MIT；后两者 6.0.0、7.0.1，MIT | 复用现有只解析语法树、由 React 转义输出的 GFM。教学块中的公式直接调用 KaTeX，Markdown 块适合纯文档。以后若需要 Markdown 文件直接表达公式，应选择具有限制信任命令的编译流程。 |
| JSXGraph | 1.14.3，MIT 或 LGPL-3.0-or-later | 暂缓。现有原生 Canvas 与 React SVG 足以完成配套实验和概率树，有更复杂的动态几何构造时再测触控及键盘。 |
| Plotly.js / Apache ECharts | 4.3.0 MIT / 6.1.0 Apache-2.0 | 暂缓。P1 的散点和分布已由现有实验完成。以后用实际的大数据图表工作负载测试图形渲染、包体、键盘访问和数值替代，只选择一个引擎。 |
| Cytoscape.js | 3.35.0，MIT | 暂缓。沿用可键盘访问的知识关系与现有图实验。大量动态图节点、力布局和交互算法出现时再测。 |
| Mermaid | 12.3.0，MIT，声明 Node ≥22.12 | 暂缓。当前 Venn 图为本地静态 SVG，概率树由 React 直接生成。后续若引入 Mermaid，优先构建时生成 SVG，在线交互用严格模式，禁止任意链接与 HTML。 |
| CodeMirror 6 | 6.0.2，MIT | 复用已有 Python 编辑器及文本域回退。C++ 和 SQL 可阅读示例、比对真实输出；保留教学块语言字段方便未来接运行器。 |
| Pyodide | 314.0.8，MPL-2.0 | 复用已存在的 Web Worker 和执行时限。按运行按钮才从既有 CDN 下载。平台无服务端执行；只在明确声明 Python 可运行时展示按钮。例题需要外部包时明确作为外部运行示例。 |
| DuckDB-Wasm | 1.33.1-dev57.0，MIT | 设计兼容。当前版含开发版本标记，暂沿用静态 SQL 示例。未来 Data Studio 用独立 Worker、有界数据集与显式导入评估稳定版。浏览器的 Wasm、跨域隔离和低内存配置应分别验证。 |
| TensorFlow.js | 4.22.0，Apache-2.0 | 暂缓。本阶段没有模型训练需求。未来再验证 CPU/Wasm 与 WebGL 后端、设备内存、线程支持和离线模型资源。 |
| Fuse.js | 7.5.0，Apache-2.0 | 暂缓。现有目录有筛选，82 页内容先通过结构化字段索引。跨学科全文搜索再用真实中文查询评估模糊匹配与默认分词。 |
| IndexedDB / Dexie.js | 浏览器内建 / 4.4.7 Apache-2.0 | 继续沿用现有版本化本机存储；新题库只保存小型判分记录。题库规模、笔记或实验产物需要事务和更大容量时，再迁到 IndexedDB 并验证隐私模式、损坏备份及导入导出。 |
| Zod、Vitest、Playwright | npm 当前版分别为 4.6.7 MIT、5.1.2 MIT、1.65.1 Apache-2.0 | 复用仓库锁定版本。Zod 检查嵌套教学块、题目引用及存储；Vitest 跑全量内容合约；Playwright 检查实际布局、键盘、运行器和旧学习流程。 |

## 课件作者接口

- 在 `src/content/academy2/teaching/schema.ts` 定义顶层课时、递归教学块与题目联合类型。用 `$...$` 声明行内公式，独立或长公式用 `math` 块。GFM 块使用原有 Markdown 安全渲染，复杂的公式表格可用有列头的 `table` 块。
- 引用本地 PNG、SVG 等资源要提供替代文本。交互块通过稳定 ID 连接 React 组件，课件不接收任意 HTML 或脚本。未注册的交互不渲染，P1 测试覆盖实际注册的概率树。
- 例题按数学与统计输出不同栏目。推导和证明提供策略、步骤、公式与核对。阅读答案可折叠。Python 块选填 `runnable: "python"`，运行结果与预期示例输出分别标记。资源只用本地支持路径或经校验的 HTTP(S) 参考链接。
- 通用题库按稳定题号保存客观答题。支持选择、判断、数字（可配置分数和百分比）、向量、文本与开放题。多选按选项集合核验，错误选项可提供单独反馈；开放题只展示检查点。已上线 P1 的原评估仍按原数据决定完成和掌握，新增题库给出独立的客观题记录和待复核数。
- 旧课时播放器、课程入口、知识点 ID、进度与图谱兼容逻辑延用。新内容均沿用原课时草稿状态。

[KaTeX 排版支持](https://katex.org/docs/supported.html) · [KaTeX 信任选项](https://katex.org/docs/options.html) · [Pyodide 浏览器使用](https://pyodide.org/en/stable/usage/quickstart.html) · [DuckDB-Wasm 浏览器限制](https://duckdb.org/docs/stable/clients/wasm/overview)
