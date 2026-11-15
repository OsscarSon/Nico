# 06 美术提示词（给 GPT 图像模型）

## 使用方法
1. 每次出图，**先贴「全局风格块」，再贴该资产的单张提示词**。
2. **图里不要有任何文字、字母、数字、中文**（文字由前端渲染）。
3. 一批图尽量在同一个对话里连续生成，并把第一张满意的图作为风格参考："请保持与上一张完全一致的线条粗细、配色和风格"。
4. 若不支持透明背景，就用纯色 `#F2F4F7` 背景，我们后期抠图。
5. 按「文件名」保存，放入 `public/art/`。

## 全局风格块（每次必贴）
```
Style: precise technical illustration like a page from an engineer's notebook.
Clean uniform navy ink linework (#14213D, consistent ~2px weight), flat solid fills only,
limited palette: trace blue #2457F5, signal amber #FFB020, pass green #12A46B,
light gray-blue #E7ECF3, white #FFFFFF, paper #F2F4F7. No gradients, no glow, no 3D render,
no photorealism, no drop shadows (except a flat hard offset shadow in navy where noted).
Circuit-trace motifs: lines bend only at 45° and 90° angles, small circular solder-pad nodes.
Optional faint graph-paper grid (#DCE2EA) in the background.
Calm, spacious composition, generous empty space, one clear focal object.
ABSOLUTELY NO TEXT, letters, numbers, logos, watermarks or Chinese characters anywhere in the image.
```

## 吉祥物（可选，先出这个确定角色）
**Byte（比特）**：一个小方块芯片身体，两只圆点眼睛，四周有细小引脚当手脚，表情简单。
文件名：`mascot-byte-sheet.png`，4:3
```
[全局风格块] Character sheet of a tiny friendly mascot named Byte: a small square microchip
body in light gray-blue with a navy outline, two simple round dot eyes, a small curved smile,
short pin legs and arms. Show 6 poses in a 3x2 grid on paper background: standing, waving,
thinking (hand on chin), celebrating with arms up, confused (tilted head), sleeping.
Small amber accent on the chip's corner dot. No text.
```

## A. 品牌
**A1 应用图标** `app-icon-1024.png`，1:1
```
[全局风格块] App icon: a rounded-square tile in trace blue #2457F5. At center, a simplified
circuit trace in white that forms an abstract "B" shape made of 45° bends, ending in an amber
#FFB020 solder-pad dot. Flat, bold, readable at small sizes, centered with safe margins.
```
**A2 标志符号** `logo-mark.png`，1:1，透明/纸色背景
```
[全局风格块] Logo mark only (no wordmark): a square microchip outline in navy with one corner
cut, and a single glowing-feeling-but-flat amber pad connected by a 45° trace line leaving the
chip. Minimal, geometric, symmetric-ish, works in one color.
```
**A3 社交分享图** `og-1200x630.png`，1200×630
```
[全局风格块] Wide banner: left third empty paper space (for text added later), right two thirds
a flowing circuit-trace path winding across the grid with 5 solder-pad nodes, the first three
lit in amber, the rest gray. Small Byte mascot sitting on the last lit node.
```

## B. 五条路线徽记（各 512×512，1:1）
统一结构：一个圆形纸色底盘 + 中心一个符号，描边 navy。
- `track-a-network.png`
```
[全局风格块] Emblem for "computers & networks": three small devices (a laptop, a router box,
a server) connected by 45° trace lines inside a circular badge. Blue primary, amber for the
data packet dot traveling on one line.
```
- `track-b-code.png`
```
[全局风格块] Emblem for "programming & websites": a browser window outline with angle-bracket
shapes and a small cursor, inside a circular badge. Blue primary, green accent dot.
```
- `track-c-ai.png`
```
[全局风格块] Emblem for "AI & prompts": a speech bubble containing a small neural-network of
five nodes and trace links, with a tiny spark shape in amber. Inside a circular badge.
```
- `track-d-games.png`
```
[全局风格块] Emblem for "game development": a simple game controller outline with a pixel-style
star and a tiny platform step, inside a circular badge. Green primary, amber star.
```
- `track-e-google.png`
```
[全局风格块] Emblem for "spreadsheets & automation": a grid of cells with a highlighted
amber cell, a small gear, and a short trace line connecting them, inside a circular badge.
Do not copy any company logo.
```

## C. 首页与路线地图
**C1 首页主视觉** `hero-home-1600x900.png`，16:9
```
[全局风格块] Wide hero: an engineer's notebook page with faint grid. A single long circuit-trace
path enters from the left bottom, winds upward with 45° turns through six solder-pad nodes; the
first two nodes and the path up to them are amber (lit), the third pulses (draw a few small
concentric rings), the rest gray dashed. Small Byte mascot sits at the third node holding a
tiny wrench. Lots of empty space at top-left for a headline.
```
**C2 走线可平铺纹理** `pattern-trace-tile.png`，1024×1024，可无缝平铺
```
[全局风格块] Seamless tileable background pattern: sparse faint circuit traces (#DCE2EA lines)
with 45° bends and tiny solder-pad circles on paper #F2F4F7. Very low contrast, subtle,
edges must tile seamlessly in all directions. No focal object.
```
**C3 路线节点图标集** `pathmap-nodes.png`，4:1
```
[全局风格块] A horizontal strip of 4 node icons on paper background: (1) locked gray solder-pad
with tiny padlock, (2) available hollow blue solder-pad, (3) current amber pad with concentric
pulse rings, (4) completed green pad with a check mark shape made of trace lines.
```

