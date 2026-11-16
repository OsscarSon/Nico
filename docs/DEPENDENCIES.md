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

## AI 与提示词（Phase 3）新增
| 依赖 | 用途 | 许可证 | 为什么不自己写 / 替代方案 |
| --- | --- | --- | --- |
| marked | 把 AI 回复的 Markdown 解析成词法单元（只用 `Lexer`，不用它输出 HTML），再由 `src/ai/markdown.tsx` 映射成 React 元素 | MIT | 自己写 Markdown 解析（表格、嵌套列表、转义）容易出错。因为不使用 innerHTML，**不需要 DOMPurify**。替代：react-markdown（依赖链更长）、markdown-it（输出 HTML，需要再消毒）。 |

**AI 部分刻意没有引入**：Vercel AI SDK / @google/genai（服务端只有两种协议、几十行 fetch，少一个要在 Worker 和 Vercel 里验证的东西；需要流式或工具调用时再换，只改 `server/providers.ts`）、DOMPurify（见上）、Upstash 等外部限流存储（先用内存 / Cloudflare KV，接口 `QuotaStore` 留好）。`wrangler` 只是部署工具，用 `npx` 临时运行，不进 `package.json`。

## 评估过但没采用：prompt-optimizer（linshenkx/prompt-optimizer）
一个开源的“提示词优化器”，有网页、桌面端、Chrome 扩展和 Docker 部署，需要使用者自己配置模型密钥。**没有内嵌，也不建议内嵌**：
1. **许可证**：我查到至少有一个提交把 README 和 package.json 里的许可证从 MIT 改成了 **AGPL-3.0**，而部分第三方聚合页仍写 MIT。**以仓库里的 LICENSE 文件为准，用之前请自己再核对。** 如果是 AGPL-3.0，把它的代码并进 Nico 并公开部署，整个 Nico 就要按 AGPL 开源；改了它再给别人用网页，也要提供改后的源码。
2. **技术栈**：它是一个完整应用，不是可嵌入的组件；Nico 是 React + 自写路由，没法直接放进来。
3. **教学目标不同**：它是“替你把提示词改好”，Nico 的训练场是“让你看见缺了什么、自己改”。改写功能我们已有（AI 点评里的改写版本），但放在“先自己检查、再看 AI 怎么改”的顺序之后。
4. **密钥**：它要使用者自己填模型密钥；Nico 的原则是学习者不需要自己的 API Key。
可以做的：在文档里**链接**它，作为想进一步折腾的学习者的外部工具（独立部署、不修改，就不牵涉 Nico 的许可证）；或者只借鉴它的思路，**不复制它的代码和提示词模板**（模板文字同样受版权保护）。

## 字体
`index.html` 从 Google Fonts 加载 Noto Sans SC、Bricolage Grotesque、JetBrains Mono（均为 OFL 开源字体）。离线或加载失败时退回系统字体。

## 将来可能引入（Phase 3 起，引入前先复核许可证）
Pyodide、CodeMirror、HyperFormula（GPLv3 / 商业双许可，公开发布前必须复核）、Phaser。
