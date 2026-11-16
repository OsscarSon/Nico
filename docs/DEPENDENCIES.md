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

## 路线 B（Phase 4）新增
| 依赖 | 用途 | 许可证 | 为什么不自己写 / 替代方案 |
| --- | --- | --- | --- |
| codemirror、@codemirror/state、view、commands、lang-python、lang-html、lang-css、lang-javascript | 代码编辑器：语法高亮、缩进、撤销、手机输入、无障碍 | MIT | 自己写编辑器要处理输入法、选区、撤销、屏幕阅读器，工作量巨大。体积小、模块化、对手机友好。替代：Monaco（太大，手机体验差）。**懒加载**，不进首屏；加载失败自动退回普通文本框。 |
| acorn | 把学习者的 JavaScript 解析成语法树，在每个循环里插入「超时就停」的保护（iframe 里的死循环会卡死整个页面，无法像 Python 那样终止 Worker）；顺便给出带行号的语法错误 | MIT | 用正则改写循环不可靠（字符串、注释、没有花括号的循环）。替代：@babel/parser（更大）、esprima（已停止维护）。懒加载，第一次运行 JS 才下载（约 35 KB gzip）。 |
| Pyodide（**不是 npm 依赖**，运行时从 jsDelivr 加载，版本见 `src/runtime/config.ts`） | 浏览器里运行真正的 CPython | MPL-2.0 | 自己写 Python 解释器不现实。替代：Skulpt（不是真 CPython，库支持差）。约 10 MB，首次使用才下载，在 Web Worker 里运行，超时直接终止。Phase 8 做 PWA 时再改为自己托管以支持离线。 |

## 字体
`index.html` 从 Google Fonts 加载 Noto Sans SC、Bricolage Grotesque、JetBrains Mono（均为 OFL 开源字体）。离线或加载失败时退回系统字体。

## 将来可能引入（Phase 3 起，引入前先复核许可证）
Pyodide、CodeMirror、HyperFormula（GPLv3 / 商业双许可，公开发布前必须复核）、Phaser。
