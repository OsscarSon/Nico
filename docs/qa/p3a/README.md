# P3-A 实际浏览器与测试记录

基线main `7191ec1`。Node.js v24.22.1（符合>=22）；production build、本地Chromium，视口1440×1000、390×1000、360×1000，手机启用触屏。操作经真实表单/CodeMirror/按钮，B16命令用Enter提交，360px B13使用原生触屏发送请求。无写入模拟器状态的evaluate脚本；evaluate只读取DOM/进度、检查样式或滚动截图。

## 六张关键截图

| 课程 | 电脑1440 | 手机390 |
|---|---|---|
| B13，四项错误排查后从实际JSON对象显示Nico | [实际器件截图](screenshots/b13-fetch-json-1440.png) | [实际器件截图](screenshots/b13-fetch-json-390.png) |
| B16，双亲冲突解决、审查合并、本地main同步 | [实际器件截图](screenshots/b16-github-1440.png) | [实际器件截图](screenshots/b16-github-390.png) |
| B17，发布快照资源200、蓝色标题及JS真实渲染 | [实际视口截图](screenshots/b17-pages-1440.png) | [实际视口截图](screenshots/b17-pages-390.png) |

360px运行同样完整流程，避免重复截图；没有生成课程美术。B13/B16保留完整器件，手机长图中固定底栏仍在截图时的视口底部，实际可滚动；B17特意滚动到真实可见预览区域再截图，避免跨源iframe在离屏长图中未绘制。截图来自挑战完成后的实际状态，非设计稿或动画终点伪图。

## 检查结果

| 命令 | 结果 | 日志 |
|---|---|---|
| `npm run typecheck` | 通过 | [typecheck](logs/typecheck.log) |
| `npm run lint` | 通过 | [lint](logs/lint.log) |
| `npm test` | 46文件642项通过 | [Vitest](logs/test.log) |
| `npm run build` | 通过；原有大chunk提示保留 | [build](logs/build.log) |
| `npm run smoke` | 全部通过 | [core](logs/smoke.log) |
| `npm run smoke:b` | 原B路线完整操作通过 | [B](logs/smoke-b.log) |
| `npm run smoke:academy` | 157项、0失败 | [Academy](logs/smoke-academy.log) |
| `npm run smoke:ai` | AI关闭路径全部通过 | [AI](logs/smoke-ai.log) |
| `npm run smoke:p2` | 258/258 | [P2](logs/smoke-p2.log) |
| `npm run smoke:p2-final` | 58/58 | [P2最终布局](logs/smoke-p2-final.log) |
| `npm run smoke:p3a` | 276/276，三个宽度均走完三课 | [新课完整流程](logs/smoke-p3a.log) |

复现：`npm run build`，`npm run preview -- --port 4197`，然后`BASE_URL=http://localhost:4197 npm run smoke:p3a`。脚本可用`SCREENSHOT_DIR`指定输出；其他smoke同样接受BASE_URL。本地旧回归使用4197，新课最终迭代使用隔离构建`/tmp/nico-p3a-browser`及4198预览，避免互相改写产物。

新课覆盖：空操作门禁；GET/POST动态结果及JSON原生解析；非法JSON/缺失字段/断网/404；本地commit未push、PR未上传、未查看差异不能批准、冲突标记、过期审查、远程已合并但本地未同步；错误发布目录、根绝对路径、大小写、源文件编辑不自动发布、实际发布的JS异常与恢复。每课三道题都实际触发错误诊断再答对，迁移题先错再对；原v1保存实际4项测评并在刷新后保持。确认没有访问模拟域名API、GitHub API或真实部署服务。

初次浏览器迭代发现新select/textarea的隐式label包含选项或初始内容，已增加明确aria-label，之后完整重跑通过。B17最初整器件长截图的离屏iframe未绘制，已改为滚动到可见视口实拍，没有用静态图片冒充页面。日志只规范化末尾换行。

未运行：A路线每个独立大矩阵、本轮真实AI模型调用、实体手机/Safari/Firefox或真实GitHub Pages部署。旧内容/模拟器/判分/AI/进度与全部资源由245文件SHA保护检查，其他路线未新增或改写。没有真人试学或课程质量升级声明。
