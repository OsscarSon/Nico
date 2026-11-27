# P3 开源方案与部署兼容

| 候选 | 许可证与定位 | 采用决定 |
| --- | --- | --- |
| sql.js 1.17.0 与 SQLite | sql.js 使用 MIT，SQLite 为公有领域 | 用实际查询引擎支持 JOIN、CTE、窗口、约束和事务。浏览器按需加载一份 SQLite Wasm。直接导出 SQLite 数据库。 |
| DuckDB-Wasm | MIT，面向列式分析 | 适合更大的数据和 Arrow 互操作。在本阶段的小型教学样本中，SQLite 可覆盖所需功能并沿用普通 GitHub Pages 静态部署。 |
| Apache Arrow | Apache-2.0，列式内存交换 | 本阶段的输入资源为 CSV、JSON 和小型公开表。普通列数组足够表达数据，并通过绑定参数送入 SQLite。 |
| 原生 SVG | 浏览器内建 | 用真实样本或模型输出绘制散点、直方、箱线、折线、热力矩阵、ROC、Loss 和边界图。图表支持独立 SVG 导出，数值也有文本与数据表。 |
| ECharts 与 Plotly.js | 分别为 Apache-2.0 与 MIT | 两者都覆盖常见图型。现有 SVG 足以承载本轮教学图与手机布局，无需增加通用渲染运行时。 |
| Pyodide 314.0.8 | MPL-2.0，浏览器内的 CPython | 复用代码编辑器及现有 Worker。默认运行只加载核心资源，选择专业库才请求对应固定版本。Python code 默认 5 秒运行上限，专业包下载另有自己的上限。 |
| NumPy、Pandas、Polars、Matplotlib、Seaborn、scikit-learn | NumPy、Pandas、Seaborn、scikit-learn 为 BSD-3-Clause，Polars 为 MIT，Matplotlib 使用 Matplotlib License | NumPy 与 Pandas 做真实表计算，Polars 比较惰性查询，Matplotlib、Seaborn 输出可核查统计图结果。scikit-learn 做手写实现对照和独立数值核查。 |
| TensorFlow.js | Apache-2.0，浏览器张量及训练运行时 | 本轮模型规模小。TypeScript 的真实梯度计算和 Worker 便于逐步解释损失、切分、边界及训练差异。专业实现通过 scikit-learn 对照。 |

候选许可证、维护版本、包内容通过 npm 元数据、Pyodide 锁文件及发行包核对。DuckDB、Arrow 和图表候选的 npm 包文件总体积包含多构建产物，不能直接解释成页面下载大小。[DuckDB-Wasm](https://www.npmjs.com/package/@duckdb/duckdb-wasm) · [Arrow](https://www.npmjs.com/package/apache-arrow) · [ECharts](https://www.npmjs.com/package/echarts) · [Plotly.js](https://www.npmjs.com/package/plotly.js) · [TensorFlow.js](https://www.npmjs.com/package/@tensorflow/tfjs)

Seaborn 0.13.2 为固定的纯 Python PyPI wheel。SHA-256 为 `636f8336facf092165e27924f223d3c62ca560b1f2bb5dff7ab7fad265361987`。仅在该示例运行时加载，许可证随文件存放。[PyPI 发行文件](https://pypi.org/project/seaborn/0.13.2/#files) · [许可证](../../public/third-party/seaborn-0.13.2-LICENSE.txt)

## 静态页面路径

沿用相对资源路径及 hash 路由。Vite 构建各 Worker 和单个 SQLite Wasm。Pyodide 从固定版本 CDN 加载，Seaborn 从静态项目路径读取。Python、SQL、模型训练及导出均在浏览器执行。Data Studio 和 ML Playground 有各自的按需入口。
