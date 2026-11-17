# Foundation A18–A20 设计与实施报告

2026-11-17，基于最新main `23198d354ed8074fe32a1ad8dcdd71451b7b1d88`，分支`codex/nico-foundation-a18-a20`。本轮只新增A路线原有ID对应的三门安全课；不合并、不部署。开始前的[设计与复用评估](A18_A20_DESIGN.md)保留在首个实现提交中。

三课均实现Hook → 四段讲解 → 自由实验 → 三项实操挑战 → 三道诊断题 → 一道迁移 → 三点总结。每课列明先修与权威来源；A18接A19、A19接A20，A20返回A路线。课程可访问状态是available/live，**教学质量仍全部draft**，没有虚构试学或正式验收记录。

## 教学设计与实际完成条件

|课程|知识目标与情景|学生真正能改变什么|挑战通过依据|
|---|---|---|---|
|A18 密码与哈希|三站共用钥匙的多米诺；长度/不可预测性/重复风险，哈希与加密、Salt、管理器、MFA和恢复|两虚构账户选择公开样本及Salt、原生PBKDF2注册/候选验证、更新演示库、配置并实际完成模拟第二因子|①同样本不同Salt，真实不同派生字节，当前版本实际错误/正确验证；②不同管理器流程样本、不同Salt、实际重注册和当前版本入库；③两账户MFA/离线恢复，一账户实际经历等待因子→拒绝陌生钥匙→登记钥匙登录|
|A19 钓鱼与社会工程|两封“紧急”邮件可能不同；显示身份/实际域名、认证局限、请求内容和独立核实|五封虚构邮件可逐项显示证据，选择邮件自带或既有通讯录核实，作报告/暂缓/官方处理决策|决策当时的四类真实证据快照、对应情景的独立核实记录，与域名边界/请求性质/核实结果推导的决策一致；已证伪、合法紧急、未确认请求分别处理|
|A20 最小权限与日常防护|扫描器为何要总钥匙？任务决定权限，设置开关不等于防护效果，备份要能恢复|逐应用逐权限授权、切换语音/视频、实际运行收据/会议/笔记功能；安装模拟补丁、锁屏/陌生访问探测、保存公开笔记v1/v2及备份故障恢复|①扫描器当前最小授权且真实输出成功；②实际最小权限语音后切视频、重新核需求并成功；③全部应用当前授权最小且有有效功能结果，补丁实际安装、锁屏实际阻止、离线副本恢复故障前相同内容并重新读写|

自由实验保留反例：相同Salt的相同派生、长但可预测口令；认证通过但索密且不紧急、已核实的外部合作；全部拒绝导致功能失败、管理员不能替代相机、同区备份一起损毁、旧离线副本恢复不完整。重置累积挑战恢复到上一任务**实际完成时**的内存快照，不自动伪造已注册或已验证结果。

选择题每个错误选项均有针对性诊断，不按猜中一次直接结束课程。迁移题分别要求判断已满足的MFA登录、真实主机名的域边界、按应用分别计算必要授权；有独立模型/算理核对。学习进度继续由原播放器在实操、检查和迁移完成后记录，本轮没有自建一套进度系统。

## 工程与开源复用

- 复用现有React、TypeScript、Zod Lesson Schema、播放器、LabTasks/LabTrace/Feedback、原生表单、主题变量。新增CSS全部在`.security-lab`作用域，使用现有电路风格颜色和边框。
- 简评了`@zxcvbn-ts/core` 4.3.0（MIT，复杂度估计）、`hash-wasm` 4.13.0（MIT，WASM派生）、`@casl/ability` 7.1.3（MIT，通用授权）。已查npm元数据/仓库许可信息，**没有安装或新增依赖**：本轮不接受真实口令、不提供生产认证/通用授权，原生Web Crypto与小型模型足够。
- `src/grading/password.ts`在固定公开输入上执行真实PBKDF2-HMAC-SHA-256，600,000次、16字节演示Salt、256位输出；重新派生后比较结果字节。固定输入使其可复现，异步原生运算不修改输入状态；不依赖随机、时钟、网络或存储。UI等待实际运算结果，忽略卸载/重置后的过期异步结果，不用假结果回退。
- `src/grading/phishing.ts`是不可变情景/检查/核实/决策模型。补看证据不追溯改写已提交判断；域边界、实际请求和独立核实参与风险策略。不是固定紧急词过滤器，也不把检查次数当分数。
- `src/grading/leastPrivilege.ts`按当前用途计算最少授权，执行实际虚构功能并绑定授权/用途版本。全文件可让部分功能运行但不最小；改权限后旧成功无效。丢失真正清除样本与同区副本，恢复只复制存在的备份，并比较故障前内容，不能用后续改写掩盖过旧恢复。
- 类型分发只增加三个sim分支；旧ID、先修入口、Schema验证与存储版本沿用。只更新A18–A20在两份目录中的状态/实验说明，Foundation可访问32→35，B14/C1不变，全目录212不变。

