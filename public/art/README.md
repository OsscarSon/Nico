# 美术资源状态

来源：GPT 图像模型按 `docs/blueprint/06_ART_PROMPTS_FOR_GPT_IMAGE.md` 生成。图中均无文字。

## 已接入
| 文件 | 用在哪里 |
| --- | --- |
| `hero-home-1600x900.png` | 首页主视觉 |
| `lesson-a01-bits.png` | A01 课头插图（课时数据里的 `art` 字段） |
| `lesson-a02-hex-encoding.png` | A02 课头插图（8 个开关分成两组、每组 4 位）。GPT 出图后压缩到 1600×900、64 色，约 55KB |
| `lesson-a03-logic-gates.png` | A03 课头插图（AND、OR、NOT、XOR 四种门的传统形状，带开关和灯）。已用 GPT 重出，替换了看不出门形状的旧图，约 79KB |
| `lesson-b01-variables.png` / `b02-conditions` / `b03-loops` / `b08-html` | 路线 B 八课（B01–B08）的课头插图（GPT 出图，已缩放为 1600×900 并压成 256 色调色板 PNG）；另有 `lesson-b04-functions` / `b05-lists` / `b06-dicts` / `b07-debugging` |
| `lesson-a04-adder.png` | A04 课头插图（半加器：XOR 出「和」、AND 出「进位」，画的是 1 + 1 = 10）。约 62KB |
| `empty-no-projects.png` | 作品页空状态 |
| `error-404.png` | 找不到页面 |
| `badge-*.png`（8 张，已去掉背景） | 「我的」页徽章，按真实完成记录点亮 |
| `track-a-network.png` 到 `track-e-google.png`、`track-f-hardware.png`（256px，已去掉背景） | 路线卡与路线页头的徽记 |
| `lab-prompt-banner.png`（1600×533） | Prompt 训练场顶部横幅 |
| `app-icon-512.png`、`app-icon-180.png`（N 图标，已去掉圆角外的底） | 180 用作手机「添加到主屏幕」图标；512 留给 Phase 8 的 PWA |

## 已有，等对应功能做出来再接入
- 课头插图：`lesson-a06/a12/a14/a16`（A05、A09、A13 已重出并接入）、`lesson-b10`、`lesson-b11`、`lesson-b12`、`lesson-c05/c11/c12`、`lesson-d01/d10`、`lesson-e01`。课时写好后，在课时数据里加 `art: "文件名.png"` 即可。
- `empty-no-progress.png`、`error-offline.png`：离线提示（Phase 8 的 PWA）和学习记录为空的场景。
- `pathmap-nodes.png`：路线节点图标集（目前路线图用代码画的 SVG，更清晰，暂不替换）。
- `pattern-trace-tile.png`、`og-1200x630.png`：背景纹理与分享图（分享图需要公开域名后才能用）。
- `logo-mark.png`：芯片标志，目前界面用代码画的 N 形标志。

## 不部署的原图
`docs/art-source/` 里放着 1254px 的吉祥物设定图 `mascot-byte-sheet.png` 和 1024px 的 `app-icon-1024.png`，作为存档，不放进网站。

## 仍需处理
1. 课头插图里的主体偏小、留白很多，作为页头可用，但不够有力；新出的路线徽记和吉祥物质量明显更好，可作为后续出图的风格标杆。
2. 吉祥物 Byte 还没有用在界面里（有 6 个姿势可用于空状态、完成提示）。
