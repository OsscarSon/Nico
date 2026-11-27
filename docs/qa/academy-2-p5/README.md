# P5 浏览器、回归与性能

使用 Playwright Chromium 和生产构建，实测 1440、390、360px。覆盖深色默认、亮色设置、键盘滑块、关闭 AI 快捷入口、课程导航和原有播放器。390px 另验证受控实验预测、分步题、真实浏览器 Python、实验报告导出、项目参考链接及跨设备备份恢复。

| 实际页面 | 1440px | 390px |
| --- | --- | --- |
| 量子相位课程及概率计算 | [桌面](quantum-1440.png) | [手机](quantum-390.png) |
| 因果注意力层训练及损失 | [桌面](transformer-1440.png) | [手机](transformer-390.png) |
| 亮色课程 |  | [手机](quantum-light-390.png) |
| 进阶跨领域实践项目 |  | [手机](applied-project-390.png) |

## 自动测试

| 项目 | 核验范围与结果 |
| --- | --- |
| `npm run typecheck`、`npm run lint`、`npm run build` | 通过。构建保留既有大包与第三方注解提示。 |
| `npm test` | 64 个测试文件、858 项通过。包括 50 个 ID、数值不变量、工作流循环检测、独立梯度、无前缀泄漏及 256 项编程输出。 |
| `npm run smoke`、`npm run smoke:academy`、`npm run smoke:ai` | 旧播放器和进度、166 项 Academy 检查、AI 关闭时的既有流程通过。 |
| `npm run smoke:academy2`、`npm run smoke:academy2-p1` | 15 组目录、旧课、图谱及先修跳转，12 组 P1 完整学习流程通过。 |
| `npm run smoke:academy2-p15`、`npm run smoke:academy2-completion` | 29 项专题、备份、Pyodide 和离线失败反馈通过。 |
| `npm run smoke:academy2-algorithms`、`npm run smoke:academy2-data-ml` | 算法和 P3 判题、项目、实际 SQL、浏览器科学库回归通过。 |
| `npm run smoke:academy2-advanced` | P4 原入口、248 页、布局、多类别训练与冻结测试集通过。 |
| `npm run smoke:academy2-applied` | 三种宽度、控件、公式、真实训练、分步判分、浏览器 Python、关闭 AI、报告链接及备份恢复通过。390px 逐一打开 30 门课程和 604 个知识点路径。 |
| `python -B projects/p4/verify.py`，以及 C++17 队列 | 七项外部参考脚本及 C++ 满队、回绕和空队验证通过。 |

首次新增浏览器脚本用报告标题的精确文本匹配合并恢复结果。实际摘要还包含分类与日期，测试因此超时。校验改为匹配摘要结构，并沿恢复后的链接打开课时与实验。

## 首屏资源

比较 P4 PR 前段提交 `1ff3989` 与 P5 生产构建。大小为 `dist/index.html` 直接引用的资源经 Node gzip 后的字节。独立路由及模型训练模块按需下载，图片、字体及外部 Python 运行时单独计入各自加载场景。

| 首页入口 | P4 gzip | P5 gzip | 变化 |
| --- | ---: | ---: | ---: |
| JS | 603,294 B | 604,644 B | +1,350 B（+0.22%） |
| CSS | 16,849 B | 16,849 B | 0 B |

在本机用静态服务模拟 GitHub Pages 的 `/Nico/` 子路径。首页仅请求入口 JS 与 CSS，打开带训练参数的工作台后才请求 8 个其他资源。Chromium CPU 降速 4 倍时，从点击到这次因果注意力训练指标显示约 383 ms。该值描述这次本机浏览器测试，未测真实手机硬件和蜂窝网络。
