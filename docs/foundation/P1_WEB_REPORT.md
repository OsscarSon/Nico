# Foundation P1 第三轮实施与验收报告

2026-11-17（Asia/Kuala_Lumpur）。基于最新main `bc5abd7`（插画审查PR #5已合并），独立分支`codex/nico-foundation-p1-a15-a17`。先阅读AGENTS、blueprint、STATUS及A09–A14课程/模拟器/判分，先提交设计再编码。[完整教学与技术设计](P1_WEB_DESIGN.md)。不直接修改main，不自动合并或部署。

## 交付课程

| 课程 | 可自由操作的实验 | 必须由真实状态完成的挑战 |
| --- | --- | --- |
| A15 `a15-udp` | 三个位置快照、独立UDP发送/任意投递/丢失/延迟、逻辑时钟、原始到达与应用归档/画面、新鲜度策略及显式应用重发；同位置文本的A14 TCP对照 | 乱序且丢失使画面倒退；应用实际拒绝旧编号与过期数据并保留最新位置；TCP实际丢数据或ACK、到期重传、完整有序交付并确认 |
| A16 `a16-http-https` | GET/HEAD/POST/DELETE、路径、Headers和JSON体；提交快照、服务器处理、接收响应分步；真实虚构记录创建和ETag；独立TLS身份/完整性/Finished状态与观察者视角 | 实际404后修正路径获得200；415后修正媒体类型/JSON创建记录并获得201；拒绝错误身份后重建正确TLS并实际接收受保护响应 |
| A17 `a17-web-journey` | URL输入与规范化、A13 DNS查询及本课答案TTL、已知虚构服务地址匹配、A14 TCP双端与报文操作、本课TLS/HTTP模型、从实际响应显示固定HTML文本 | 有效期内旧DNS答案指向错误服务地址，先失败再清除/等到期重新解析；任一握手报文丢失与到期恢复；接收并显示404后修正网址路径重新显示200页面 |

每课含生活情景Hook、四段逐步讲解、自由实验、多任务挑战、三道逐项错误诊断题、一道独立数值迁移题、三点总结、先修关系、下一课与权威来源。不是只注册标题或静态文章。

三课均 `quality: { state: "draft" }`，没有试学记录、evidenceRef或自评达标分数。`artPending:true` 使用原有正式占位组件，没有生成图标、插画或借用旧锁图冒充HTTPS教学。EstimatedMinutes为现有Schema范围内的初步估计，尚未经过真实试学校准。

## A17为什么是综合模型

- DNS实际调用旧`resolve`，按查询/指引逐条处理；本课只在外围对答案加TTL，到期/清除/命中影响实际外部查询数，缓存命中不延长TTL。查询结束前没有可用于连接的地址。
- TCP直接调用旧A14状态机。SYN投递到错误虚构地址没有本站回应；最后ACK丢失时两端状态确实不同，服务器必须等到期重传。没有以阶段计数或按钮次数代替连接状态。
- HTTPS只有在双方TCP建立后才能开始TLS；错误域名、信任、有效期或握手证明都不能建立安全会话。`https`字符串或图标不能绕过核验。
- HTTP按实际方法/路径/Headers/请求体生成响应；提交后改输入不会改变已发快照。服务器已生成响应不等于浏览器已收到；收到响应也不等于页面已显示。
- 页面预览读取本次实际响应体，并绑定当前导航attempt。旧导航页面、无正文HEAD/304、错误地址或未完成阶段都不能当作成功证据；HTTP挑战还必须实际显示过404错误页。
- 任务允许有效的不同恢复路径：DNS清答案或等TTL、三个不同握手丢包点、正确路径带查询参数等；判分检查真实结果与故障证据，不要求唯一点击脚本。

## 目录与兼容

Foundation可访问 **29→32 /100**，A路线14→17（Foundation A规划总量22），B14/C1不变，其他阶段与全目录212不变。旧PathMap原有20项中17可访问/3规划，仍按旧结构展示。`live/可访问`不等于课程质量正式发布。

沿用预留ID与A14→A15→A16→A17→筹备中A18的关系，没有改旧课文件。原有摘要自动识别新下一课，无需改写A14。现有“数据包领航员”需要A09–A17，课程全部开放后自然变为可获得；只有全部完成记录存在才获章，**徽章/进度逻辑没有修改**，并增加不完整记录不能获得的回归。

