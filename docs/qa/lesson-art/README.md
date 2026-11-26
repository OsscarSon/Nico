# Nico Academy 课程插图补齐

本轮从 `main` 的 `48cef2b` 盘点开放课时。B13、B16、B17 原先只有占位，现已接入按 Nico 现有课头样式生成的插图。38 门可学课程均有有效引用。待审阅的 B18–B20 和 C 路线新增课时已各自配图。规划节点的开放状态与资源引用沿用原目录。

| 课程 | 新图 | 左／右留白估计 | 桌面 1440px | 手机 390px | 手机 360px |
| --- | --- | --- | --- | --- | --- |
| B13 fetch 与 JSON | [请求与返回的结构化数据](../../../public/art/lesson-b13-fetch-json.png) | 193／191px | [截图](b13-fetch-json-1440.png) | [截图](b13-fetch-json-390.png) | [截图](b13-fetch-json-360.png) |
| B16 GitHub | [本地、远程与分支审阅](../../../public/art/lesson-b16-github.png) | 185／188px | [截图](b16-github-1440.png) | [截图](b16-github-390.png) | [截图](b16-github-360.png) |
| B17 发布静态网页 | [文件、部署与浏览器验证](../../../public/art/lesson-b17-pages.png) | 126／119px | [截图](b17-pages-1440.png) | [截图](b17-pages-390.png) | [截图](b17-pages-360.png) |

插图由 AI 图像工具参考仓库现有课头生成，使用 1600×900 PNG。留白测量用深色和高饱和度像素估计主体范围，网格仍完整铺在画布上。三张 PNG 通过新文件名接入。课头沿用已有的 `contain` 和居中样式。

## 验证

- `npm run typecheck`、`npm run lint`、`npm test`（46 个文件、642 项）、`npm run build` 通过。构建保留原有的分块体积提示。
- `npm run smoke`、`npm run smoke:academy`（157 项）、`npm run smoke:p3a`（285 项）通过。P3-A 仍验证课程操作、错题、迁移和进度，并新增开场 PNG 检查。
- Chromium 逐一打开 38 个课时，在三个宽度共验证 114 个开场布局，检查图像解码、比例、列内居中、完整显示、默认深色和横向溢出。手机使用 Chromium 视口和触控模拟。
- 原本的课程插图、路线插图、Logo、Hero 和 Byte 文件保持原字节。三个课时仅更新插图字段。
