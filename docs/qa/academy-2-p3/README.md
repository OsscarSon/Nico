# P3 数据科学与机器学习浏览器验收

Chromium 在 1440px、390px、360px 测试课程入口、知识点判分、真实 SQLite 查询、图表、训练和留出评估。390px 另外打开全部 87 个课时，完成四个项目，并在新浏览器上下文恢复数据和模型工作区。宽表格在本身的可键盘访问区域滚动。HTML 使用生产构建，SQL 与训练各自运行在浏览器 Worker。

| 场景 | 1440px 桌面 | 390px 手机 |
| --- | --- | --- |
| Foundation 数据素养 · CSV | [桌面](foundation-data-lesson-1440.png) | [手机](foundation-data-lesson-390.png) |
| Intermediate 数据科学 · SQL 窗口函数 | [桌面](intermediate-data-lesson-1440.png) | [手机](intermediate-data-lesson-390.png) |
| Foundation AI · RAG | [桌面](foundation-ai-lesson-1440.png) | [手机](foundation-ai-lesson-390.png) |
| Intermediate AI · 反向传播 | [桌面](intermediate-ai-lesson-1440.png) | [手机](intermediate-ai-lesson-390.png) |
| Data Studio · 真实空气质量数据 | [桌面](data-studio-1440.png) | [手机](data-studio-390.png) |
| ML Playground · 真实 Iris 训练 | [桌面](ml-playground-1440.png) | [手机](ml-playground-390.png) |

## 回归及独立核验

| 项目 | 结果 |
| --- | --- |
| `npm run typecheck`、`npm run lint`、`npm run build` | 通过 |
| `npm test` | 61 个测试文件、830 条测试通过。覆盖 SQLite 计算、算法结果、备份、统计、模型和课时 Schema |
| `npm run smoke`、`npm run smoke:ai` | 旧播放器、进度、导航和 AI 关闭时的功能通过 |
| `npm run smoke:academy` | 166 项既有外观、操作与进度检查通过 |
| `npm run smoke:academy2`、`npm run smoke:academy2-p1` | 15 组 Academy 2.0 回归，12 组 P1 流程通过 |
| `npm run smoke:academy2-p15`、`npm run smoke:academy2-completion` | 82 页逐页检查、29 专题实验、备份及 Pyodide 实际运行通过 |
| `npm run smoke:academy2-algorithms` | 60 个算法课时、三个项目、资料及 Python 判题通过 |
| `npm run smoke:academy2-data-ml` | 三种宽度、四个项目、查询与导出、预测、聚类均通过。浏览器执行 NumPy、Pandas、Polars、Matplotlib、Seaborn 和 scikit-learn，独立核验提交的 Python 答案 |
| 实验 AI 导师 | 用本地测试响应核对关联课材、题面、实验目标和回复显示 |
| 静态子路径检查 | 在 `/Nico/` 运行真实 SQL 和训练。首页未请求 SQLite Wasm、专用 Notebook 运行时或两个工作台 |

原版 Python 文件完整保留。旧保护测试仍按原哈希验证基线。用于本阶段的 SQLite 与两份类型锁定记录按明确版本和完整性校验，随后核对其余依赖。[独立算法与指标复算](../../academy-2-p3/RESULTS.md)

## 性能

在同一 Node 环境下构建 P2 合并基线 `07a5f50` 与 P3，对生产入口文件使用 Node `gzipSync`。下表是构建产物体积。实际下载的编码及时间取决于部署环境、缓存和连接。

| 资源 | P2 基线 | P3 |
| --- | ---: | ---: |
| 首页 JavaScript 入口，gzip | 592,608 字节 | 596,491 字节（+0.66%） |
| 首页 CSS，gzip | 16,849 字节 | 16,849 字节 |
| SQL Worker 使用的 Wasm，gzip | — | 337,892 字节 |

浏览器检查 `/Nico/` 下的静态部署路径。首页不会请求上述 Wasm、工作台脚本或专业 Python 包。第一次执行 SQL 才加载 SQLite。首次运行专业 Python 例题另需下载对应运行时和库。Vite 仍报告生产入口与 CodeMirror 的既有大块体积警告。

## 复现

运行 `npm ci`、`npm run build` 与 `npm run preview`，执行 `npm run smoke:academy2-data-ml`。可以设置 `BASE_URL` 与 `SCREENSHOT_DIR`。网络受限时，将固定版本 Pyodide 官方资源与可选包放在本地目录，并为浏览器脚本设置 `PYODIDE_ASSET_DIR`。替换的是官方资源路径，Wasm 仍由真实浏览器执行。测试 AI 时另起一个启用 `VITE_AI_ENDPOINT=http://localhost:4285/api/p3-test` 的本地开发服务，并设 `AI_BASE_URL=http://localhost:4285`。Playwright 会拦截该测试请求，无须外部模型凭据。
