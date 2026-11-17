# Batch02 课程居中插画接入与实际验收

2026-11-17（Asia/Kuala_Lumpur）。基于最新 main `4fad606`（P1 PR #3 已合并），独立分支 `codex/nico-centered-art-batch02`。已先解压阅读上传 ZIP 的 CODEX_PROMPT.md、README_FIRST.md，检查全部五张原图，并按 AGENTS 阅读 blueprint 01–05 与 STATUS。先报告冲突/四步计划，再修改。仅视觉接入，不改教学或互动。

## 实际修改与冲突处理

| 课程 | 新 art 文件 | 原 artPending |
| --- | --- | --- |
| A07 | `lesson-a07-os.png` | 移除 |
| A08 | `lesson-a08-command-line.png` | 移除 |
| A11 | `lesson-a11-devices.png` | 移除 |
| A12 | `lesson-a12-packets-centered-batch02.png` | 移除 |
| A14 | `lesson-a14-tcp.png` | 移除 |

**A12 同名冲突**：main 已有 `public/art/lesson-a12-packets.png`。在写文件前已向用户报告；保留旧文件及字节，新版使用无冲突名称。其余四个目标文件不存在。所有新文件均使用排他创建方式写入，未静默覆盖。

五张图均为上传的原始 **1672×941 PNG**，逐字节与 ZIP 比较一致，没有重绘、裁切、缩放重编码、平移、加滤镜或改色。保留浅色方格纸、海军蓝描边和蓝色/琥珀色点缀。

## 两层居中检查

**图片内部构图**：逐张查看原图和实际页面。另用 navy/blue/amber 像素阈值（最小通道 <100，且通道差 >30 或最大通道 <140）排除浅色纸面与网格，计算主体包围盒及墨迹质心，辅助人工核对。该指标是可复现的几何测量，不冒充主观视觉评分。

| 图片 | 主体左留白 px | 主体右留白 px | 包围盒中心偏差/画布宽 | 墨迹质心偏差/画布宽 |
| --- | ---: | ---: | ---: | ---: |
| a07-os | 370 | 371 | 0.03% | 4.33% |
| a08-command-line | 405 | 407 | 0.06% | 4.43% |
| a11-devices | 363 | 361 | 0.06% | 0.04% |
| a12-packets | 454 | 441 | 0.39% | 0.17% |
| a14-tcp | 429 | 442 | 0.39% | 0.21% |

左右留白差为 1–13px；包围盒中心偏差均 <0.4%，墨迹质心偏差均 <5%。没有把主体集中在画布右侧。保留原图全部留白，不通过 CSS 遮掩构图。

**图片在页面中的位置**：先用 main 的现有 A06 插画测量基线，再检查本轮五课。`LessonPlayer.tsx` 直接在 `.lesson-body` 内渲染图片；`.lesson-art` 已是 `display:block; width:100%; height:auto`，计算样式为 `object-position:50% 50%`、`transform:none`，按原图比例完整显示。图片与正文内容区域 `.lesson-body` 同中心，并与下方 Hook 卡片左右边界重合；三种宽度的中心误差均 <1 CSS px。

桌面正文保留原有 `max-width:68ch` 阅读宽度，未调整标题、章节目录、导航或外层栏宽。未复现图片相对正文内容区域的偏移，因此遵循 ZIP 中“只有在浏览器复现容器偏移时才进行最小 CSS 修复”的要求，**LessonPlayer.tsx 和所有 CSS 均未改**。不使用 right、translate、定位偏移或 object-fit:cover；现有 img 的 1600×900 HTML 尺寸提示不限制解码后的自然比例，实际比例测试通过。

[实际布局与主体测量](measurements.json) · [修改前布局测量](baseline-layout.json) · [源码/素材保护与哈希](asset-verification.json)

## 实际截图

全部来自生产 build 的 Chromium 实际页面，没有修改 DOM 或注入截图样式。1440×1000、390×844、360×800；窄屏用移动/触摸上下文。截图包含完整插画、标题和下方正文卡片边界，原图上下左右均保留。

