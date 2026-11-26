import { lessonSchema, type Lesson } from "../schema";

export const b20: Lesson = lessonSchema.parse({
  id: "b20-review", track: "b", unit: "b4", title: "路线回顾与自测",
  art: "lesson-b20-review.png", estimatedMinutes: 15, quality: { state: "draft" },
  prerequisites: ["b13-fetch-json", "b16-github", "b17-pages", "b19-project-tool"],
  objectives: ["从数据、程序、版本、发布四处定位问题", "根据实际 JSON 和提交快照交付一个静态更新", "用 URL、状态码和当前内容证明更新已生效"],
  blocks: [
    { type: "hook", text: "社团刚更新积分，你的电脑已经看到新数字，朋友打开同一张网页却还是旧值。到底是读错成员、没提交，还是发了旧产物？结业练习给你一条完整流水线，哪一步出了问题，就看哪一步的证据。" },
    { type: "explain", title: "数据层：先确认谁的哪一个值", body: [
      "变量记住当前值，条件挡住错误输入，循环把同一规则用在多项数据上。Python 的字典和 JavaScript 的对象都能按键取值；JSON 是传输两边都能读的文本格式。",
      "先看响应状态，再读对象中的 id 和 points。名字读到了不能证明积分对；即便 HTTP 200，也要核对成员编号和真实字段。",
    ] },
    { type: "explain", title: "页面层：把值写进正确的位置", body: [
      "HTML 给内容结构，CSS 决定样式，浏览器中的 JavaScript 可使用事件和 DOM 更新。先确定你要更新的是哪一项，再检查实际页面或文件中显示什么。",
      "本练习把积分写入静态 HTML 文件，以便追踪后续快照。这里的写入按钮替代手工编辑。平常网页也可以在浏览器里动态展示 fetch 结果，那会是不同的更新机制。",
    ] },
    { type: "explain", title: "版本层：工作区、暂存区和提交历史", body: [
      "保存文件只改变工作区。git add 记录暂存区快照，git commit 用暂存区生成提交。提交之后再改文件，旧快照仍保留。",
      "实验的构建读取 main 提交，类似发布流水线从某个版本取代码。先构建再提交会得到旧版本的产物。真实团队还要按 B16 的流程把提交推送到远程并审查。",
    ] },
    { type: "explain", title: "发布层：从产物检验到正确地址", body: [
      "站点按发布目录提供文件，项目部署在 /club/。访问 / 或从错目录发布会找不到入口，即使提交历史完全正确。",
      "先核对构建和发布来源，再访问 /club/ 检查 HTTP 状态和积分文本。本地模拟以提交中的实际 HTML 为输入，不会连接真实仓库或部署站点。",
    ] },
    { type: "sim", sim: "route-review", mode: "free", title: "自由实验：跟踪旧积分", intro: "先直接构建旧提交，选择 dist 发布并访问 /club/，记下旧积分。再查询成员 2，更新工作区但先不提交，看看重新构建时为什么还是旧数字。" },
    { type: "sim", sim: "route-review", mode: "challenge", title: "结业挑战：交付新积分", intro: "让 /club/ 上成员 2 的积分与 /api/profile?id=2 的 points 字段一致。核对数据、更新并暂存提交，从当前提交构建与发布，最后访问项目地址。四项通过才能完成。" },
    { type: "quiz", items: [
      { q: "请求得到 HTTP 200，但返回 id=1。要更新成员 2 的积分，先修哪里？", options: ["修正请求参数，核对返回 id 和 points", "把网页标题改成成员 2", "重新发布相同产物"], answer: 0, why: "响应成功和数据对象正确是两项检查，先纠正数据来源。", wrongHints: { "1": "修改标题不会改变请求读到的成员。", "2": "重新发布相同结果仍会用错数据。" } },
      { q: "提交已更新，发布页面却显示构建前的值。下一步该看什么？", options: ["检查发布快照的构建来源提交", "重复保存工作区文件", "认为 HTTP 200 证明内容已更新"], answer: 0, why: "发布版本可能仍指向旧产物，比较来源提交才能定位。", wrongHints: { "1": "保存工作区不会自动替换已发布快照。", "2": "HTTP 200 表示文件可访问，不能作为当前版本的证据。" } },
      { q: "项目在 /club/，访问 / 返回 404，该怎样验证？", options: ["访问 /club/，同时检查入口内容", "用 Git 再保存一个同样的提交", "把 API 的成员编号换成 1"], answer: 0, why: "先访问正确项目路径，确认页面内容也正确。", wrongHints: { "1": "重复提交不会改变访问的 URL。", "2": "API 参数和静态页的部署路径是不同问题。" } },
    ] },
    { type: "transfer", prompt: "一个项目的 A 版本有 4 条公告。你暂存并提交 2 条新公告成为 B，随后又在工作区写了 1 条但没提交。流水线明确从 B 构建和发布。新站点应有几条公告？", answer: 6, why: "B 含 4 条原公告和 2 条已提交新公告，工作区的额外第 7 条没有进入 B。", hint: "只数构建来源提交中的公告。" },
    { type: "summary", points: ["分清数据来源、显示结果、提交快照和发布结果。", "一层一层查真实值，记录请求对象、提交 ID 与已发布内容。", "用自己的网页或小工具复做这套验收，再回顾薄弱环节。"] },
  ],
  sources: [
    { title: "MDN：使用 Fetch", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch" },
    { title: "Pro Git：记录每次更新到仓库", url: "https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository" },
    { title: "GitHub Docs：配置 Pages 发布来源", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site" },
  ],
});
