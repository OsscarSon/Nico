# Nico Academy P2 UI/UX 完整交付报告

2026-11-17，Default Environment。基于最新main `0aa1b1c0aea2fd0df8135f6ba7e092112f967d2e`，独立分支`codex/nico-p2-ui-ux`。交付一个PR供审阅，不合并、不部署。

已完整解压阅读README_FIRST、ASSET_MANIFEST、CODEX_ONE_SHOT_PROMPT并校验套件SHA256；阅读AGENTS、blueprint 01–05、STATUS、路由/目录/Schema/播放器/地图/进度/徽章/设置/主题架构。[编码前计划与清点](docs/P2_PLAN.md)随首个实现提交保存。

## 全部规格实施结果

|阶段|实际实现|证据|
|---|---|---|
|0 清点与保护|锁定基线；记录86个既有美术文件和103个既有课程/模拟器/判分/AI/进度实现保护摘要；无同名冲突；A10原图与引用保留；对比A16两图，按用户明确批准启用套件新版|[原图清单](docs/p2/PROTECTED_ART.json)、[实现保护](docs/p2/PROTECTED_IMPLEMENTATION.json)|
|1 全路线一致性|目录、地图、单元统计共用确定性routeNode/routeView；A图22节点＝20已上线＋A21/A22规划；四个A单元可折叠、有真实分单元统计。B/C及D/E/F/M按各阶段实际目录显示，无虚构上线或锁定|`route-view.ts`、P2单元/浏览器测试|
|2 响应式布局|1440/1280桌面、1024/768平板、390/360手机检查Home/路线/目录/课时/Lab/Prompt/AI/作品/我的/设置。桌面首页、节点、仪表盘和设置使用内容网格；1024图标导航保留可访问名称，课时右栏只在>=1280出现|实际六宽度测试、[前后截图](docs/qa/p2/README.md)|
|3 设计系统|统一暗色海军蓝、可选亮色/跟随系统、间距/卡片/按钮/表单/焦点/状态；正文76ch，图片和实验可占更宽内容栏；手机主栏16px边距及五项底栏保持。沿用原字体/系统回退栈，移除远程字体依赖，无新增字体或依赖|`p2.css`、字号/密度/动效实际CSS检查|
|4 插画接入|6张课程、4张单元、2张规划预览、2张装饰PNG，以及对应14份SVG源文件，全部精确复制。六课artPending改为真实art；旧文件全部原字节保留，预览拼图未进入项目|[安装清单](docs/p2/ASSET_INSTALLATION.json)、35课全图审查|
|5 我的仪表盘|身份卡用提供的背景配React动态值，默认头像复用原app-icon；可编辑昵称/路线。完成课数、连续天数、最近完成、路线进度、续学推荐和徽章/获得条件均从现有记录计算；未开放徽章明确原因|昵称持久化、真实通过课程后的截图、原徽章回归|
|6 功能设置中心|外观、学习、个人资料、数据与隐私、AI、关于六组全部落地；新增偏好独立v1键并兼容旧外观。原v1进度导入/合并/导出/清除核心未改，增加确认、取消、反馈和补充输入校验|偏好模型、完整设置浏览器流程、旧导入测试|
|7 质量门槛|typecheck/lint/Vitest/build、全部既有相关smoke、两种AI模式、新P2流程和原插画检查通过；人工检查实际前后截图；无旧测试删除|[输出与初次失败修复](docs/qa/p2/VALIDATION.log)|

## 路线状态与A21/A22方案A

Academy原`curriculum.json`是212门规划/状态来源，legacy catalog/lesson registry保留已实现课程身份和原进度键。新增的**展示适配层**合并二者；课程行、地图和单元计数都使用它，不另造课程内容、先修锁定或质量语义。

- A21/A22从原规划条目进入A3网络单元末尾，显示独立预览及“规划中 · 下一批 / 试点”，不是链接、没有开始按钮。目录可展开规划说明，也不能进入学习。直接访问不存在的lesson仍诚实显示未开放。
- A1/A2/A3/A4分别保留数字语言、电脑内部、网络、安全四个既有单元；计数为4/4/9/3已上线，A3另有2个规划。原A01–A20的课程ID、教学内容、先修和下一课不变，A20仍返回A路线。
- legacy课程注册表仍只有原20门真实A课程；不用新增假Lesson来凑22。Academy A显示20/22；Foundation仍35/100、全目录212。其他路线没有新增课程或被擅自设为可学。
- 完成来自保存记录；可开始来自真实内容；续学/下一课单独标记；draft/pilot属于内容质量。规划不因导入一个未知完成键而成为可学。
- 单元用原生details/summary折叠，键盘焦点留在摘要。阶段/路线进入URL查询参数，`?unit=a3`可定位并聚焦单元；切换阶段不把焦点/滚动无故拉回顶部。旧URL保持可用。

