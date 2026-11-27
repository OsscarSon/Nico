# P2 算法课时与竞技场浏览器验收

生产构建使用 Node.js v24.22.3，浏览器使用仓库 Playwright 的 Chromium。1440px、390px、360px 均验证课程、实验、三个项目、学习记录和宽度。390px 另逐页验证全部 60 个课时。下表是 Chromium 在真实页面中生成的截图。

| 场景 | 1440px 桌面 | 390px 手机 |
| --- | --- | --- |
| Foundation · 基础排序 | [桌面](foundation-lesson-1440.png) | [手机](foundation-lesson-390.png) |
| Intermediate · Dijkstra | [桌面](intermediate-lesson-1440.png) | [手机](intermediate-lesson-390.png) |
| Advanced · 网络流 | [桌面](advanced-lesson-1440.png) | [手机](advanced-lesson-390.png) |
| 竞技场 · 自定义图的真实最短路 | [桌面](arena-1440.png) | [手机](arena-390.png) |
| 高阶项目 · 实际性能基准 | [桌面](advanced-project-1440.png) | [手机](advanced-project-390.png) |

## 回归结果

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck`、`npm run lint` | 通过 |
| `npm test` | 60 个文件、819 条单元测试通过，其中 13 条 P2 用例包含多组差分和边界计算 |
| `npm run build` | 通过。与主分支构建一样报告已有大包及 Rollup 注释提示 |
| `npm run smoke`、`npm run smoke:ai` | 通过。旧播放器、进度和 AI 关闭分支 |
| `npm run smoke:academy` | 166 项 P0 视觉、旧课时、键盘、手机导航与进度检查通过 |
| `npm run smoke:academy2` | 15 组 2.0 新旧入口、专业路线和实验回归通过 |
| `npm run smoke:academy2-p1` | 12 组 P1 课程、进度、考核和项目回归通过 |
| `npm run smoke:academy2-p15` | 三种宽度通过。82 个 P1.5 强化页逐页浏览通过 |
| `npm run smoke:academy2-completion` | 三种宽度的资料与备份、29 个专题实验、Pyodide 运行通过 |
| `npm run smoke:academy2-algorithms` | 三种宽度的 P2 流程、60 页逐页检查、跨设备恢复、真实 Python 运行和 AI 测试响应通过 |

两次构建使用相同 Node、依赖和 gzip 设置。首页入口 JS 从 588,001 字节增至 592,608 字节，增加 4,607 字节（约 0.8%）。首页入口 CSS 均为 16,849 字节。竞技场、完整算法课材、项目及 Pyodide 编辑执行按相应页面入口加载。

## 复现

1. 运行 `npm ci`、`npm run build` 及 `npm run preview`。
2. 执行 `npm run smoke:academy2-algorithms`。若使用自定端口，可设 `BASE_URL`。默认由浏览器从官方 CDN 加载固定版本的 Pyodide，外部 CDN 不可用时可设置 `PYODIDE_ASSET_DIR` 为同版本官方资产目录。
3. 如要验证已配置的 AI 分支，另运行 `VITE_AI_ENDPOINT=http://localhost:4276/api/p2-test npm run dev -- --port 4276`，给脚本设置 `AI_BASE_URL=http://localhost:4276`。脚本使用本地测试响应核对请求和标签。
4. 使用 `SCREENSHOT_DIR` 可改变截图输出目录。预览检查默认写入 `test-results/academy2-algorithms`。
