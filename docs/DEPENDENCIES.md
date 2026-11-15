# 依赖说明

| 依赖 | 用途 | 许可证 | 备注 |
| --- | --- | --- | --- |
| react / react-dom | 界面 | MIT | |
| zod | 课时数据校验（构建/加载时） | MIT | 使用 v4 API |
| vite / @vitejs/plugin-react | 开发与构建 | MIT | |
| typescript、eslint、typescript-eslint | 类型与代码检查 | Apache-2.0 / MIT | |
| vitest | 单元测试 | MIT | |
| playwright（仅开发） | 浏览器冒烟测试 | Apache-2.0 | 首次需安装 chromium |

**刻意没有引入**：路由库（用自写的 hash 路由，约 50 行）、UI 框架、状态库（用 useSyncExternalStore）、图标库（内联 SVG）。

## 字体
`index.html` 从 Google Fonts 加载 Noto Sans SC、Bricolage Grotesque、JetBrains Mono（均为 OFL 开源字体）。离线或加载失败时退回系统字体。

## 将来可能引入（Phase 3 起，引入前先复核许可证）
Pyodide、CodeMirror、HyperFormula（GPLv3 / 商业双许可，公开发布前必须复核）、Phaser。