## 系统与美术保护

对main的182个受保护既有文件逐字节比对通过：已有课程内容、旧模拟器/判分、进度、AI、应用导航、Academy组件、全局样式、LessonPlayer和lockfile保持原字节。其中`public/art/`67文件逐个SHA-256一致；A–F路线、Hero、Logo、Byte、徽章、其他课程图及居中修复均未覆盖、删除或替换。默认深色、旧亮色/大字号偏好和旧成绩/续学通过原浏览器回归。

新课不生成图标或插画，继续由原LessonPlayer显示“课程插画待提供”。没有修改其他路线、旧教学内容、旧判分或Academy UI。

## 验证结果

Default Environment，Linux，Node v24.22.1（项目要求>=22），使用现有lockfile/依赖。独立本地preview；未部署。

|命令 / 检查|结果|覆盖重点|
|---|---|---|
|`npm run typecheck`|通过|全部TypeScript|
|`npm run lint`|通过|源码与全部smoke脚本|
|`npm test`|通过，39文件599项|原574项保留；新增25项聚焦模型/内容测试，包括独立Node PBKDF2对照、错误/过期证据、权限边界和恢复版本|
|`npm run build`|通过|保留既有>500kB chunk提示，未为了消除提示重构UI|
|`npm run smoke`|通过|A01等基础课程、进度/徽章/清除二次确认、响应式旧入口|
|`npm run smoke:b`|通过|原B路线、编辑器、Git、Python失败重试等|
|`npm run smoke:ai`|关闭/启用mock两模式均通过|原AI关闭说明、导师/Prompt流程；启用版只用拦截假服务，不调用真实AI|
|`npm run smoke:academy`|通过|三宽度、深色默认、原图A–F、搜索/筛选/分页、主题/字号、导航、旧进度续学|
|`npm run smoke:foundation`|通过|原A06–A08实操与布局|
|`npm run smoke:network`|通过|原A11/A12/A14实操/状态及三宽度|
|`npm run smoke:web`|通过|原A15–A17完整链路、故障、续学及三宽度|
|`npm run smoke:security`|通过|390px三课开场到总结/真实首次成绩；1440/360px每项挑战；触屏/键盘、异步刷新、诊断/迁移错误、自由探索解锁、无溢出/下一步遮挡、全部20门真实开场|

六张[实际桌面/手机截图](../qa/security-foundation/README.md)，三课各一张1440px和390px；360px已实操检查，不重复保存截图。图片是成功检查第三任务后拍摄的实际证据区域，不是设计稿或注入成功状态。

[紧凑真实测试日志](../qa/security-foundation/VALIDATION.log)含实际输出与初次失败修复。完整工作日志留在工作区`/workspace/nico-security-evidence`；PR只存一份摘要日志和六张主截图，避免复制旧套件大量图片。

### 失败处理与测试维护

初次新增事件类型曾编译失败，显式类型修正后通过。新浏览器首次成绩预期错写3/4（实际故意错一题和迁移，应为2/4），请求守卫误计原Google Fonts，均修正测试预期，未改成绩或字体。复核发现钓鱼自由实验成功后被冻结，修正新组件并新增换场景回归；独立Salt要求也延续到最终挑战。

最新main的旧smoke存在滞后假设：裸`location`触发lint、首页等待已搬到路线页的课程/卡片、课程页等待路线阶段按钮、在“我的”找已移到“设置”的清除按钮，以及将30门分页当作全部课程。仅调整测试入口/就绪条件，先验证30门分页，再显示更多并检查35入口。原不可访问课程断言改测仍未开放的B16；A17下一课断言改为真实可访问A18。没有删除旧测试或为绿灯移除断言，没有回退用户最新UI。

