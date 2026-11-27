# P1.5 实机验收

PR #22 原分支 `codex/academy-2-p1-math-stats`。基线 PR #21 在本轮复核期间合并进 `main`（`aae7feb`）。四阶段共 82 页，新增 93 个可展开例题、88 道补充题，自动核验 546 处行内或独立公式。

| 阶段 | 实际截图 |
| --- | --- |
| P1A · 区间与分式不等式 | [桌面 1440px](p1a-1440.png) · [手机 390px](p1a-390.png) |
| P1B · 多步骤贝叶斯更新 | [桌面 1440px](p1b-1440.png) · [手机 390px](p1b-390.png) |
| P1C · 手算 SVD 与低秩近似 | [桌面 1440px](p1c-1440.png) · [手机 390px](p1c-390.png) |
| P1D · 单样本、独立样本与配对 t | [桌面 1440px](p1d-1440.png) · [手机 390px](p1d-390.png) |

## 结果

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck`、`npm run lint`、`npm run build` | 通过。主要入口与旧编辑器分包的体积警告仍存在。 |
| `npm test` | 58 个测试文件、796 项通过。原有保护基线对新增依赖的版本和完整性作单独校验，其余依赖继续对照原哈希。 |
| `npm run smoke:academy2-p15` | 四阶段 × 1440px、390px、360px 的分步解答、KaTeX、长公式局部滚动。三种宽度验证补充题、原记录兼容；390px 实际打开 82 页检查。实测概率树、键盘选择、开放题及本机回填。 |
| `VERIFY_PYTHON=1 npm run smoke:academy2-p15` | 真实 CodeMirror、Pyodide Worker 与计算结果，另验 CDN 失败提示。环境浏览器直连 CDN 时证书校验失败，成功路径使用完整性校验过的同版 npm 官方文件，通过测试路由提供。产品加载方式沿用既有 CDN。 |
| `smoke`、`smoke:academy2`、`smoke:academy2-p1` | 旧课、图谱、先修自评、进度和四个项目回归。分别通过 188 项、15 组、12 组。 |
| `smoke:ai` | AI 关闭模式通过 28 项。 |
| 独立数值与代码核验 | CPython、SQLite 与 g++ 执行 4 个新增代码示例；NumPy/SciPy 独立核对 SVD、配对 t、单样本 t、卡方、F 和双比例 Z 的关键数值。 |
| `npm audit --omit=dev` | npm 公告扫描报告 0 个运行时依赖漏洞。 |
| 首页网络检查 | 三种宽度均未请求新增教学、KaTeX、教学 Python 或 Pyodide 资源。 |

复跑真运行时测试可先 `npm pack pyodide@314.0.8` 到临时目录并解压，把 `PYODIDE_ASSET_DIR` 指向官方包的 `package` 目录，再用 `VERIFY_PYTHON=1` 运行浏览器测试。

课程继续处于草稿，待真实试学。SQL 与 C++ 示例附实际输出，站内执行限现有 Python Worker。GFM 文档块继续使用安全文本渲染，数学课件通过显式公式块排版。[教学覆盖](../../academy-2-p15/COVERAGE.md) · [技术选型与作者接口](../../academy-2-p15/TECHNOLOGY.md)
