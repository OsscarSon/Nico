# Foundation E 路线验证

| 课时 | 1440px | 390px |
| --- | --- | --- |
| E01 存储类型与 SUM | [桌面](e01-formula-basics-1440.png) | [手机](e01-formula-basics-390.png) |
| E02 复制引用 | [桌面](e02-cell-references-1440.png) | [手机](e02-cell-references-390.png) |
| E03 IF 与条件求和 | [桌面](e03-conditional-formulas-1440.png) | [手机](e03-conditional-formulas-390.png) |
| E04 精确查找 | [桌面](e04-lookup-1440.png) | [手机](e04-lookup-390.png) |
| E05 日期与文本 | [桌面](e05-dates-text-1440.png) | [手机](e05-dates-text-390.png) |
| E06 异常去重 | [桌面](e06-data-cleaning-1440.png) | [手机](e06-data-cleaning-390.png) |
| E07 透视汇总 | [桌面](e07-pivot-1440.png) | [手机](e07-pivot-390.png) |
| E08 类别与时间图表 | [桌面](e08-charts-1440.png) | [手机](e08-charts-390.png) |
| E09 Apps Script 批处理 | [桌面](e09-apps-script-1440.png) | [手机](e09-apps-script-390.png) |
| E10 定时与去重 | [桌面](e10-triggers-1440.png) | [手机](e10-triggers-390.png) |
| E11 版本化审批 | [桌面](e11-workflow-1440.png) | [手机](e11-workflow-390.png) |
| E12 离线 Gemini 请求 | [桌面](e12-gemini-api-1440.png) | [手机](e12-gemini-api-390.png) |
| E13 Notebook 重启 | [桌面](e13-colab-1440.png) | [手机](e13-colab-390.png) |
| E14 看板筛选 | [桌面](e14-looker-studio-1440.png) | [手机](e14-looker-studio-390.png) |
| E15 装载重放 | [桌面](e15-data-pipeline-1440.png) | [手机](e15-data-pipeline-390.png) |
| E16 对账与报表导出 | [桌面](e16-report-project-1440.png) | [手机](e16-report-project-390.png) |

[E16 报表验收截图](e16-report-result-390.png)来自实际浏览器操作。测试下载 CSV 并确认科学 21、艺术 5、社区 8、合计 34；另一组样例增加一条金额 3 的记录，系统重算为 37。

## 检查结果

- `npm run typecheck`、`npm run lint`、`npm test`（47 个文件，665 项）、`npm run build` 通过。Vite 保留分块体积提示。
- `npm run smoke:e` 在 1440、390、360px 运行 16 门课，共 48 条完整流程。覆盖有效与无效公式、异常数据、审批过期、运行时重启、实际 CSV 下载、键盘或触控输入、诊断题和刷新后保存。E01 完成后触发既有公式达人徽章。
- `npm run smoke`、`npm run smoke:academy`（157 项）、`npm run smoke:p2`（258 项）、`npm run smoke:ai`（关闭模式）通过。
- 19 个不同的课程引用链接可访问。插图为独立的 AI 生成 1600×900 PNG。E01 另存居中版，全部原有素材保留。

使用生产构建执行 `npm run preview`，然后运行 `npm run smoke:e`。可用 `BASE_URL` 指定地址，用 `SCREENSHOT_DIR` 指定截图位置。

测试使用 Chromium 桌面与手机视口。公式解释器支持课内子集；Google 服务、Notebook 和云端流程使用人工构造的离线数据。E16 的说明文字按实际结果填充模板。课程质量为草稿，等待真实试学。