## D. 课时配图（各 1600×900，16:9，同一风格）
每张对应一课的页头。画面只表达概念，不放文字。
1. `lesson-a01-bits.png` — 8 个并排的拨动开关，一部分向上（亮琥珀）一部分向下，上方抽象出一串点阵。
2. `lesson-a03-logic-gates.png` — 三个逻辑门符号（只画形状，不写字）用走线连接，输入端有开关，输出端有小灯泡。
3. `lesson-a05-cpu-cycle.png` — 芯片内部抽象示意：三个环形箭头分别代表"取、译、执"，中间有小寄存器方块。
4. `lesson-a06-memory-layers.png` — 金字塔式层级：顶端小而快（亮色）、底部大而慢（灰色），用纵向走线连接。
5. `lesson-a12-packets.png` — 一封信被切成多个带编号点的小方块，沿不同路径经过两台路由器，在另一端重新拼合。
6. `lesson-a13-dns.png` — 笔记本电脑向一本巨大的"电话簿"（只画书的形状）询问，书页飘出一个地址标签形状。
7. `lesson-a14-tcp-handshake.png` — 两台设备之间三条往返的箭头走线依次点亮（1→2→3），中间一条握手手势的抽象线条。
8. `lesson-a16-https-lock.png` — 浏览器窗口与服务器之间有一条被锁形罩住的通道，信件在通道内。
9. `lesson-c05-prompt-structure.png` — 一个由六块积木拼成的指令（角色、任务、上下文、格式、约束、示例，各用不同色块，不写字）进入一个小机器人轮廓。
10. `lesson-c11-rag.png` — 一堆文档被放进一个漏斗/索引盒，取出相关的几张纸送进模型方块。
11. `lesson-c12-agent-loop.png` — 一个环形流程：想→调用工具→看结果→再想，中心是小机器人，环上有工具图标（锤子、放大镜、日历）。
12. `lesson-e01-spreadsheet.png` — 表格网格，一个琥珀色单元格被选中，一条走线连到右侧的小公式气泡（不写公式）。
13. `lesson-d01-game-loop.png` — 一个圆环：输入→更新→绘制，中间是一个像素小人物。
14. `lesson-d10-unity-scene.png` — 抽象的场景编辑器：一个立方体、一个坐标轴小图标、一个相机轮廓。**不要复制 Unity 的商标或界面**，只做通用示意。
15. `lesson-b10-git-branches.png` — 一条主线与一条分支线，分支上有 3 个提交圆点，再汇合回主线。

**统一每张的提示词格式**：
```
[全局风格块] <上面该课的画面描述>. 16:9 wide composition with the focal object centered-right
and quiet empty space on the left for a title overlay.
```

## E. 空状态与错误（各 800×600，4:3）
- `empty-no-progress.png`：Byte 站在一条完全灰色的走线起点，指向第一个节点，姿态邀请。
- `empty-no-projects.png`：一个空的文件夹托盘，旁边有一个小零件箱，Byte 拿着一块零件。
- `error-offline.png`：一条走线在中间断开，两端各有一个小插头，Byte 举着手机线。
- `error-404.png`：一张地图上的走线通向一个问号形状的空焊盘（用形状，不要写字符），Byte 困惑歪头。
```
[全局风格块] <场景描述>. 4:3 composition, centered, lots of empty space, friendly and calm.
```

## F. 徽章（各 512×512，1:1，圆形或六边形，统一线宽）
发放条件由程序判定，美术只出图。
1. `badge-first-bit.png`：一个亮起的开关 → 完成第一课
2. `badge-gatekeeper.png`：三个逻辑门连成回路 → 完成逻辑门单元
3. `badge-packet-pilot.png`：一个带翅膀的数据包方块 → 完成网络路线
4. `badge-prompt-smith.png`：锤子与一块指令积木 → 完成提示词单元
5. `badge-agent-builder.png`：小机器人拿着扳手 → 完成 AI 助手作品
6. `badge-formula-wizard.png`：一个被点亮的单元格与星形 → 完成公式单元
7. `badge-game-maker.png`：像素星星与小手柄 → 完成游戏作品
8. `badge-streak-7.png`：七个连续点亮的焊盘 → 连续学习 7 天
```
[全局风格块] Achievement badge: a circular medallion with a thick navy outline, light fill,
and one central symbol: <符号描述>. Flat, simple, readable at 64px. Amber accent only on
the key element.
```

## G. 验收清单（美术自检）
- [ ] 没有任何文字/字母/数字/中文
- [ ] 线宽一致，只用色板内颜色
- [ ] 没有渐变/发光/3D/照片质感
- [ ] 同一类别风格统一（路线徽记看起来是一套）
- [ ] 缩小到 64px 仍能看出主体
- [ ] 没有复制现有公司或产品的商标（Unity、Google、Excel 等）
- [ ] 文件名与尺寸符合上表
