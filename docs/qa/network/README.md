# A11 / A12 / A14 实际浏览器截图

2026-11-16，最终 production build，Playwright Chromium。默认暗色，1440×1000、390×844、360×800；手机另用触摸上下文实际 tap，键盘用 Tab/Shift+Tab/Enter。所有图片来自实际页面，未使用设计稿或生成插画。

| 课程 | 电脑 1440 | 手机 390 | 小屏 360 | 待补插画 | 亮色兼容 360 |
| --- | --- | --- | --- | --- | --- |
| A11 | [图](a11-devices-active-1440.png) / [整页](a11-devices-active-1440-full.png) | [图](a11-devices-active-390.png) / [整页](a11-devices-active-390-full.png) | [图](a11-devices-active-360.png) / [整页](a11-devices-active-360-full.png) | [图](a11-devices-hook-390.png) | [图](a11-devices-light-360.png) |
| A12 | [图](a12-packets-active-1440.png) / [整页](a12-packets-active-1440-full.png) | [图](a12-packets-active-390.png) / [整页](a12-packets-active-390-full.png) | [图](a12-packets-active-360.png) / [整页](a12-packets-active-360-full.png) | [图](a12-packets-hook-390.png) | [图](a12-packets-light-360.png) |
| A14 | [图](a14-tcp-active-1440.png) / [整页](a14-tcp-active-1440-full.png) | [图](a14-tcp-active-390.png) / [整页](a14-tcp-active-390-full.png) | [图](a14-tcp-active-360.png) / [整页](a14-tcp-active-360-full.png) | [图](a14-tcp-hook-390.png) | [图](a14-tcp-light-360.png) |

A11 图示 A→C 的实际 MAC 学习和转发路径；A12 图示缺片不能完整重组，可重发而不会自动补字；A14 图示数据段丢失、推进逻辑时钟及超时重传。窄屏需纵向滚动，底栏固定；整页截图会把当前视口的固定底栏合成在长图中。测试会滚动每个任务按钮至可见位置并测量底栏遮挡和键盘焦点。

[执行报告](../../foundation/P1_NETWORK_REPORT.md) · [原始日志](logs/) · [新增浏览器脚本](../../../scripts/smoke-network.mjs)

复现：`npm run build`；另一终端 `npm run preview -- --host 0.0.0.0 --port 4180`；`BASE_URL=http://localhost:4180 SCREENSHOT_DIR=test-results/network npm run smoke:network`。脚本输出各课完成任务时的截图；本目录 active 图另记录自由实验的中间态，便于检查可操作控件。