## 已实现偏好与数据边界

新键`nico-preferences`，schemaVersion 1；不修改学习记录`nico-progress` v1。读取兼容`nico-theme`和`nico-settings`，保留旧字号/主题；v0偏好保守迁移，损坏/未来版本在用户写入新选择前另存本机备份。存储不可用时本次仍生效，并明确提示可能无法跨刷新保存。

|控制|真实行为|
|---|---|
|暗色 / 亮色 / 跟随系统|即时改变主题，保存选择；系统模式监听设备变化，明确选择暗色时不跟随；无偏好仍默认暗色|
|标准 / 大字号|根字号16/18px，刷新保留；360px大字号逐页检查|
|舒适 / 紧凑密度|真实面板/列表间距变化，手机设置也有变化，触控目标不缩成小按钮|
|跟随设备 / 减少动效|系统偏好保留；减少模式真实移除过渡、动画和平滑滚动|
|默认进入页面|无明确地址的新访问进入首页/路线/目录/我的；已有深链接、首页导航和浏览器返回不被强制改写|
|显示规划课程|同时影响总目录、路线课程列表和地图，隐藏不改真实目录计数；全规划路线有对应空状态|
|首页优先续学|控制首页推荐优先级；直接开课仍使用原续学机制，不清除旧步骤|
|昵称 / 偏好路线|昵称最多24字符并校验控制字符，留空有默认名；偏好真实影响下一课推荐，无已上线内容时回退可学课程；仅存本机|
|显示AI快捷入口|只隐藏/显示课内和实验台快捷入口，不伪称连接、断开或删除数据；直接AI地址保持可访问|
|导出 / 导入 / 取消 / 清除|实际下载v1进度；本地读文件、校验、预览并确认合并；取消不改记录；清除进度二次确认且保留偏好；个人资料有独立确认/取消|

没有承诺可用却未接线的偏好。通知排程、账号/云同步、学习时长、等级/XP和正式认证不在现有能力中，关于页明确列为尚未提供；没有伪装为有效开关或数据。AI配置只表述“未配置”或“已配置 · 未检测连接”，依据aiEnabled()，不将配置地址冒充成功连通。

默认身份标题是“自主学习者”或所选路线学习者，不是获得的等级/资历。徽章仍调用原evaluateBadges；最近完成仅展示实际已保存记录。没有编造学习时长、历史、排行、成就或认证。

## 素材安装与视觉保护

|独立PNG|使用位置|
|---|---|
|lesson-a15-udp.png、lesson-a16-http-https.png、lesson-a17-web-journey.png|A15/A16/A17开场|
|lesson-a18-passwords.png、lesson-a19-phishing.png、lesson-a20-least-privilege.png|A18/A19/A20开场|
|unit-a1-digital.png、unit-a2-computer.png、unit-a3-network.png、unit-a4-security.png|A路线四单元补充横幅，不替代路线徽记|
|planned-a21-http-status.png、planned-a22-error-logs.png|仅明确规划的节点/详情预览|
|profile-identity-background.png|身份卡装饰底图，无烘焙文字或统计|
|roadmap-trace-banner.png|路线概览装饰，实际节点仍为DOM/SVG与真实状态|

每张另保留同名SVG源文件。A16旧图`lesson-a16-https-lock.png`保留；用户在本轮明确同意使用居中套件新版。A10及所有旧路线图/Logo/Hero/Byte/徽章/课程图片均未覆盖、删除或改画。安装清单列出逐文件来源、目的路径和SHA256；原86文件SHA256全部一致。103个旧课程/模拟器/判分/AI/进度/lockfile保护检查通过，课程源只允许六个art元数据字段变化。

课头图采用自然比例、contain和中央对齐，无偏移/负margin/裁切技巧。新课程图是1600×900；旧1672×941等图保留自身精确比例。阅读正文最大76ch，图片更宽但中心与文本一致；原插画脚本据P2新规格检查“共同中心＋文本包含在宽图栏”，自然比例/无裁切/主体偏移阈值等原检查保留。

## 真实测试结果

