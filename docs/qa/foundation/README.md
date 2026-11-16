# Foundation P1 实际截图与测试日志

真实 Chromium + Vite 生产构建，Default Environment。桌面 1440×1000，手机视口 390×844 / 360×844。截图未重绘或修改。

| 课程 | 手机互动概览 | 手机完整页 | 桌面挑战 | 360px 暗色 / 亮色 |
| --- | --- | --- | --- | --- |
| A06 | [截图](a06-memory-overview-390.png) | [完整页](a06-memory-full-390.png) | [截图](a06-memory-dark-1440.png) | [暗色](a06-memory-dark-360.png) / [亮色](a06-memory-light-360.png) |
| A07 | [截图](a07-os-overview-390.png) | [完整页](a07-os-full-390.png) | [截图](a07-os-dark-1440.png) | [暗色](a07-os-dark-360.png) / [亮色](a07-os-light-360.png) |
| A08 | [截图](a08-command-line-overview-390.png) | [完整页](a08-command-line-full-390.png) | [截图](a08-command-line-dark-1440.png) | [暗色](a08-command-line-dark-360.png) / [亮色](a08-command-line-light-360.png) |

插画处理：[A06 原图](a06-memory-hook-390.png)、[A07 空位](a07-os-hook-390.png)、[A08 空位](a08-command-line-hook-390.png)。

完整页截图的固定底栏显示在拍摄起始视口底部；单屏图为实际浏览视口。屏幕下方内容可正常滚动，流程测试确实点击所有课时步骤。

日志：[typecheck](typecheck.log)、[lint](lint.log)、[Vitest](tests.log)、[build](build.log)、[新课78项](smoke-foundation.log)、[旧A](smoke-a.log)、[旧B](smoke-b.log)、[AI关闭](smoke-ai.log)、[AI启用假服务](smoke-ai-enabled.log)、[Academy](smoke-academy.log)。

原美术保护：[SHA-256 基线](art-before.sha256)、[56文件校验](art-verification.log)。

[完整实施报告](../../foundation/P1_REPORT.md)。这些是技术测试资料，不是真实学习者试学记录。
