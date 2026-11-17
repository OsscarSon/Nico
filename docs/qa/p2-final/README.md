# P2 最终修正：真实浏览器证据

基线：main `2ec162881709c69a7521eb7f0738c95dabdbba60`，已合并 P2 #8。Chromium、本地production build；deviceScaleFactor=1。视口高度1000px，手机启用触屏。完整页面截图中的底栏固定在拍摄时视口底部，实际滚动可继续查看下方内容。

共14张：修改前4张、修改后10张。未使用套件拼图或合成产品截图，未注入虚构学习成绩。My截图的昵称通过实际表单输入，完成数/学习天数/徽章均为0。

| 页面 | 桌面修改前 | 桌面修改后 | 手机修改前 | 手机修改后 |
|---|---|---|---|---|
| 首页 | [1440](screenshots/before-home-1440.png) | [1440](screenshots/home-dark-1440.png) | [390](screenshots/before-home-390.png) | [390](screenshots/home-dark-390.png) |
| 设置 | [1440](screenshots/before-settings-1440.png) | [1440](screenshots/settings-dark-1440.png) | [390](screenshots/before-settings-390.png) | [390](screenshots/settings-dark-390.png) |

- 首页另外两种验收宽度：[1280](screenshots/home-dark-1280.png)、[360](screenshots/home-dark-360.png)。手机完整主视觉位于文字/CTA下方。
- 亮色选项保留：[1440](screenshots/home-light-1440.png)、[390](screenshots/home-light-390.png)。Hero保留素材的深色底，确保对比。
- [My身份卡及展开编辑，390px局部实拍](screenshots/my-profile-390.png)：保存和清除资料仅在此页，学习统计真实为0。
- [24/32/48px原生品牌对照](screenshots/logo-native-24-32-48.png)：从实际应用品牌节点复制到浏览器审阅板；左上传PNG、右精简SVG，均按原生尺寸渲染。此审阅板仅用于QA，未作为正式美术或产品组件。四张首页图另记录真实应用中的使用效果。
- [布局测量](measurements.json)：卡片等高、文字范围、旧白图位置、Logo尺寸、手机背景尺寸。

## 测试日志

日志仅规范化末尾换行，原始输出保留于本地任务证据目录；未删改测试结果。

| 命令 | 结果 | 日志 |
|---|---|---|
| `npm run typecheck` | 通过 | [typecheck](logs/typecheck.log) |
| `npm run lint` | 通过 | [lint](logs/lint.log) |
| `npm test` | 42文件、618项通过 | [Vitest](logs/test.log) |
| `npm run build` | 通过，原有大chunk提示保留 | [build](logs/build.log) |
| `npm run smoke` | 全部通过 | [core](logs/smoke.log) |
| `npm run smoke:b` | 全部通过 | [B](logs/smoke-b.log) |
| `npm run smoke:academy` | 157项，0失败 | [Academy](logs/smoke-academy.log) |
| `npm run smoke:foundation` | 78项，0失败 | [Foundation](logs/smoke-foundation.log) |
| `npm run smoke:network` | 331项，0失败 | [Network](logs/smoke-network.log) |
| `npm run smoke:web` | 346项，0失败 | [Web](logs/smoke-web.log) |
| `npm run smoke:security` | 260项，0失败 | [Security](logs/smoke-security.log) |
| `npm run smoke:p2` | 258项，0失败 | [P2](logs/smoke-p2.log) |
| `npm run smoke:ai`，无endpoint | 全部通过 | [AI关闭](logs/smoke-ai.log) |
| `npm run smoke:ai`，独立mock构建 | 全部通过 | [AI模拟/失败](logs/smoke-ai-enabled.log)、[隔离构建](logs/build-ai.log) |
| `npm run smoke:p2-final` | 48项，0失败 | [本轮验收](logs/smoke-p2-final.log) |

默认构建未配置AI；启用测试单独使用 `VITE_AI_ENDPOINT=http://localhost:4195/ai npm run build -- --outDir /tmp/nico-p2-final-ai`，预览4195，脚本拦截该地址返回明确的测试响应，绝非真实模型可用性证明。普通构建预览4194；复现浏览器检查时设置`BASE_URL`到自己的预览地址，`SCREENSHOT_DIR`指定截图目录。

首次受限进程环境Vitest在两个文件后停滞，没有断言失败；终止后，在与成功基线相同的允许运行环境完整重跑通过。新浏览器测试初稿把计算样式写成`100%`，Chromium实际序列化为`100% auto`；已修正断言，保留“完整图片在全部文字/CTA下方”的几何检查。未删除任何原课程或AI功能断言。