环境Node v24.22.1，项目要求>=22；依赖/lockfile未变，未新增项目依赖。主构建与AI启用隔离构建分开，浏览器测试期间不清理主dist。AI只用既有拦截mock，不调用真实服务。

|检查|结果|
|---|---|
|main基线typecheck/lint/test/build|通过，605项旧测试|
|npm run typecheck|通过|
|npm run lint|通过|
|npm test|通过，41文件616项，旧测试保留|
|npm run build|通过，既有大chunk提示保留|
|npm run smoke、smoke:b|通过，包含实际完成课程与成绩/徽章/续学/清除流程|
|npm run smoke:ai|关闭与启用mock均通过，新增设置配置状态真实性检查|
|npm run smoke:academy|通过，主题集中设置、七路线美术、URL/键盘切换、搜索/分页/旧进度保留|
|npm run smoke:foundation、smoke:network、smoke:web、smoke:security|全部通过，旧课程实操、真实判分和学习进度保持|
|npm run smoke:p2|通过，六宽度全站、每个偏好真实效果与持久化、A21/A22两表面、个人资料、导入/导出/取消/清除、跨标签偏好、坏版本备份和存储禁用|
|node scripts/check-lesson-art.mjs|通过，原Batch02的居中、比例、完整显示和主题检查|
|node scripts/audit-lesson-art.mjs|通过，35已上线课/35引用图片，三宽度加载、自然比例、居中、无裁切/偏移/遮挡、主体边界及JS检查|

实际输出、初次失败与修复见[VALIDATION.log](docs/qa/p2/VALIDATION.log)。初次6个旧断言仍要求未提供插画占位，现更新为确切正式文件且无pending；未删除课程结构/质量检查。首轮P2发现手机密度覆盖问题并修复，系统主题检查等待真实媒体事件；阶段切换测试等待URL驱动的选中态，设置页就绪选择器补上真实设置面板。没有为了通过删除测试。

首轮专项脚本误用npm exec，临时选取了Node 27工具包；已改为环境Node 24直接调用并全量复验。项目依赖和lockfile未变，最终结果以Node 24及PR CI为准，不混用初次日志宣称通过。

## 前后截图与人工检查

[完整索引](docs/qa/p2/README.md)：8张改版前、16张双主题主图、2张规划节点特写、2张实际完成记录态，共28张；没有把旧套件产生的大量临时截图重复提交。

- 桌面：原单列长条路线改为四单元/双列节点；“我的”由统计/徽章列表变为身份卡、续学、最近完成、路线进度等模块；设置按功能分组两列。首页同样以网格利用宽度。
- 平板：1024用带无障碍名称的紧凑图标导航、768用原底栏；课时右目录隐藏，实验可使用完整内容宽度。
- 手机：保留16px主边距、16px基础字号、单栏与原五项底栏。390/360均实操检查，360另测大字号，按钮可达且无横向溢出。
- 个人页有记录态的5课/1天/2枚徽章来自旧smoke真实通过A01–A05；不注入完成数据。其他主图0课/1天来自实际浏览开场沿用原学习日规则。两者都是自动化测试记录，不是真人试学证据。

已人工对照查看实际桌面/手机与深浅色画面、A16新旧图、个人页不同记录状态；像素/几何检查作补充，不用自动截图代替艺术判断或教学验收。

## 已知限制与保留范围

- 未测实体手机、Safari/Firefox；本轮为Linux Chromium与模拟触屏/键盘。未调用真实AI验证服务连通性。
- 课程质量、学习进度语义、旧模拟器与判分未改；包括A20在内仍是draft。没有新增真人试学证据或替旧课补教学内容。
- 通知/云账号/同步、时长/XP/等级、认证明确未提供，不属于可用偏好；没有空壳功能。学习记录仍使用既有v1存储与单页状态机制；跨标签新增同步的是偏好，不伪称新增跨标签学习进度同步。
- 字体有系统/CJK回退且不依赖远程请求；未声称实现完整PWA离线缓存。构建仍提示较大chunk，未为消除提示重写编辑器或引入依赖。
- 仍需用户审阅新的视觉设计。测试通过不代表用户视觉验收或学习效果认证。

## 全部修改文件

共99个修改/新增文件；其中28个为独立素材，28个为实际截图。原public/art文件无修改。

### 应用与课程展示

