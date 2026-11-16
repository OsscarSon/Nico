# 状态

当前：Nico Academy P0 UI 升级，分支 `codex/nico-academy-p0`。等待 PR 人工审阅，不自动合并或部署。基线 `8e16933`；既有实现历史见 [归档](history/STATUS-before-academy.md)。

## 已完成
- 默认暗色科技风，保留用户主动选择的亮色与字号偏好；桌面侧栏、手机五项底栏、原实验台与作品入口。
- 首页 Hero（复用原版主视觉）、真实继续学习、Foundation / Intermediate / Advanced 目录。数量由原始 `curriculum.json` 计算：100 / 46 / 66，共 212 门。
- 按阶段显示 A–F 或 A–F/M；课程标题/编号搜索、路线/阶段范围、五种状态筛选、规划详情与真实旧课时入口。
- 原版 A–E 插画及 `public/art/` 全部 56 个文件逐字节保留；不生成新插画。F/M 明确留空位。
- 23 个现有课程 ID、PathMap、内容、判分、学习进度 schema 与存储键保留。真实进度续学兼容通过。
- 修复原有 Pyodide 314 与 classic Worker 不兼容：使用官方 ESM 与 module Worker，版本与运行协议不变；修复代码编辑器窄屏尺寸及长错误文案换行。
- 固化 npm lockfile；修复原有 lint 配置/夹具问题；更新与已上线课程不符的旧 smoke 断言；增加 PR 检查。

## 实测结果
Default Environment，Node 24.22.1（项目要求 >=22），Chromium，生产构建预览：
- typecheck / lint / build：通过。
- 真实 Vitest：25 个文件、374 项通过。
- 浏览器：A 187、B 103（真实 Pyodide）、AI 关闭 26、AI 启用假服务 38、Academy 145，合计 499 项通过。
- 1440 / 390 / 360px、两套主题、键盘与手机底栏、A01/B01/C05、旧进度、网络模拟操作通过。
- [完整报告、修改清单与实际截图](academy/P0_REPORT.md)。

## 未做 / 已知限制
- 无新课程；没有真实学习者试学，既有课程的草稿质量状态不变。
- F/M 新插画与新 Hero Byte 未提供；Hero 暂复用原版主视觉。
- 未连接真实 AI 模型，验证了未配置模式与假服务协议/错误渲染；未测 Safari、Firefox 或实体手机。
- build 成功，仍有 >500KB 的 chunk 提示；Python 首次使用仍需联网下载。
- 旧课时续学成绩统计、DNS TTL、IPv4 范围与 CPU 指令限制见历史记录，本次不改教学逻辑。

下一步：用户浏览 PR 截图并在自己的设备人工验收；之后才考虑合并。P1/P2 内容建设另行进行。
