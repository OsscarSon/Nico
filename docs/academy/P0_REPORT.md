# Nico Academy P0 验收记录

执行环境：用户指定的 Default Environment。基线 `8e1693387049f19559f27d8352a3872ebf9e7c01`，独立分支 `codex/nico-academy-p0`。本次不合并 main，不部署。

## 需求与数据

已阅读仓库 AGENTS、blueprint 01–05、原架构、PathMap、进度与素材，并阅读上传包全部七个文件。最终实施指令优先于旧 UI 规范中的系统主题/亮色默认说明。未嵌入预览 HTML，未重写学习引擎。

`src/content/curriculum.json` 是上传目录的原始副本；`academy.ts` 使用现有 Zod 校验并计算统计。旧阶段计划中的 90 门基础、36 门中阶及 46 门进阶等数字已过时。

| 阶段 | 目录 | 状态分布 | 路线 |
| --- | ---: | --- | --- |
| Foundation | 100 | live 23 / next 37 / planned 40 | A B C D E F |
| Intermediate | 46 | next 3 / planned 43 | A B C D E F M |
| Advanced | 66 | flagship 16 / reading 50 | A B C D E F M |

无新课时。只有目录 live、旧目录 available、真实内容存在时才展示学习链接。规划条目可展开单元、先修建议、项目方向与批次；先修不硬锁，资料路径无资源时明确说明尚未发布。

## 修改范围

| 文件/目录 | 改动 |
| --- | --- |
| `src/content/academy.ts`、`curriculum.json` | 三阶段数据、真实统计、旧编号映射、搜索筛选 |
| `src/features/academy/AcademyCatalog.tsx` | 阶段选择、原版插画路线卡、课程目录与规划详情 |
| `src/pages/pages.tsx`、`src/app/` | Hero、复用继续学习、课程路由、桌面/手机导航，保留旧入口 |
| `src/components/ThemeToggle.tsx`、`src/progress/theme.ts`、`index.html` | 首帧默认暗色、明确主题偏好与切换持久化 |
| `src/styles/`、`src/main.tsx` | 科技风主题、响应式、代码/错误文本对比度与尺寸 |
| `public/workers/python-worker.js`、`src/runtime/python.ts` | Pyodide 官方 ESM/module Worker 兼容修复 |
| `tests/academy.test.ts`、`scripts/smoke-academy.mjs` | 数据、原图哈希、旧 ID、主题、145 项浏览器验收 |
| `eslint.config.js`、既有 smoke/测试夹具、PromptLab | 修复原 lint 问题、过时断言与编辑器加载测试时序；不改变判分 |
| `package-lock.json`、`.gitignore`、PR workflow、`tsconfig.json` | 固化已声明依赖、排除构建/本地文件、Node22 PR 检查、JSON 导入 |
| `docs/` | 本报告、实际截图、日志、简短 STATUS 及旧记录归档 |

完整逐文件清单见 [CHANGED_FILES.txt](CHANGED_FILES.txt)。没有新增 npm 依赖。

## 原插画保护

全部 `public/art/` 56 个文件的 SHA-256 与基线一致，未修改、删除、覆盖或重新生成任何插画。路线图案不裁剪、不滤色；只增加浅色承载底板以确保暗色界面可读。

| 路线 | 原文件 | 原使用位置 | 新使用位置 |
| --- | --- | --- | --- |
| A | `public/art/track-a-network.png` | TrackCard、TrackPage | Academy 路线按钮、原 TrackPage |
| B | `public/art/track-b-code.png` | 同上 | 同上 |
| C | `public/art/track-c-ai.png` | 同上 | 同上 |
| D | `public/art/track-d-games.png` | 同上 | 同上 |
| E | `public/art/track-e-google.png` | 同上 | 同上 |

F/M 无素材，使用写明“插画待提供”的空位与代码 TODO，无 emoji、Lucide 或 CSS 替代图。新 Hero Byte 未提供，复用现有 `hero-home-1600x900.png`，原图无改动。

## 兼容性与真实功能

- 展示编号独立于内部 ID：A01 → `a01-binary`，B01 → `b01-variables`，C05 → `c05-prompt-structure`。测试保证全部 23 个入口与旧课时一一对应。
- `PathMap.tsx`、原课时内容、判分、`progress/store.ts` 与 `useProgress.ts` 均无改动。`nico-progress` 与 `schemaVersion:1` 保持原样，无迁移或清除。
- 使用旧完成记录和 B01 第 2 步续学数据实测：首页显示真实数量、浏览目录/切换主题不写进度、继续学习回到原步骤、第一次成绩不变。
- Python 原配置 Pyodide 314.0.8 拒绝 classic Worker。现以 `pyodide.mjs` 和 module Worker 加载，版本、Worker 消息、停止、超时和判分不变。以真实 CDN 下载验证，未使用 PYODIDE_STUB。
- 手机“我的”保留实验台、Prompt 训练场及作品入口，既有所有 hash 路由继续有效。

## 测试结果

Node **24.22.1**，npm **11.9.0**；符合 `engines.node >=22`。PR CI 另外固定 Node 22。

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过（修复基线的 56 项 lint 错误） |
| `npm test` | 25 个文件、374 项通过；真实 Vitest / CPython |
| `npm run build` | 通过；保留 >500KB chunk 体积提示 |
| `npm run smoke` | 187 项通过，A01–A05 完整流程、真实持久化、原路线图 |
| `npm run smoke:b` | 103 项通过；真实 Pyodide/CodeMirror、Python、HTML/CSS、JS、Git、死循环停止与失败回退 |
| `npm run smoke:ai`（默认构建） | 26 项通过，AI 未配置模式、C05 完整流程 |
| `npm run smoke:ai`（启用测试构建） | 38 项通过，原脚本假服务：回复、限额、错误、恶意内容渲染 |
| `npm run smoke:academy` | 145 项通过：1440/390/360px、默认暗色/主动亮色、搜索筛选、原图、键盘、底栏、旧进度及两套主题下网络互动 |
| 原图 SHA-256 / `git diff --check` | 通过 |

浏览器共 **499 项检查通过，0 失败**。使用真实生产构建预览，已查看输出截图；未进行实体手机测试。

[修改前后实际截图和原始日志](../qa/academy/README.md)。

复现：

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
# 另一个终端
npm run smoke
npm run smoke:b
npm run smoke:ai
npm run smoke:academy
```

Cloud 网络要求浏览器显式走环境代理时：`BROWSER_PROXY="$HTTPS_PROXY" npm run smoke:b`。不关闭 TLS 验证。

AI 启用测试使用独立目录和端口：`VITE_AI_ENDPOINT=http://localhost:8787/ai npm run build -- --outDir /tmp/nico-ai-test-dist`，然后用 `npm run preview -- --port 4174 --outDir /tmp/nico-ai-test-dist` 启动；运行 `BASE_URL=http://localhost:4174 AI_ENDPOINT=http://localhost:8787/ai npm run smoke:ai`。该模式由原脚本拦截请求并返回假服务数据，没有连接真实模型。

## 尚待提供 / 验证边界

- F/M 与新 Hero Byte 正式素材；不阻塞 P0 结构，继续保留明确空位/原图。
- 未新增课程，未更改草稿质量等级，无真实学习者试学。
- 未连接真实 AI 模型；既有 API 协议与错误行为通过单元测试和假服务验证。
- 未测试 Safari、Firefox、实体手机；移动验证为真实 Chromium 的手机视口。
- 首次 Python 需联网；build 的 chunk 体积提示仍存在。原教学限制见历史状态记录。

请在 PR 中人工浏览桌面与手机效果，确认后再决定是否合并。
