# 路线 B（编程与网站）状态

范围：蓝图 Phase 4 的第一段。只新增文件；共用文件的改动见下表，方便合并时对照。

## 已做
- **代码运行器**：Python 在 Web Worker 里用 Pyodide（真 CPython）运行；超时 5 秒或点"停止"直接终止 Worker（死循环也停得下来）；全站共用一个运行器，Pyodide 只下载一次。`input()` 由每个检查项提供输入。下载失败如实提示"没能加载"，可重试。
- **代码编辑器**：CodeMirror 6，懒加载；加载失败自动退回普通文本框。有"缩进"按钮（手机没有 Tab 键）。
- **HTML 预览 / 判分**：判分时把学习者的 HTML 放进看不见的 iframe（`sandbox="allow-same-origin"`，无脚本、CSP 禁联网），能读浏览器真正算出的样式（B09、B10 用它）。
- **HTML 预览**：`sandbox=""` 的 iframe + 内容安全策略（禁脚本、禁联网），用 DOMParser 判结构。
- **判分**（纯函数，有测试）：`src/grading/code.ts`、`web.ts`。每个检查项是一次独立运行，可测边界值；输出对了才检查源码写法（防写死答案）；错误信息解析成"第 N 行 + 中文提示"。
- **课时**（全部 `draft`，无来源之外的试学记录）：B01 变量、B02 条件、B03 循环、B04 函数、B05 列表、B06 字典、B07 调试、B08 HTML、B09 CSS、B10 CSS 布局、B11 JavaScript 与 DOM、B12 事件、B14 Git 第一步、B15 分支与合并（B01–B12、B15 课头图已接入；B14 还没有图，提示词在 ART_PROMPTS.md 第 13 条）；目录里有路线 B 全部 20 课的规划。
- 互动标签：Python 标"真实 Python"，HTML 标"实时预览"，不标"模拟"。

## 验证情况（诚实版）
**在我的沙盒里验证过：**
- 合并到含 A05 的新版后：149 个单元测试通过；`smoke.mjs`（A01–A05）和 `smoke-b.mjs` 都通过。最新为 169 个（含 B04–B07 每个挑战用真实 CPython 验证）。以下细节写于更早的版本（用自制的简易 vitest 替身，**不是真 vitest**）。其中：每个 Python 挑战的参考答案都用**真实 CPython 3** 跑过并通过；起始代码不会直接通过；写死答案的"作弊"代码会被拦；故意改错一个答案，测试会报错。测试里也用 Python 独立重算了选择题和迁移题的答案。运行器用假 Worker 测了握手、超时、停止、加载失败重试。
- 浏览器冒烟（`scripts/smoke-b.mjs`，Chromium 390px，esbuild 打包版）全部通过：B01/B02/B03/B08 从头到尾、死循环被停止、没网提示、HTML 预览里的脚本不执行、无横向溢出、无 JS 报错。
- 纯 TS 部分（content / grading / runtime）严格类型检查通过。

**没有验证（需要你的电脑 / GitHub）：**
1. **真 Pyodide 从没跑过。** 沙盒不能联网，冒烟里用了一个"假 Pyodide"（把代码转给本机真实 CPython）来测 Worker 协议和界面。`public/workers/python-worker.js` 里对 Pyodide 的调用（`loadPyodide`、`setStdout({batched})`、`globals.get("dict")()`、`runPythonAsync(code, {globals})`）是按官方文档写的，**没跑过真货**。版本号 `314.0.8` 是我从 jsDelivr 页面查到的，没在浏览器里加载过。
2. **CodeMirror 从没跑过。** 没装，沙盒里只测了"加载失败 → 退回文本框"那条路。`src/sims/code/cm.ts` 按官方 API 写，没编译过。
3. `npm install`（新增 8 个 CodeMirror 包，`package-lock.json` 需要重新生成）、`npm run typecheck`、`lint`、真 `npm test`、`npm run build` 都没跑。React 相关的 `.tsx` 只用 esbuild 打包过，没经过真 `tsc`。
4. 没在 Safari / Firefox / 真机上看过；没有真实学习者试学。

