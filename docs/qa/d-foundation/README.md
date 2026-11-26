# Foundation D01–D04 检查与截图

## 实际课头

| 课程 | 实验完成条件 | 1440px | 390px |
| --- | --- | --- | --- |
| D01 游戏循环 | 分别更新和绘制，最后连续呈现 x=2、x=3 | [桌面](d01-game-loop-1440.png) | [手机](d01-game-loop-390.png) |
| D02 坐标 | 一个场景坐标及一个局部坐标同时正确落位 | [桌面](d02-coordinates-1440.png) | [手机](d02-coordinates-390.png) |
| D03 向量与移动 | 两种真实步长各模拟一秒，每一步的速度一致 | [桌面](d03-vector-movement-1440.png) | [手机](d03-vector-movement-390.png) |
| D04 输入 | 移动到 x=3，按下产生两次信号，保持两帧无重复 | [桌面](d04-input-1440.png) | [手机](d04-input-390.png) |

[D04 手机挑战结果](d04-input-result-390.png)来自实际完成后的浏览器截屏。四张 1600×900 课头由图像工具参考 Nico 原风格生成。D01 使用参考已有资产重新居中的版本，并保留原文件。根据深色和高饱和主体彩色像素估计，四图的水平中心偏差都小于画布宽度 0.35%。

## 本地验证

- `npm run typecheck`、`npm run lint`、`npm test`（47 个文件、652 项）、`npm run build` 均通过。Vite 保留大分块提示。
- `npm run smoke`、`npm run smoke:academy`（157 项）、`npm run smoke:p2`（258 项）通过。
- `npm run smoke:d` 在 1440、390、360px 验证四课共 12 条完整路径。包括真实键盘长按与重复按键、原生触屏、错误状态门控、问答提示、迁移判分、刷新后的原进度格式，以及 D05–D16 规划状态。
- 浏览器覆盖为桌面 Chromium 和手机视口模拟。七个不同的课程资料链接经 HTTP 检查均可打开。现有对旧课程、美术、AI、学习进度的哈希保护测试通过。

从生产构建复测时，先运行 `npm run build` 和 `npm run preview`，然后运行 `npm run smoke:d`。用 `BASE_URL` 指定自定义端口，用 `SCREENSHOT_DIR` 指定截图目录。

四门课使用手动、离散的教学模型，供观察和比较。物理、碰撞和引擎集成留在后续目录。课程质量为草稿，等待真实学习者试学。