- [index.html](index.html)
- [package.json](package.json)
- [src/app/App.tsx](src/app/App.tsx)
- [src/app/router.tsx](src/app/router.tsx)
- [src/content/lessons/a15-udp.ts](src/content/lessons/a15-udp.ts)
- [src/content/lessons/a16-http-https.ts](src/content/lessons/a16-http-https.ts)
- [src/content/lessons/a17-web-journey.ts](src/content/lessons/a17-web-journey.ts)
- [src/content/lessons/a18-passwords.ts](src/content/lessons/a18-passwords.ts)
- [src/content/lessons/a19-phishing.ts](src/content/lessons/a19-phishing.ts)
- [src/content/lessons/a20-least-privilege.ts](src/content/lessons/a20-least-privilege.ts)
- [src/content/route-view.ts](src/content/route-view.ts)
- [src/features/academy/AcademyCatalog.tsx](src/features/academy/AcademyCatalog.tsx)
- [src/features/lesson/LessonPlayer.tsx](src/features/lesson/LessonPlayer.tsx)
- [src/features/path/PathMap.tsx](src/features/path/PathMap.tsx)
- [src/features/profile/ProfileEditor.tsx](src/features/profile/ProfileEditor.tsx)
- [src/features/profile/ProfilePage.tsx](src/features/profile/ProfilePage.tsx)
- [src/features/settings/SettingsPage.tsx](src/features/settings/SettingsPage.tsx)
- [src/main.tsx](src/main.tsx)
- [src/pages/pages.tsx](src/pages/pages.tsx)
- [src/preferences/model.ts](src/preferences/model.ts)
- [src/preferences/store.ts](src/preferences/store.ts)
- [src/styles/p2.css](src/styles/p2.css)

### 测试与脚本

- [scripts/audit-lesson-art.mjs](scripts/audit-lesson-art.mjs)
- [scripts/check-lesson-art.mjs](scripts/check-lesson-art.mjs)
- [scripts/smoke-academy.mjs](scripts/smoke-academy.mjs)
- [scripts/smoke-ai.mjs](scripts/smoke-ai.mjs)
- [scripts/smoke-b.mjs](scripts/smoke-b.mjs)
- [scripts/smoke-foundation.mjs](scripts/smoke-foundation.mjs)
- [scripts/smoke-p2.mjs](scripts/smoke-p2.mjs)
- [scripts/smoke-security.mjs](scripts/smoke-security.mjs)
- [scripts/smoke-web.mjs](scripts/smoke-web.mjs)
- [scripts/smoke.mjs](scripts/smoke.mjs)
- [tests/p2.test.ts](tests/p2.test.ts)
- [tests/security-lessons.test.ts](tests/security-lessons.test.ts)
- [tests/web-lessons.test.ts](tests/web-lessons.test.ts)

### 新增独立素材

- [public/art/lesson-a15-udp.png](public/art/lesson-a15-udp.png)
- [public/art/lesson-a15-udp.svg](public/art/lesson-a15-udp.svg)
- [public/art/lesson-a16-http-https.png](public/art/lesson-a16-http-https.png)
- [public/art/lesson-a16-http-https.svg](public/art/lesson-a16-http-https.svg)
- [public/art/lesson-a17-web-journey.png](public/art/lesson-a17-web-journey.png)
- [public/art/lesson-a17-web-journey.svg](public/art/lesson-a17-web-journey.svg)
- [public/art/lesson-a18-passwords.png](public/art/lesson-a18-passwords.png)
- [public/art/lesson-a18-passwords.svg](public/art/lesson-a18-passwords.svg)
- [public/art/lesson-a19-phishing.png](public/art/lesson-a19-phishing.png)
- [public/art/lesson-a19-phishing.svg](public/art/lesson-a19-phishing.svg)
- [public/art/lesson-a20-least-privilege.png](public/art/lesson-a20-least-privilege.png)
- [public/art/lesson-a20-least-privilege.svg](public/art/lesson-a20-least-privilege.svg)
- [public/art/planned-a21-http-status.png](public/art/planned-a21-http-status.png)
- [public/art/planned-a21-http-status.svg](public/art/planned-a21-http-status.svg)
- [public/art/planned-a22-error-logs.png](public/art/planned-a22-error-logs.png)
- [public/art/planned-a22-error-logs.svg](public/art/planned-a22-error-logs.svg)
- [public/art/profile-identity-background.png](public/art/profile-identity-background.png)
- [public/art/profile-identity-background.svg](public/art/profile-identity-background.svg)
- [public/art/roadmap-trace-banner.png](public/art/roadmap-trace-banner.png)
- [public/art/roadmap-trace-banner.svg](public/art/roadmap-trace-banner.svg)
- [public/art/unit-a1-digital.png](public/art/unit-a1-digital.png)
- [public/art/unit-a1-digital.svg](public/art/unit-a1-digital.svg)
- [public/art/unit-a2-computer.png](public/art/unit-a2-computer.png)
- [public/art/unit-a2-computer.svg](public/art/unit-a2-computer.svg)
- [public/art/unit-a3-network.png](public/art/unit-a3-network.png)
- [public/art/unit-a3-network.svg](public/art/unit-a3-network.svg)
- [public/art/unit-a4-security.png](public/art/unit-a4-security.png)
- [public/art/unit-a4-security.svg](public/art/unit-a4-security.svg)