Schema只加三种sim枚举，运行器只增加组件分发；新局部样式仅作用于新课。package.json仅新增`smoke:web`命令，无依赖或lockfile变更。所有旧课程、旧grading、进度、AI、主题样式及LessonPlayer源码逐字对比main一致。

## 权威来源与技术边界

已从rfc-editor.org阅读相关原文核对，课程页可追溯：RFC768（UDP格式/交付）、RFC8085（UDP可靠性/拥塞应对）、RFC9000（QUIC经UDP承载可靠流）、RFC9293（TCP）、RFC9110/9112（HTTP语义与HTTP/1.1）、RFC8446（TLS1.3）、RFC1034/1035（DNS缓存与TTL）。未复制整篇RFC到仓库。

| 模型 | 明确省略/限定 |
| --- | --- |
| UDP | 应用编号/时间戳/截止期是应用字段；控制台替代应用反馈/超时来重发。无真实网络/校验和/拥塞控制；完整位置快照策略不泛化为所有视频帧或差量更新。 |
| TCP对照 | 复用A14固定ISN、ASCII、停等和手动逻辑时钟，无窗口/拥塞控制/真实RTO；不能用点击次数比较真实性能。 |
| HTTP | 虚构HTTP/1.1站点与有限方法/资源，固定表示格式、精确ETag匹配、有限字段和请求大小；不实现完整HTTP缓存、协商、序列化或真实套接字。HEAD与304不编造正文，Host支持相应默认端口。 |
| TLS | 安全状态模型，不实现密码学/真实证书链/密钥交换运算。服务器flight合并；先核验身份和握手证明，再Finished；不产生伪造密文。省略恢复、0-RTT、客户端认证等，不将此串行演示泛化为全部TLS1.3流量时序。 |
| A17 | HTTP数据阶段按完整消息交换抽象，丢包操作集中在真实TCP握手；数据重传在A14/A15实操。只模拟答案TTL，区指引缓存沿用旧模型。预览固定HTML文本、不执行JS，不是完整浏览器，也不涵盖HTTP/3/QUIC/CDN/并行资源加载。 |

这些简化都在学生可见的正文/模拟器说明中标明。没有把UDP说成“不能构建可靠应用”，没有把HTTPS简化成锁图标，也没有冒充完整协议栈。

## 实测与测试结果

环境Node.js24.22.1（项目要求>=22），既有依赖，生产build，Chromium；日志保留环境UTC时间。AI启用版在独立outDir/4187，以已有假服务测试，不覆盖默认4186构建。

| 命令/检查 | 结果 | 日志 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | [日志](../qa/web-foundation/logs/typecheck.log) |
| `npm run lint` | 通过 | [日志](../qa/web-foundation/logs/lint.log) |
| `npm test` | 35文件、574项全部通过 | [日志](../qa/web-foundation/logs/tests.log) |
| `npm run build` | 通过，既有大chunk/Zod注释提示保留 | [日志](../qa/web-foundation/logs/build.log) |
| `npm run smoke` | 187项通过 | [日志](../qa/web-foundation/logs/smoke-a.log) |
| `npm run smoke:b` | 103项通过，真实Pyodide | [日志](../qa/web-foundation/logs/smoke-b.log) |
| `npm run smoke:ai` | 关闭26 / 假服务启用38项通过 | [关闭](../qa/web-foundation/logs/smoke-ai.log) / [启用](../qa/web-foundation/logs/smoke-ai-enabled.log) |
| `npm run smoke:academy` | 145项通过 | [日志](../qa/web-foundation/logs/smoke-academy.log) |
| `npm run smoke:foundation` | 78项通过 | [日志](../qa/web-foundation/logs/smoke-foundation.log) |
| `npm run smoke:network` | 331项通过 | [日志](../qa/web-foundation/logs/smoke-network.log) |
| `npm run smoke:web` | 346项通过 | [日志](../qa/web-foundation/logs/smoke-web.log) |
| Batch02既有专项 | 110项通过 | [日志](../qa/web-foundation/logs/art-batch02.log) |
| 全站Art Layout既有专项 | 720项通过，32课/28图 | [日志](../qa/web-foundation/logs/art-audit.log) |
| 原四张无损修复像素验证 | 4张全部通过 | [日志](../qa/web-foundation/logs/art-pixels.log) |

