# Nico Academy — ART LAYOUT AUDIT

2026-11-17（Asia/Kuala_Lumpur）。基线 main `df1a7e4`，Batch02 PR #4 已合并；本轮独立分支 `codex/nico-art-layout-audit`。已阅读 AGENTS.md、blueprint 01–05、STATUS 和上一轮插画报告；先完成只读问题清单并向用户报告，再执行修复。用户明确选择“无损重排原图像素与网格背景，另存居中副本”，没有生成式重绘。

## 范围与结论

从 `src/content/index.ts` 实际课程注册表及目录的 `available` 状态枚举，核对全部 **29门可访问课程、28张当前引用插画**，不是只检查Batch02。A10无图片引用，保持原样。目录的可访问不等于课程通过真实试学，质量状态没有变更。

- 四张原图整体明显偏右：A01、A06、B15、C05。已分别生成1600×900无损居中副本，仅改对应课程的art路径，原文件留作备份。
- Batch02五张及其引用完整保留；所有原有 `public/art/` **61个文件**（60张PNG及README）SHA-256均不变。路线A–E、Logo、Hero、Byte、徽章与其他图片没有重新设计。
- 全部图片容器在1440/390/360与 `.lesson-body` 正文中心一致；原始比例完整显示，无CSS裁切、拉伸、滤镜或定位偏移。因此没有修改CSS、LessonPlayer或其他UI。
- **人工另列三张源图特征**：A05主芯片偏左且左右含边缘截断延展；A09两侧有贴边延展；B14上下有重复/截断图元。这些不是浏览器裁切。本轮依保护原画规则保留，列为后续美术复核项，不宣称已修复或整张构图均获人工验收。

## 逐张审查

每行均完成桌面1440px、手机390px、360px实际查看。默认暗色、图片正文居中、比例、完整画布和无横向滚动均通过；下表“偏移”同时区分原图构图与CSS容器，不以自动包围盒代替人工判断。

