# Foundation C 浏览器验证

## 实际截图

截图来自 Chromium 渲染的生产构建。浏览器在 1440、390、360px 实测每门新课，以下保留四个单元的代表截图及结业挑战结果。

| 场景 | 1440px 桌面 | 390px 手机 |
| --- | --- | --- |
| C02 分词与上下文 | [桌面](c02-tokens-context-1440.png) | [手机](c02-tokens-context-390.png) |
| C07 JSON 结构化输出 | [桌面](c07-output-format-1440.png) | [手机](c07-output-format-390.png) |
| C11 检索增强生成 | [桌面](c11-rag-1440.png) | [手机](c11-rag-390.png) |
| C18 综合项目开场 | [桌面](c18-assistant-project-1440.png) | [手机](c18-assistant-project-390.png) |
| C18 四案例评估、导出及通过 | [桌面](c18-evaluation-1440.png) | [手机](c18-evaluation-390.png) |

## 检查结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过 |
| `npm test` | 47 个文件，666 项通过 |
| `npm run build` | 成功。Vite 报告了打包分块体积提示 |
| `npm run smoke` | 通过 |
| `npm run smoke:academy` | 157 项通过 |
| `npm run smoke:ai` | AI 关闭、模拟服务两种配置通过 |
| `npm run smoke:c` | 17 门新课 × 3 种尺寸，51 条流程通过 |

新课流程覆盖插图比例和横向溢出、自由实验、错误状态锁定与修正、诊断题反馈、迁移题和刷新保存。C18 确认浏览器下载的 CSV 有四条实际评估记录，并检查徽章在完成后解锁。C05 的原有流程由 `smoke:ai` 验证。20 个不同的课程参考链接在本次验证中可打开。

## 复测

执行 `npm run build` 后，在另一终端启动 `npm run preview`。如需截图，将 `SCREENSHOT_DIR` 设置为可写目录。Vite 预览端口变化时，可用 `BASE_URL` 指定实际地址。

浏览器覆盖为 Chromium。手机使用模拟视口和触控。AI 服务开启场景通过浏览器拦截测试请求，没有调用真实 AI 服务。新课为本地教学模拟，质量标为草稿，等待真实试学。
