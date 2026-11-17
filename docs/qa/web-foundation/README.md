# Foundation A15–A17 实际浏览器截图与日志

2026-11-17（Asia/Kuala_Lumpur），生产build，Chromium。1440×1000、390×844、360×800。所有图片来自真实界面操作，未注入React模型状态或修改截图样式；移动场景另验证真实touch事件和Tab/Enter。

## 进行中的自由实验

A15显示新鲜位置30并保留延迟/未到达数据报；A16由用户填写POST实际创建记录，响应201；A17丢弃最后握手ACK，客户端已建立而服务器仍等待，逻辑时钟到期后可重传。

| 课程 | 1440px 桌面 | 390px 手机 | 360px 手机 |
| --- | --- | --- | --- |
| A15 UDP | [图](a15-udp-active-1440.png) / [整页](a15-udp-active-1440-full.png) | [图](a15-udp-active-390.png) / [整页](a15-udp-active-390-full.png) | [图](a15-udp-active-360.png) / [整页](a15-udp-active-360-full.png) |
| A16 HTTP / HTTPS | [图](a16-http-https-active-1440.png) / [整页](a16-http-https-active-1440-full.png) | [图](a16-http-https-active-390.png) / [整页](a16-http-https-active-390-full.png) | [图](a16-http-https-active-360.png) / [整页](a16-http-https-active-360-full.png) |
| A17 网页访问 | [图](a17-web-journey-active-1440.png) / [整页](a17-web-journey-active-1440-full.png) | [图](a17-web-journey-active-390.png) / [整页](a17-web-journey-active-390-full.png) | [图](a17-web-journey-active-360.png) / [整页](a17-web-journey-active-360-full.png) |

## 操作挑战全部完成

| 场景 | 1440px 桌面 | 390px 手机 | 360px 手机 |
| --- | --- | --- | --- |
| A15 TCP对照确认完成 | [图](a15-udp-dark-1440.png) / [整页](a15-udp-dark-1440-full.png) | [图](a15-udp-dark-390.png) / [整页](a15-udp-dark-390-full.png) | [图](a15-udp-dark-360.png) / [整页](a15-udp-dark-360-full.png) |
| A16 已核验TLS与HTTP响应 | [图](a16-http-https-dark-1440.png) / [整页](a16-http-https-dark-1440-full.png) | [图](a16-http-https-dark-390.png) / [整页](a16-http-https-dark-390-full.png) | [图](a16-http-https-dark-360.png) / [整页](a16-http-https-dark-360-full.png) |
| A17 200页面与链路 | [图](a17-web-journey-dark-1440.png) / [整页](a17-web-journey-dark-1440-full.png) | [图](a17-web-journey-dark-390.png) / [整页](a17-web-journey-dark-390-full.png) | [图](a17-web-journey-dark-360.png) / [整页](a17-web-journey-dark-360-full.png) |

A17最终实际页面：[1440](a17-web-journey-dark-1440-result.png) / [390](a17-web-journey-dark-390-result.png) / [360](a17-web-journey-dark-360-result.png)。

正式插画占位：[A15](a15-udp-hook-390.png) / [A16](a16-http-https-hook-390.png) / [A17](a17-web-journey-hook-390.png)。亮色兼容：[A15](a15-udp-light-360.png) / [A16](a16-http-https-light-360.png) / [A17](a17-web-journey-light-360.png)。默认主题仍为暗色。

长图会把视口固定底栏合成在长页面中；实际操作时会纵向滚动。浏览器检查真实点击所有任务控件、测试焦点并测量下一步按钮没有被底栏遮挡，无横向溢出。

[教学与技术设计](../../foundation/P1_WEB_DESIGN.md) · [完整实施报告与限制](../../foundation/P1_WEB_REPORT.md) · [日志](logs/) · [保护记录](protection.json) · [旧插画实测](art-layout-audit.json)

复现：`npm run build`，另一终端 `npm run preview -- --port 4186`，然后 `BASE_URL=http://localhost:4186 SCREENSHOT_DIR=test-results/web npm run smoke:web`。脚本覆盖三课完整流程、9个实际挑战、首次成绩、续学、3种宽度、两主题和触摸/键盘。active图额外记录自由实验中间态，测试脚本主要输出挑战完成态。
