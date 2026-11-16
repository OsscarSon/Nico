# P1 A06–A08 实施与验证

P0 已合并 PR #1（main `24472440c7b7f9ebf1bf19ca317fcb4ed43253a3`），且用户已视觉验收后才开始本轮。分支 `codex/nico-foundation-p1-a06-a08`；编码前提出课程设计与实施计划，内容见 [课程设计](P1_A06_A08_DESIGN.md)。

## 交付

| 课时 | 互动 | 实际完成条件 | 质量 |
| --- | --- | --- | --- |
| A06 `a06-memory` | 缓存、RAM、持久存储，打开/编辑/保存/读取/断电重启 | 保存修改、重启后恢复、缓存命中 | draft |
| A07 `a07-os` | 进程调度、工作推进、I/O、文件权限 | 浏览器等待、编辑器运行工作、笔记保存、只读拒绝 | draft |
| A08 `a08-command-line` | 纯内存虚拟终端与文件树 | 建目录、实际复制文件、进入并读取 | draft |

每课 9 个块：hook、explain×3、sim free、sim challenge、quiz（3题）、transfer、summary。新课不依赖服务器或网络运行；来源链接需联网。A05→A09 不再跳过 A06–A08。

Foundation：总目录 100 不变，live 23→26，next 37→34，planned 40 不变。A 可学 8→11，B14、C1、其他路线0，其他阶段不变。live 表示可访问，**不表示正式课程**。

## 修改范围与保护

- 新课内容：`src/content/lessons/a06-memory.ts`、`a07-os.ts`、`a08-command-line.ts`。
- 模型/判分：`src/grading/memory.ts`、`os.ts`、`terminal.ts`；单元测试 `tests/foundation.test.ts`。
- 互动界面：`src/sims/FoundationSims.tsx` 复用 Device/Feedback/按钮/检查清单；局部 `src/styles/foundation.css`。
- 接入：原课程注册/目录和 curriculum 仅更新三课；Schema 增加三种模拟及可选 `artPending` 字段；SimBlock 增加分支；课时播放器增加空插画位与来源链接。
- 测试：新增 `scripts/smoke-foundation.mjs` 与 npm 脚本；既有 smoke/测试只更新新增课程的数量、下一课和仍未开放课时的断言，不移除覆盖。
- 无新依赖；没有修改 Academy UI、主题、导航、PathMap、进度存储 schema/键、旧课时内容、旧模拟器及判分逻辑。
- 原 A–E 插画与 `public/art/` 56 个文件全部 SHA-256 一致。A06 只引用现有 `lesson-a06-memory-layers.png`；A07/A08 显示“课程插画待提供”，没有生图或替代图标。
- 三课均 draft；没有 evidenceRef、真实试学记录或六维质量自评分。技术测试日志不当作试学证据。

## 测试结果

Default Environment；Node 24.22.1（要求 >=22），真实 Vitest/CPython/Chromium 与生产构建预览。

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过 |
| `npm test` | 26 文件，419 项通过（新增45项） |
| `npm run build` | 通过，仍有 >500KB chunk 提示 |
| `npm run smoke:foundation` | 78 项通过 |
| `npm run smoke` | 187 项通过 |
| `npm run smoke:b` | 103 项通过，真实 Pyodide/CodeMirror，未使用替身 |
| `npm run smoke:ai` 默认模式 | 26 项通过 |
| `npm run smoke:ai` 启用假服务 | 38 项通过，未调用真实模型 |
| `npm run smoke:academy` | 145 项通过 |
| 原美术哈希、diff whitespace | 通过 |

合计 577 项浏览器检查，0 失败。

新模型覆盖：未打开的非法操作、未保存断电、缓存失效、状态快照不可变；单核独占、等待/唤醒/结束转移、权限拒绝不改文件；路径规范化、引号、非法命令、禁止覆盖、创建范围、输入/文件数上限、等价解法与真实阅读要求。迁移答案用容量算式、真实调度状态及路径解析独立重算。

新课浏览器覆盖：三课逐块学完；挑战初始不可继续、空操作无法通过、正确操作通过；检查题逐项诊断；迁移题无效/错误/正确；真实首次成绩 2/4；旧 A01 成绩和 schema 不变；刷新回到原挑战且需重新完成；小结/来源/下一课；1440/390/360px、暗色/亮色、无横向溢出。没有实体手机试学。

[实际截图与日志](../qa/foundation/README.md)。

## 复现

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
# 另一个终端
npm run smoke:foundation
npm run smoke
npm run smoke:b
npm run smoke:ai
npm run smoke:academy
```

可设置 BASE_URL；SCREENSHOT_DIR 指定新课截图目录。Cloud 浏览器需代理时，`BROWSER_PROXY="$HTTPS_PROXY" npm run smoke:b`，不关闭 TLS 校验。AI 启用回归沿用 P0 的独立构建与假服务流程（见 [P0 报告](../academy/P0_REPORT.md)）。

来源已核对 OSTEP 原文章节（内存、持久存储）、GNU Coreutils 的 man7 手册与 POSIX cd 规范；小结可直接访问这些公开资料。

## 限制与下一步

模型简化明确写在课内：缓存只有一项且写入失效；保存假定立即落盘；调度无线程、优先级或开销；虚拟终端仅支持列出的命令且不模拟完整 POSIX 行为。模拟状态属于当前步骤，刷新挑战需重新做，不改变已有进度设计。

缺 A07/A08 正式插画；未做真实学习者试学或真实 AI 服务验证，未测 Safari/Firefox/实体手机。下一步是审阅 PR、邀请真实学习者完成三课并记录卡点；在此之前不提升质量等级。