## A路线最终检查与真实限制

完整表见[A01–A20审查](A_ROUTE_COMPLETENESS.md)。20/20已有可访问的学习与互动挑战流程，Schema/先修/下一课连通。Academy较大的A路线规划仍有A21/A22，保留next；不与本轮原始20门范围混淆。

- 没有真实学习者试学，不能把draft升级为pilot/published，也不能声称学习效果已验证。每课15分钟是现有Schema上限内的编排估计，未实测，初学者可能需要更久。
- 旧课缺项如实保留：A01–A05/A09/A10/A13没有sources，A01/A04只有2段讲解，A02没有独立free块，A10没有课头图。此次没有扩大范围修旧课；可访问完整性不等于全部达到本轮新课结构标准。
- A18不用真实密码、不破解。公开固定样本/Salt不可用于真实账户；演示库只存样本引用，MFA/恢复是明确状态模型，不实现加密保险库、WebAuthn/TOTP/恢复服务。PBKDF2是真实运算但不是生产认证栈；需要支持Web Crypto的安全上下文（HTTPS/localhost），不支持时如实报错、不假造结果。
- A19邮件/认证/通讯录均为虚构情景；不实际打开网站、发送资料或举报，不能自动识别现实中所有诈骗。只用保留.example域名。
- A20权限与更新/锁屏/备份均为内存教学模型，无实际设备权限或操作系统副作用；锁屏不冒充磁盘加密，笔记存储故障不冒充整机故障。
- 本轮测Linux Chromium及模拟触屏，未测实体手机、Safari/Firefox或真实AI。CISA与NIST SP800-53网页对自动抓取返回403，未宣称已抓取全文；保留官方引用，其他NIST/OWASP/FTC/RFC/W3C资料可追溯。

## 全部修改文件

下方清单以本PR对基线的最终差异生成，包含实现、必要测试适配、报告及六张截图；无其他路线实现或已有美术文件。

共42个文件（含六张PNG证据）：

### 课程与注册

- `src/content/catalog.ts`
- `src/content/curriculum.json`
- `src/content/index.ts`
- `src/content/lessons/a18-passwords.ts`
- `src/content/lessons/a19-phishing.ts`
- `src/content/lessons/a20-least-privilege.ts`
- `src/content/schema.ts`
- `src/content/track-a-security.ts`
- `src/features/lesson/blocks.tsx`

### 模型与实验

- `src/grading/leastPrivilege.ts`
- `src/grading/password.ts`
- `src/grading/phishing.ts`
- `src/sims/PasswordLab.tsx`
- `src/sims/PhishingLab.tsx`
- `src/sims/PrivilegeLab.tsx`
- `src/styles/security-labs.css`

### 测试与脚本

- `package.json`
- `scripts/smoke-academy.mjs`
- `scripts/smoke-foundation.mjs`
- `scripts/smoke-security.mjs`
- `scripts/smoke-web.mjs`
- `scripts/smoke.mjs`
- `tests/academy.test.ts`
- `tests/content.test.ts`
- `tests/leastPrivilege.test.ts`
- `tests/network-lessons.test.ts`
- `tests/password.test.ts`
- `tests/phishing.test.ts`
- `tests/security-lessons.test.ts`
- `tests/web-lessons.test.ts`

### 报告与证据

- `docs/STATUS.md`
- `docs/foundation/A18_A20_DESIGN.md`
- `docs/foundation/A18_A20_REPORT.md`
- `docs/foundation/A_ROUTE_COMPLETENESS.md`
- `docs/qa/security-foundation/README.md`
- `docs/qa/security-foundation/VALIDATION.log`
- `docs/qa/security-foundation/a18-passwords-1440.png`
- `docs/qa/security-foundation/a18-passwords-390.png`
- `docs/qa/security-foundation/a19-phishing-1440.png`
- `docs/qa/security-foundation/a19-phishing-390.png`
- `docs/qa/security-foundation/a20-least-privilege-1440.png`
- `docs/qa/security-foundation/a20-least-privilege-390.png`