| 课程 | main 桌面基线 | 修改后 1440px | 修改后 390px | 修改后 360px |
| --- | --- | --- | --- | --- |
| A07 | [之前](before-a07-os-1440.png) | [桌面](a07-os-1440.png) | [手机](a07-os-390.png) | [小屏](a07-os-360.png) |
| A08 | [之前](before-a08-command-line-1440.png) | [桌面](a08-command-line-1440.png) | [手机](a08-command-line-390.png) | [小屏](a08-command-line-360.png) |
| A11 | [之前](before-a11-devices-1440.png) | [桌面](a11-devices-1440.png) | [手机](a11-devices-390.png) | [小屏](a11-devices-360.png) |
| A12 | [之前](before-a12-packets-1440.png) | [桌面](a12-packets-1440.png) | [手机](a12-packets-390.png) | [小屏](a12-packets-360.png) |
| A14 | [之前](before-a14-tcp-1440.png) | [桌面](a14-tcp-1440.png) | [手机](a14-tcp-390.png) | [小屏](a14-tcp-360.png) |

main 的五门课均为“课程插画待提供”，上述“之前”图片忠实记录该状态，不伪造旧版插画上线路径。

## 测试结果

Node.js 24.22.1，符合项目 >=22；无新增依赖，package.json/package-lock.json 未改。所有结果为本轮执行，日志保留环境 UTC 时间。

| 检查 | 结果 | 日志 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | [日志](logs/typecheck.log) |
| `npm run lint` | 最终通过 | [日志](logs/lint.log) |
| `npm test` | 30 文件、479 项通过 | [日志](logs/test.log) |
| `npm run build` | 通过，既有大 chunk / Zod 注释提示保留 | [日志](logs/build.log) |
| `npm run smoke` | 187 项通过 | [日志](logs/smoke-a.log) |
| `npm run smoke:b` | 103 项通过，真实 Pyodide | [日志](logs/smoke-b.log) |
| `npm run smoke:ai` | 关闭26 / 假服务启用38项通过 | [关闭](logs/smoke-ai.log) / [启用](logs/smoke-ai-enabled.log) |
| `npm run smoke:academy` | 145 项通过 | [日志](logs/smoke-academy.log) |
| `npm run smoke:foundation` | 78 项通过 | [日志](logs/smoke-foundation.log) |
| `npm run smoke:network` | 331 项通过 | [日志](logs/smoke-network.log) |
| `node scripts/check-lesson-art.mjs` | 110 项通过 | [日志](logs/art-browser.log) |

浏览器合计 **1018 项通过**（原有回归908＋插画专项110）。专项逐课逐宽度检查：正确新版路径/自然尺寸、默认暗色/草稿/无占位、整张图片正文居中、主体中心在5%内、原始比例且无裁剪/偏移/滤镜、完整图片位于视口内且未被底栏遮挡、无横向滚动和 JS 异常；390px 还实际触摸切换亮色并恢复暗色。

既有插画待补断言改为真实图片路径/加载检查，保留所有学习、模拟、判分、成绩与续学断言；没有删测试。新增检查脚本初次 lint 有3处 `innerWidth/innerHeight` 全局引用错误，改为 `window.innerWidth/innerHeight` 后重跑 lint 与完整110项浏览器检查通过。[初次 lint 日志](logs/lint-initial.log) 如实保留。没有修改 ESLint 规则。

复现：`npm run build`，另一个终端 `npm run preview -- --port 4182`，然后 `BASE_URL=http://localhost:4182 SCREENSHOT_DIR=test-results/art-batch02 node scripts/check-lesson-art.mjs`。AI 启用回归在独立 outDir/4183 执行，不覆盖默认关闭构建。

## 保护与限制

- main 原有 **56 个 public/art 文件全部 SHA-256 不变**，含同名 A12 旧图、A–E 路线、Logo、Hero、Byte、徽章与其他课程插画。仅新增5文件，合计61文件。
- 五门课只把 `artPending:true` 替换为 `art` 路径；以 main 源码替换复算并逐字比较，其他内容完全一致。quality 仍 draft，无试学状态变更。
- LessonPlayer、CSS、Academy、PathMap、课程正文/题目/互动/判分、学习进度、AI、Schema、目录状态、依赖均无修改，详见保护记录。
- 实测为 Chromium 桌面/移动视口，未测实体手机或 Safari/Firefox；未调用真实 AI，启用模式使用已有假服务。
- 插画已接入，此轮没有其他待实现功能。尚未合并或部署，等用户审阅 PR。

[全部修改文件](CHANGED_FILES.txt)