### 报告、清单与截图

- [P2_REPORT.md](P2_REPORT.md)
- [docs/P2_PLAN.md](docs/P2_PLAN.md)
- [docs/STATUS.md](docs/STATUS.md)
- [docs/p2/ASSET_INSTALLATION.json](docs/p2/ASSET_INSTALLATION.json)
- [docs/p2/PROTECTED_ART.json](docs/p2/PROTECTED_ART.json)
- [docs/p2/PROTECTED_IMPLEMENTATION.json](docs/p2/PROTECTED_IMPLEMENTATION.json)
- [docs/qa/p2/README.md](docs/qa/p2/README.md)
- [docs/qa/p2/VALIDATION.log](docs/qa/p2/VALIDATION.log)
- [docs/qa/p2/after/lesson-dark-1440.png](docs/qa/p2/after/lesson-dark-1440.png)
- [docs/qa/p2/after/lesson-dark-390.png](docs/qa/p2/after/lesson-dark-390.png)
- [docs/qa/p2/after/lesson-light-1440.png](docs/qa/p2/after/lesson-light-1440.png)
- [docs/qa/p2/after/lesson-light-390.png](docs/qa/p2/after/lesson-light-390.png)
- [docs/qa/p2/after/profile-dark-1440.png](docs/qa/p2/after/profile-dark-1440.png)
- [docs/qa/p2/after/profile-dark-390.png](docs/qa/p2/after/profile-dark-390.png)
- [docs/qa/p2/after/profile-light-1440.png](docs/qa/p2/after/profile-light-1440.png)
- [docs/qa/p2/after/profile-light-390.png](docs/qa/p2/after/profile-light-390.png)
- [docs/qa/p2/after/profile-real-ui-completions-1440.png](docs/qa/p2/after/profile-real-ui-completions-1440.png)
- [docs/qa/p2/after/profile-real-ui-completions-390.png](docs/qa/p2/after/profile-real-ui-completions-390.png)
- [docs/qa/p2/after/route-dark-1440.png](docs/qa/p2/after/route-dark-1440.png)
- [docs/qa/p2/after/route-dark-390.png](docs/qa/p2/after/route-dark-390.png)
- [docs/qa/p2/after/route-light-1440.png](docs/qa/p2/after/route-light-1440.png)
- [docs/qa/p2/after/route-light-390.png](docs/qa/p2/after/route-light-390.png)
- [docs/qa/p2/after/route-planned-dark-1440.png](docs/qa/p2/after/route-planned-dark-1440.png)
- [docs/qa/p2/after/route-planned-dark-390.png](docs/qa/p2/after/route-planned-dark-390.png)
- [docs/qa/p2/after/settings-dark-1440.png](docs/qa/p2/after/settings-dark-1440.png)
- [docs/qa/p2/after/settings-dark-390.png](docs/qa/p2/after/settings-dark-390.png)
- [docs/qa/p2/after/settings-light-1440.png](docs/qa/p2/after/settings-light-1440.png)
- [docs/qa/p2/after/settings-light-390.png](docs/qa/p2/after/settings-light-390.png)
- [docs/qa/p2/before/lesson-1440.png](docs/qa/p2/before/lesson-1440.png)
- [docs/qa/p2/before/lesson-390.png](docs/qa/p2/before/lesson-390.png)
- [docs/qa/p2/before/profile-1440.png](docs/qa/p2/before/profile-1440.png)
- [docs/qa/p2/before/profile-390.png](docs/qa/p2/before/profile-390.png)
- [docs/qa/p2/before/route-1440.png](docs/qa/p2/before/route-1440.png)
- [docs/qa/p2/before/route-390.png](docs/qa/p2/before/route-390.png)
- [docs/qa/p2/before/settings-1440.png](docs/qa/p2/before/settings-1440.png)
- [docs/qa/p2/before/settings-390.png](docs/qa/p2/before/settings-390.png)
