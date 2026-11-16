# 实际 UI 截图与检查日志

截图由 Playwright Chromium 对真实 Vite 页面直接拍摄，无重绘或后期处理。
修改前来自 `8e16933`；修改后来自此分支的生产构建。桌面 1440×1000；手机 390×844、360×844。

| 宽度 | 修改前（完整页面） | 修改后首页 | 原版路线插画 | 课程目录 |
| --- | --- | --- | --- | --- |
| 1440 | [截图](before-1440.png) | [截图](after-home-1440.png) / [完整页](after-home-full-1440.png) | [截图](after-tracks-1440.png) | 见完整页 |
| 390 | [截图](before-390.png) | [截图](after-home-390.png) / [完整页](after-home-full-390.png) | [截图](after-tracks-390.png) | [截图](after-courses-390.png) |
| 360 | [截图](before-360.png) | [截图](after-home-360.png) | [截图](after-tracks-360.png) | [截图](after-courses-360.png) |

手机互动：[A09 封装](after-a09-network-layers-360.png) · [A10 子网](after-a10-ip-subnet-360.png) · [A13 DNS](after-a13-dns-360.png)。

完整页截图中的固定底栏会显示在拍摄起始视口的底部；单屏截图展示实际浏览时的固定底栏位置。

日志：[typecheck](typecheck.log)、[lint](lint.log)、[Vitest](tests.log)、[build](build.log)、[A](smoke-a.log)、[B](smoke-b.log)、[AI 关闭](smoke-ai.log)、[AI 假服务](smoke-ai-enabled.log)、[Academy](smoke-academy.log)。

插画校验：[基线 SHA-256](art-before.sha256)、[校验输出](art-verification.log)。