单元新增95项：UDP16、TLS13、HTTP29、Journey31、课程结构/迁移/注册5、既有徽章新可用状态1。测试正常流程、跳过/错误操作、丢失/延迟、截止期/TTL边界、三个握手丢包点、未知/不完整域名、证书错误与握手证明、请求快照、POST副作用、Host/JSON/方法/ETag/HEAD、前后导航隔离、真实渲染证据、不可变状态及容量边界。

修改后浏览器合计 **2084项通过**（旧回归908＋新课346＋Batch02 110＋全站插画720），另4张原图派生像素验证通过。新课在390px从Hook走完整课并刷新续学，在1440/360及暗亮两主题完成全部九任务；另有真实触摸与Tab/Enter、焦点/底栏检查。没有强制点击隐藏控件，没有注入React模型状态。

首次选择题故意答错一道、迁移题先非法输入再错答后改正，实际保存**2/4首次成绩**；旧A01完成记录和schemaVersion1保持不变。刷新回到挑战步骤6，当前实验需重做，沿用旧课程行为，不伪造已完成的模型状态。

### 初次失败与解决经过

- 新增UDP参数化测试把数组当参数行展开，空数组成为undefined并触发默认值，造成1项失败和类型错误；改为对象承载数组，保留全部无效输入用例后通过。[初次模型日志](../qa/web-foundation/logs/model-tests-initial.log)
- Lint最初有两处控制字符正则规则错误，改成显式字符码检查，未关闭ESLint规则。[日志](../qa/web-foundation/logs/lint-initial.log)
- 旧徽章测试原以packet-pilot为“尚未开放”实例；新课开放后此前提已变。改用仍未开放的agent-builder保留负向断言，并新增packet-pilot需全部真实记录的正/负验证；没有改进度算法或删除测试。[初次单测日志](../qa/web-foundation/logs/tests-initial.log)
- 新浏览器测试两次选择器超时：原生label文本包含子选项而不满足exact标签匹配；随后对折叠阶段的禁用按钮使用默认可见角色查询。改为实际无障碍角色/名称，并在状态断言中包含隐藏控件；真实click/tap仍要求可见，无force。保留全部断言后完整346项通过。[第一次](../qa/web-foundation/logs/smoke-web-initial.log) / [第二次](../qa/web-foundation/logs/smoke-web-attempt2.log)
- 复核中补强A17已显示404的证据、完整域名/服务地址边界、合法Host默认端口，以及UDP重置输入一致性，均有相应测试。最终无测试失败，没有删旧断言制造全绿。

旧脚本仅调整因课程开放必然变化的数量、A14下一课入口、A18筹备目标及徽章可用数；旧互动/判分/进度断言全部保留。

## 实际截图、保护与未完成事项

[三课桌面1440、手机390/360、完整长图、实际故障/成功页面与正式插画占位](../qa/web-foundation/README.md)，共45张图片。进行中截图额外记录UDP新鲜快照、POST真实201和A17最后ACK丢失后的不对称连接状态。

**65个原资源文件全部SHA-256不变**，含原路线/Logo/Hero/Byte/徽章、Batch02五张和此前四张居中副本。旧课程/旧grading/进度/AI/旧样式/播放器共137个受保护源码与资源文件逐字对比main无变化。[保护记录](../qa/web-foundation/protection.json) · [插画实测记录](../qa/web-foundation/art-layout-audit.json)

未完成/限制：没有真实学习者试学，三课仍draft，不能宣称教学质量已通过真实验收；正式插画待后续统一绘制。上述协议抽象均非生产栈；没有真实网络/密码学/完整浏览器。未验证实体手机、Safari/Firefox或真实AI模型；此前A05/A09/B14美术复核项原样保留，不在本轮改画。没有部署或合并。

下一步是审阅独立PR、安排真实学习者逐课试学并记录卡点；按既有Schema和证据规则迭代质量状态。

[完整修改文件清单](P1_WEB_CHANGED_FILES.txt)
