# 04 技术架构

## 技术栈（推荐，尽量少依赖）
| 用途 | 选择 | 说明 |
| --- | --- | --- |
| 前端 | React 19 + TypeScript + Vite | 与既有经验一致，PWA 友好 |
| 路由 | React Router | 路由表见下 |
| 样式 | CSS 变量 + 少量原生 CSS | 不引入大型 UI 框架，令牌见 05 |
| 内容校验 | Zod | 课时/测评/项目数据格式校验 |
| 本机存储 | IndexedDB（idb） | 进度、笔记、作品；localStorage 只放小开关 |
| 代码编辑器 | CodeMirror 6 | 比 Monaco 轻，手机更友好 |
| 浏览器 Python | Pyodide（Web Worker） | 超时 + 可停止，不接受任意包安装 |
| JS 沙盒 | sandboxed iframe + postMessage | 禁止访问宿主页面 |
| 表格引擎 | HyperFormula（开源 GPLv3/需确认许可）或自研公式子集 | 先查许可证再定；私人阶段可用，公开前必须复核 |
| 图示 | SVG 自绘 + Mermaid（时序图） | 网络模拟自己写，更可控 |
| 2D 游戏教学 | Phaser | 开源，浏览器内可运行 |
| 测试 | Vitest + Playwright + axe-core | 单元 / 浏览器 / 无障碍 |
| PWA | vite-plugin-pwa | 离线缓存与安装 |

> 每引入一个主要依赖，在 `docs/DEPENDENCIES.md` 写明：为何需要、许可证、替代方案。

## AI 导师（Phase 3 起）
- 学习者**不填 API Key**。浏览器 → 你自己的轻量服务端代理（Vercel/Cloudflare 函数）→ 模型（如 Gemini，有免费额度）。
- Key 只放服务端环境变量；每用户/全局额度；超时与长度上限。
- 所有 AI 内容带"AI 生成"标记；服务失败时显示诚实的回退（预写提示/章节链接），**绝不把预写内容冒充实时回答**。
- 提示词注入防御：系统提示与用户内容分隔，课程资料作为引用而非指令。
- 可选：WebLLM/Ollama 本地小模型作为离线练习（说明质量较低）。

## 目录结构
```
bitlab/
  apps/web/src/
    app/            路由与外壳（导航、布局）
    features/       lesson-player, path-map, prompt-lab, sandbox, projects, progress
    components/     通用 UI（按钮、卡片、进度、标签）
    sims/           模拟组件：bits, logic-gates, cpu, subnet, dns, tcp, http, packets
    styles/         tokens.css, base.css
  content/
    tracks/         a-network/, b-code/, c-ai/, d-games/, e-google/
      a-network/units/a1/lessons/a01-binary.json   （或 .mdx + frontmatter）
    schema/         Zod 数据格式
  packages/
    progress/       进度与迁移（带版本号）
    grading/        客户端判分函数（纯函数，可测试）
  public/art/       美术资源（见 06）
  docs/             STATUS.md, DEPENDENCIES.md, QUALITY.md
```

## 课时数据格式（示意）
```ts
Lesson = {
  id: "a01-binary", track: "a", unit: "a1", title: "二进制：电脑只认 0 和 1",
  objectives: ["能把 0–255 的数转成二进制", "能解释一位（bit）是什么"],
  prerequisites: [], estimatedMinutes: 8,
  blocks: [
    { type: "hook", text: "…" },
    { type: "explain", title: "…", body: "…", media: "art/lessons/a01-bits.png" },
    { type: "sim", sim: "bit-switches", config: { bits: 8 }, label: "模拟" },
    { type: "quiz", items: [{ q: "…", options: [...], answer: 1,
        why: "…", wrongHints: { 0: "你可能把…", 2: "…" } }] },
    { type: "transfer", prompt: "…" },
    { type: "summary", points: ["…","…","…"], next: "a02-hex" }
  ],
  sources: [{ title: "…", url: "…" }],
  quality: { state: "draft" | "pilot" | "published", evidenceRef?: "…" }
}
```
内容与组件分离：改文字不改代码；Zod 在构建时校验，缺字段构建失败。

## 路由
`/` 首页 · `/paths` 路线总览 · `/paths/:track` 路线地图 · `/lesson/:id` 课时 · `/lab` 实验台 · `/lab/prompt` Prompt 训练场 · `/projects` 作品 · `/projects/:id` · `/me` 我的 · `*` 找不到页面（给出回首页与最近课时）

## 进度数据
IndexedDB store：`progress`（lessonId、完成时间、测评成绩、版本）、`notes`、`projects`、`review`。每个对象带 `schemaVersion`，升级时迁移并保留旧数据；损坏数据备份而不是删除。

## 安全与诚实规则
- 不在服务器执行学习者提交的任意代码。
- 网络与安全课程仅教原理与防御；模拟器不对真实主机发请求。
- 模拟标"模拟"，AI 标"AI 生成"，未验证标"草稿"。
- 仓库不含密钥；`.env.example` 只放变量名。

## 工作规则（给任何 AI 编程助手）
1. 先读 `01`–`05`；只做当前阶段；不顺手加功能。
2. 开始前写短计划；结束前运行 typecheck、lint、test、build，**逐条如实报告结果**，失败就写失败，不要写"应该没问题"。
3. 不自己给课程打"达标"分；质量状态只能依据真实试学证据修改。
4. 不新增大型依赖，除非在 `docs/DEPENDENCIES.md` 说明理由和许可证。
5. 保持 `docs/STATUS.md` 简短：做了什么、没做什么、已知问题、下一步（不超过一页）。
6. 小提交；不改无关文件；不删除用户数据逻辑。
7. 每个互动组件至少一个测试覆盖其核心判分/状态逻辑，并在手机尺寸实际打开检查。
