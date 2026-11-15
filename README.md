# Nico

边学边做的电脑科技实验室。手机优先的网页应用，用于和朋友一起学电脑、网络、编程、AI、游戏开发和效率自动化。

当前进度：Phase 0 + Phase 1 完成，Phase 2 已开始：可学 **A01 二进制** 和 **A03 逻辑门**。详见 `docs/STATUS.md`。

## 运行

需要 Node.js 22 或更新（nodejs.org 下载 LTS 版）。

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm test           # 单元测试
npm run build      # 类型检查 + 构建
npm run preview    # 预览构建结果：http://localhost:4173
```

浏览器冒烟测试（把课程从头点到尾）需要**两个终端窗口**：

```bash
# 首次：安装测试用的浏览器
npx playwright install chromium

# 窗口 1：保持运行
npm run preview

# 窗口 2：Windows PowerShell
$env:BASE_URL = "http://localhost:4173"
npm run smoke
# macOS / Linux：BASE_URL=http://localhost:4173 npm run smoke
```

第一次 `npm install` 后，请把生成的 `package-lock.json` 一起提交到 Git。

> Windows 上用 pnpm 可能因为"创建符号链接被拒绝（os error 5）"安装失败，所以本项目统一用 npm。

## 结构

```
src/app/         外壳、导航、hash 路由
src/features/    lesson（课时播放器）、path（走线路线图）
src/sims/        互动模拟（位开关、逻辑门）
src/content/     课时数据 + Zod 校验 + 目录
src/grading/     判分纯函数（有单元测试）
src/progress/    进度存储（localStorage，带版本与损坏备份）
src/styles/      设计令牌与样式
docs/blueprint/  产品蓝图、阶段计划、课程计划、UI 规范、美术提示词
scripts/smoke.mjs  浏览器冒烟测试
```

## 加一节新课
1. 在 `src/content/lessons/` 新建文件，用 `lessonSchema.parse({...})`。不符合课时模板（开场 → 讲解 → 互动 → 检查题 → 迁移题 → 小结）会在加载时直接报错。
2. 在 `src/content/index.ts` 注册，并把 `src/content/catalog.ts` 里对应条目改为 `available`。
3. 新课默认 `quality.state: "draft"`。只有补齐来源并有真实试学记录，才能改为 `pilot` / `published`（Schema 会强制检查）。

## 美术
资源在 `public/art/`，接入状态和待补清单见 `public/art/README.md`。新图按 `docs/blueprint/06_ART_PROMPTS_FOR_GPT_IMAGE.md` 生成。

## 给 AI 编程助手
先读 `AGENTS.md`。
