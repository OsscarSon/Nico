# P2 实际截图索引

所有截图来自真实浏览器与本地构建；没有设计稿、预览拼图、裁切合成或React状态注入。main基线`0aa1b1c`，改版后为本PR代码。

桌面1440×1000，手机390×844。1280/1024/768/360另有实操与布局检查，不重复保存相同画面。共28张：8张改版前、16张改版后双主题主图、2张规划节点特写、2张实际完成记录态。

## 改版前后（默认深色）

|页面|桌面改版前|桌面改版后|手机改版前|手机改版后|
|---|---|---|---|---|
|A路线|[1440](before/route-1440.png)|[1440](after/route-dark-1440.png)|[390](before/route-390.png)|[390](after/route-dark-390.png)|
|A17课程|[1440](before/lesson-1440.png)|[1440](after/lesson-dark-1440.png)|[390](before/lesson-390.png)|[390](after/lesson-dark-390.png)|
|我的|[1440](before/profile-1440.png)|[1440](after/profile-dark-1440.png)|[390](before/profile-390.png)|[390](after/profile-dark-390.png)|
|设置|[1440](before/settings-1440.png)|[1440](after/settings-dark-1440.png)|[390](before/settings-390.png)|[390](after/settings-dark-390.png)|

## 亮色与状态补充

|页面/状态|桌面|手机|
|---|---|---|
|A路线亮色|[1440](after/route-light-1440.png)|[390](after/route-light-390.png)|
|A17课程亮色|[1440](after/lesson-light-1440.png)|[390](after/lesson-light-390.png)|
|我的亮色|[1440](after/profile-light-1440.png)|[390](after/profile-light-390.png)|
|设置亮色|[1440](after/settings-light-1440.png)|[390](after/settings-light-390.png)|
|A21/A22规划节点（非课程入口）|[1440](after/route-planned-dark-1440.png)|[390](after/route-planned-dark-390.png)|
|实际通过课程后的个人页|[1440](after/profile-real-ui-completions-1440.png)|[390](after/profile-real-ui-completions-390.png)|

个人页主图的0课/1天来自测试中实际打开过课程开场，沿用原有学习日规则，不是假造连续天数。有记录态的5课、1天、2枚徽章来自旧smoke在浏览器中实际完成A01–A05；未注入完成记录，也不代表真人试学或质量认证。

已人工对照查看改版前后桌面/手机、深浅色、A16旧图和套件新图、个人页两种记录状态。自动几何/像素审查补充验证，不作为艺术审美或教学效果评分。

[完整P2报告](../../../P2_REPORT.md) · [实际测试输出摘录](VALIDATION.log) · [独立素材安装清单](../../p2/ASSET_INSTALLATION.json)

复现：Node>=22，`npm ci`→`npm run build`→`npm run preview -- --port 4191`；另一个终端 `BASE_URL=http://localhost:4191 npm run smoke:p2`。`P2_PROFILE_SCREENSHOTS=<目录> BASE_URL=http://localhost:4191 npm run smoke`会在实际完成课程、清除记录之前保存有记录态截图。