| 对应课程 | 当前引用文件（public/art/） | 原图偏移/留白问题 | 是否需要修复 | 实际修改或保留内容 |
| --- | --- | --- | --- | --- |
| `a01-binary` | `lesson-a01-bits-centered-audit.png` | 是，原图整体偏右 14.56%；左右 598/132px | 是，已修复 | 原 `lesson-a01-bits.png` 保留备份；图组左移 233px另存副本；现留白 365/365px |
| `a02-hex-encoding` | `lesson-a02-hex-encoding.png` | 未见明显水平偏移；留白 243/119px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `a03-logic-gates` | `lesson-a03-logic-gates.png` | 未见明显水平偏移；留白 88/88px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `a04-adder` | `lesson-a04-adder.png` | 未见明显水平偏移；留白 118/139px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `a05-cpu-cycle` | `lesson-a05-cpu-cycle.png` | 主CPU偏左；左右有源图截断延展图元 | 需原画构图复核，非CSS修复 | 保留原图；不擦除延展、不补绘。主芯片与存储条为一个图组，自动全图包围盒会掩盖主芯片的视觉配重。 |
| `a06-memory` | `lesson-a06-memory-layers-centered-audit.png` | 是，原图整体偏右 11.88%；左右 653/273px | 是，已修复 | 原 `lesson-a06-memory-layers.png` 保留备份；图组左移 190px另存副本；现留白 463/463px |
| `a07-os` | `lesson-a07-os.png` | 未见明显水平偏移；留白 370/371px | 否 | 原文件与引用均未修改；Batch02已确认满意，保持保护 |
| `a08-command-line` | `lesson-a08-command-line.png` | 未见明显水平偏移；留白 405/407px | 否 | 原文件与引用均未修改；Batch02已确认满意，保持保护 |
| `a09-network-layers` | `lesson-a09-network-layers.png` | 中央分层居中；两侧源图有贴边延展 | 需原画确认延展是否保留 | 保留完整源画布；不删左右图元。 |
| `a10-ip-subnet` | — | 无图片引用 | 不生成替代插画 | 未修改；不把无插画算作加载失败 |
| `a11-devices` | `lesson-a11-devices.png` | 未见明显水平偏移；留白 363/361px | 否 | 原文件与引用均未修改；Batch02已确认满意，保持保护 |
| `a12-packets` | `lesson-a12-packets-centered-batch02.png` | 未见明显水平偏移；留白 454/441px | 否 | 原文件与引用均未修改；Batch02已确认满意，保持保护 |
| `a13-dns` | `lesson-a13-dns.png` | 未见明显水平偏移；留白 59/59px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `a14-tcp` | `lesson-a14-tcp.png` | 未见明显水平偏移；留白 429/442px | 否 | 原文件与引用均未修改；Batch02已确认满意，保持保护 |
| `b01-variables` | `lesson-b01-variables.png` | 未见明显水平偏移；留白 194/194px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b02-conditions` | `lesson-b02-conditions.png` | 未见明显水平偏移；留白 200/258px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b03-loops` | `lesson-b03-loops.png` | 未见明显水平偏移；留白 100/100px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b04-functions` | `lesson-b04-functions.png` | 未见明显水平偏移；留白 143/157px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b05-lists` | `lesson-b05-lists.png` | 未见明显水平偏移；留白 200/200px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b06-dicts` | `lesson-b06-dicts.png` | 未见明显水平偏移；留白 521/521px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b07-debugging` | `lesson-b07-debugging.png` | 未见明显水平偏移；留白 49/167px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b08-html` | `lesson-b08-html.png` | 未见明显水平偏移；留白 334/333px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b09-css` | `lesson-b09-css.png` | 未见明显水平偏移；留白 95/95px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b10-css-layout` | `lesson-b10-css-layout.png` | 未见明显水平偏移；留白 59/58px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b11-js-dom` | `lesson-b11-js-dom.png` | 未见明显水平偏移；留白 111/185px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b12-events` | `lesson-b12-events.png` | 未见明显水平偏移；留白 158/102px | 否 | 原文件与引用均未修改；保留原有图元与配色 |
| `b14-git-basics` | `lesson-b14-git-basics.png` | 流程主体水平居中；上下源图有重复/截断图元 | 需原画确认重复图元 | 保留原图；不自行裁切中央行或抹掉上下图元。 |
| `b15-git-branches` | `lesson-b10-git-branches-centered-audit.png` | 是，原图整体偏右 12.59%；左右 617/214px | 是，已修复 | 原 `lesson-b10-git-branches.png` 保留备份；图组左移 201px另存副本；现留白 416/415px |
| `c05-prompt-structure` | `lesson-c05-prompt-structure-centered-audit.png` | 是，原图整体偏右 9.94%；左右 599/281px | 是，已修复 | 原 `lesson-c05-prompt-structure.png` 保留备份；图组左移 159px另存副本；现留白 440/440px |

B15真实课时ID是 `b15-git-branches`，沿用历史图片名中的b10；没有重命名课程ID或修改课程顺序。[原始枚举](docs/qa/art-layout/inventory.json) · [原图测量](docs/qa/art-layout/source-metrics.json) · [修改后测量](docs/qa/art-layout/source-metrics-after.json)

## 四张修正版：无损且不覆盖

| 课程 | 原左右留白px | 新左右留白px | 图组水平移动px | 保留的原图元像素 |
| --- | ---: | ---: | ---: | ---: |
| `a01-binary` | 598/132 | 365/365 | -233 | 136,504 |
| `a06-memory` | 653/273 | 463/463 | -190 | 168,990 |
| `b15-git-branches` | 617/214 | 416/415 | -201 | 11,650 |
| `c05-prompt-structure` | 599/281 | 440/440 | -159 | 90,568 |

图元只按整数坐标整体移动，垂直位置、原始尺寸、连接关系、形状、线宽、色值与透明度均保持。用源图本身的32×32周期网格恢复背景；不缩放、不重采样、不裁掉图元，不改变角色或内容。C05包含Byte，但Byte的图元像素保持原样，只随整个课程图组移动，没有重新设计角色。

原文件仍位于原 `public/art/` 路径，作为永久原始备份；新增文件使用 `-centered-audit.png`，采用排他写入，遇到目标同名文件会失败，不会覆盖。四图均通过浏览器逐像素比较，并用独立Pillow解码再次核验完整RGBA数组：[无损验证](docs/qa/art-layout/pixel-preservation.json) / [独立验证](docs/qa/art-layout/pixel-independent.json)。新脚本只使用项目已有Playwright，没有新增依赖。

## CSS与构图判据

先测量未修改main的全部页面，优先排查容器。`.lesson-art` 原本就使用 `display:block; width:100%; height:auto`；计算样式 `object-position:50% 50%`、`transform:none`、静态定位、无filter/clip-path，图框与下方Hook卡片左右边界相同，28张图在三个宽度的正文中心误差均为0px。解码后的自然尺寸决定比例，没有固定高度导致拉伸。

正文原有68ch阅读宽度保留。没有为了把图片移到整个桌面窗口中央而挪动正文、标题、目录或导航，也没有统一加负margin、translateX、object-position偏移或cover裁切。网站默认深色科技风及所有其他UI不变。

浅色网格之外的深色/彩色像素包围盒用来初筛偏移（最小RGB通道<100，且通道差>30或最大通道<140）。颜色密度、墨迹质心不是统一的美术配重要求；例如C05左侧有六张实色卡片、右侧是浅色Byte，不能为了密度数字而改画角色/卡片。修正后四张图组包围盒中心偏差最多0.031%。其余图片保留本身的语义图组与留白。

**重要限制**：A05/A09/B14的源图贴边或重复图元会让全画布包围盒看起来“对称”。自动检查只能证明页面完整显示了源画布，不能证明源图内部不存在被画布切断的延展元素，也不能代替人工确认主视觉。本报告单列这些问题，不通过CSS遮掩，不擅自删除/补绘；若用户希望处理，应先确认哪些源图构图允许变更，再另存美术修订版。

## 全量前后实际截图

[29门课、三个宽度的完整前后截图索引](docs/qa/art-layout/README.md)，共174张实际页面截图（前87＋后87）。每图包含完整插画、课程标题和下方正文边界；A10页面无图如实记录。没有注入截图布局样式。

未改图片的75组截图中，52组PNG字节完全相同；另外23组仅有25–28个圆角边框像素的浏览器栅格差异，均位于未变化图片四角7px范围内，原图哈希、主体及布局几何不变，见[截图对照](docs/qa/art-layout/screenshot-comparison.json)。

## 运行结果

Node.js24.22.1（项目要求>=22），既有依赖；生产build的Chromium桌面与移动/触摸上下文。日志保留执行环境UTC时间。

| 命令/检查 | 本轮结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过 |
| `npm test` | 30文件、479项通过，无删改旧测试 |
| `npm run build` | 通过；既有大chunk与Zod注释提示保留 |
| `npm run smoke` | 187项通过 |
| `npm run smoke:b` | 103项通过，真实Pyodide |
| `npm run smoke:ai` | 关闭26 / 假服务启用38项通过 |
| `npm run smoke:academy` | 145项通过 |
| `npm run smoke:foundation` | 78项通过 |
| `npm run smoke:network` | 331项通过 |
| 既有Batch02插画专项 | 110项通过，确认满意五图保持正常 |
| 全站修改前审查 | 600项布局检查通过，另记录4张原图右偏及人工源图特征 |
| 全站修改后审查 | 684项通过（含84项源图包围盒中心检查） |
| 四张无损副本验证 | 4张通过，原图元像素与背景重排逐像素匹配 |

修改后浏览器合计 **1702项通过**（旧回归908＋Batch02专项110＋全量审查684），另有4张独立像素验证通过。没有修改或删除旧互动、判分、成绩、续学测试。自动化通过不等同于三张源图特征已获美术确认。没有测试失败。

[全部原始日志](docs/qa/art-layout/logs/) · [修改前浏览器数据](docs/qa/art-layout/audit-before.json) / [修改后数据](docs/qa/art-layout/audit-after.json)

## 保护记录、未完成与复现

61个原文件均与main字节一致，只新增4张派生图。四个课程源码以替换art路径复算，其他字节完全相同；课程内容、互动、判分、学习进度、ID、质量状态、AI、Schema、目录状态、依赖、默认主题均无修改。[保护记录](docs/qa/art-layout/preservation.json)

A10无正式插画，不生成替代图。A05/A09/B14上述源图构图问题保留待美术复核，未擅改已满意设计。手机验证为Chromium移动视口，未测实体设备或Safari/Firefox；AI启用模式使用既有假服务，未调用真实模型。未合并或部署。

复现全量检查：`npm run build`；另一终端 `npm run preview -- --port 4184`；`BASE_URL=http://localhost:4184 SCREENSHOT_DIR=test-results/art-audit node scripts/audit-lesson-art.mjs`。

验证四图：`node scripts/center-lesson-art.mjs`。已有派生图不会被默认重写；仅在缺失时可用`--write`生成，遇到同名立即拒绝覆盖。详细使用见[截图索引](docs/qa/art-layout/README.md)。

[完整修改文件清单](docs/qa/art-layout/CHANGED_FILES.txt)