**请按这个顺序验证：** `npm install` → `npm test` → `npm run build` → `npm run preview`（另开终端）→ `BASE_URL=http://localhost:4173 npm run smoke:b`（会用真 Pyodide 和真 CodeMirror，需联网；`smoke.mjs` 是别人的，也建议一起跑）。哪一步失败把报错贴给我。

## 对共用文件的改动（合并时对照）
| 文件 | 改动 |
| --- | --- |
| `src/content/schema.ts` | `sim` 枚举加 `python`、`web`；sim 块加可选 `code`；新增 `codeSpecSchema` 等；挑战必须提供 checks/webChecks + 参考答案 |
| `src/content/catalog.ts` | 路线 B 改为 `building`，目录取自 `track-b-catalog.ts` |
| `src/content/index.ts` | 注册 B 课时；`nextAvailableAfter` 改为只在**同一路线**内找下一课（否则 A04 之后会跳进 B01，`content.test.ts` 里"A04 后没有下一课"的断言也会失败） |
| `src/features/lesson/blocks.tsx` | `SimBlock` 增加 python / web 分支和标签 |
| `src/components/ui.tsx` | `RichText` 支持 `` `行内代码` `` |
| `scripts/smoke.mjs` | 只改了一条断言：A 路线学完后首页现在推荐 B01，不再说"可学的课都学完了"（那条是路线 B 上线前写的） |
| `package.json`、`docs/DEPENDENCIES.md`、`docs/STATUS.md` | 依赖、脚本 `smoke:b`、一行指向本文件 |

## 已知问题 / 取舍
- Pyodide 约 10 MB，首次要等；离线用不了 Python 课（Phase 8 做 PWA 时自己托管）。
- CodeMirror 里 Tab 键用于缩进，键盘用户可能被"困住"，需要之后做无障碍复核。
- HTML 预览现在禁止脚本。以后 JS/DOM 课需要放开时，必须另做带超时的隔离方案，不能直接加 `allow-scripts`。
- 学习者代码在自己的浏览器里运行，没有服务器参与。Worker 里理论上能联网，这里没做限制。

## 下一步
JS/DOM 课（b11–b13）需要新的隔离运行方案（Worker 或带超时的 iframe）。

## B11 / B12（真实 JavaScript）
- 运行方式：`sandbox="allow-scripts"` 的 iframe（无 allow-same-origin，CSP 禁联网），console 被接管并以固定格式输出；用 acorn 在每个循环里插入「超时就停」的保护。
- 已验证：循环保护逻辑（32 个测试，在 Node vm 里跑真实 shim）；B11 的 sumTo 在 Node 里验证参考答案通过、起始代码不通过；B11 DOM 挑战和 B12 在 Chromium（390px，Playwright）里点到底：起始代码不通过、写错被指出、正确答案通过；死循环被停止且页面仍可操作。
- **未验证**：Safari / Firefox；acorn 的真实 npm 包（沙盒里用的是预装版本）；`package-lock.json` 需要你运行 `npm install` 更新。
- B13（fetch 与 JSON）暂缓：沙盒禁止联网，需要先定「假 fetch」还是纯概念课。

## B14 / B15（Git，模拟）
- Git 互动是**简化的模拟**（`src/grading/git.ts`，纯函数）：支持 init、add、commit -m、status、log、branch、switch / checkout、merge；另有模拟专用的 `edit`、`new`、`ls`。界面标「模拟」。
- 简化处：切换分支和合并前要求没有未提交的修改；不处理合并冲突（提示后保持原状）；没有远程（push / pull）。
- 已验证：模拟器 19 个测试；B14、B15 挑战的参考答案能达成全部目标、起始状态不通过、删掉参考答案任何一步都不通过；Chromium 390px 点到底。
- B16（GitHub）还没做：需要决定怎么在不联网的教学里讲 push / pull / Pages。
