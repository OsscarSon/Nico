# Foundation F 验证与截图

| 课时 | 1440px | 390px |
| --- | --- | --- |
| F01 串联电流 | [桌面](f01-circuits-current-1440.png) | [手机](f01-circuits-current-390.png) |
| F02 传感器与执行器 | [桌面](f02-sensors-actuators-1440.png) | [手机](f02-sensors-actuators-390.png) |
| F03 Arduino 时序 | [桌面](f03-arduino-intro-1440.png) | [手机](f03-arduino-intro-390.png) |
| F04 ADC 与 PWM | [桌面](f04-signals-1440.png) | [手机](f04-signals-390.png) |
| F05 距离读数与滤波 | [桌面](f05-read-sensors-1440.png) | [手机](f05-read-sensors-390.png) |
| F06 电机与舵机 | [桌面](f06-motors-servos-1440.png) | [手机](f06-motors-servos-390.png) |
| F07 UART 与 I²C | [桌面](f07-uart-i2c-1440.png) | [手机](f07-uart-i2c-390.png) |
| F08 三场景避障 | [桌面](f08-rover-project-1440.png) | [手机](f08-rover-project-390.png) |

[F08 验收截图](f08-rover-result-390.png)来自一套规则下的三个实际运行结果。浏览器读取下载的 JSON，验证两次抵达出口，以及传感器失效时在 (1,1) 原地停车。纯函数测试另外核对太早绕行、绕错方向和忽略掉线的结果。

## 测试

- `npm run typecheck`、`npm run lint`、`npm test`（47 个文件，659 项）与 `npm run build` 通过。构建保留现有分块体积提示。
- `npm run smoke:f` 在 1440、390、360px 验证八课共 24 条完整路径，包含课头加载、正反实验、键盘或触屏、判分、问答、迁移和学习进度。
- 核心浏览器测试、Academy 157 项、P2 258 项、AI 关闭模式通过。
- 16 个参考链接均可访问。八张图为独立 AI 生成 PNG，1600×900。按深色与高饱和像素估算，主体外接框水平偏差不超过画布宽度 1%。

用 `npm run build` 和 `npm run preview` 启动生产预览，再执行 `npm run smoke:f`。可用 `BASE_URL` 指定地址，用 `SCREENSHOT_DIR` 指定截图目录。

本次使用 Chromium 桌面与移动视口模拟。电路、地址、机械状态和地图均为虚构教学模型，Arduino 解释器只执行本课指令子集。新课保留草稿，等待真实试学。
