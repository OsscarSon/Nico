import { lessonSchema, type Lesson } from "../schema";

const starter = `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>我的作品页</title>
  <style>
    body { margin: 1rem; font-family: system-ui, sans-serif; }
    main { max-width: 42rem; margin-inline: auto; }
    /* 在这里写 h1 的颜色 */
  </style>
</head>
<body>
  <header><h1>我的作品页</h1></header>
  <main><p>在这里介绍自己的学习方向。</p></main>
</body>
</html>`;

export const portfolioExample = starter
  .replace("/* 在这里写 h1 的颜色 */", "h1 { color: #2457f5; }")
  .replace("<header><h1>我的作品页</h1></header>",
    '<header><h1>我的作品页</h1><nav aria-label="页内导航"><a href="#projects">看作品</a></nav></header>')
  .replace("<main><p>在这里介绍自己的学习方向。</p></main>",
    `<main>
  <p>我在学习网页与编程。</p>
  <section id="projects">
    <h2>作品</h2>
    <ul>
      <li><strong>二进制练习</strong>：用位开关观察数值变化。</li>
      <li><strong>读书计时器</strong>：根据页数估算阅读时间。</li>
    </ul>
  </section>
</main>`);

export const b18: Lesson = lessonSchema.parse({
  id: "b18-project-page", track: "b", unit: "b4", title: "作品一：个人网页",
  art: "lesson-b18-project-page.png", prerequisites: ["b10-css-layout", "b17-pages"],
  estimatedMinutes: 15, quality: { state: "draft" },
  objectives: [
    "用语义化 HTML 制作含介绍、页内导航和作品清单的页面",
    "用 CSS 设置视觉层级，并在窄屏检查布局",
    "结合预览、可访问性和公开内容检查验收作品",
  ],
  blocks: [
    { type: "hook", text: "朋友问你学会了什么，你可以分享一个网页：一句话说自己在学什么，两张作品卡说清做过什么。打开的人用手机也能直接跳到作品。本课把过去学的 HTML 和 CSS 组装成一页可以带走的作品。" },
    { type: "explain", title: "先列材料，再开编辑器", body: [
      "用一句话写学习方向，给两项作品各写名字和实际用途。刚开始可以用虚构身份和练习作品，先把信息说清楚。",
      "公开前检查文字、截图和链接。家庭地址、学校班级、账号密钥以及未经允许的他人资料都不应出现在公开页面中。",
    ] },
    { type: "explain", title: "让结构和导航一起工作", body: [
      "用 header 放页面标题与导航，main 放主要内容，section 给作品分区。标题层级建议 h1 表示整页，h2 表示其下的主要区块；用列表承载同类作品。",
      "导航指向 #projects，浏览器会寻找 id 为 projects 的元素。链接文字写“看作品”比“点这里”更清楚。ID 在页内应唯一，链接目标和 ID 大小写要对上。",
    ] },
    { type: "explain", title: "大屏有边距，小屏能换行", body: [
      "用 max-width 限制长段落宽度，保留边距，让正文和列表随可用空间收缩。若用作品网格，可先从单列开始，再在够宽时增加列。",
      "先试窄窗口，再用 Tab 走到链接并按 Enter。检查目标区块、标题层级和文字可读性。模拟器检查选定的 DOM 和样式，完整的可访问性仍需要自己核对。",
    ] },
    { type: "explain", title: "交付清单比完成按钮更可靠", body: [
      "先在预览试链接、查看文本和手机宽度，再把 HTML 复制到自己的 index.html 保存。练习使用单文件 CSS，不必装构建工具。",
      "课内预览用于核对链接和目标结构。把文件保存为 index.html 并用浏览器直接打开，再点链接和用键盘验证跳转。若想发布，按 B17 核对发布目录和实际访问地址。",
    ] },
    { type: "sim", sim: "web", mode: "free", title: "拆开一张作品页", intro: "找出“看作品”链接的 href 和对应的区块 id。把它们一起改成 work，保持匹配，再改一项作品说明和标题颜色。", code: { starter: portfolioExample } },
    { type: "sim", sim: "web", mode: "challenge", title: "制作你的两项作品页", intro: "保留 h1「我的作品页」，设为 #2457f5。给 main 添加 id 为 projects 的 section，写一个含「作品」的 h2，以及至少两项作品说明。让 header 中的 nav 有链接指向该区。", code: {
      starter, solution: portfolioExample,
      webChecks: [
        { label: "主标题文字与颜色正确", selector: "header h1", text: "我的作品页", style: { prop: "color", value: "#2457f5" }, hint: "用 h1 的 CSS color，不是背景色。" },
        { label: "导航链接指向作品区", selector: 'header nav a[href="#projects"]', hint: '添加 href="#projects" 的页内链接。' },
        { label: "作品区有二级标题", selector: "main section#projects h2", text: "作品", hint: '把 id="projects" 写在作品 section 上。' },
        { label: "作品清单至少有两项非空内容", selector: "main section#projects ul li:not(:empty)", min: 2, hint: "每个 li 写一项作品以及它的用途。" },
      ],
    } },
    { type: "quiz", items: [
      { q: "点击「看作品」没跳转，链接是 #projects，但区块 id 是 project。先改什么？", options: ["让 href 和 id 的文字一致", "给标题加粗", "把浏览器主题切到亮色"], answer: 0, why: "片段标识依赖目标 ID。project 和 projects 是两个值。", wrongHints: { "1": "标题粗细不决定链接目标。", "2": "主题不会改变 HTML 中的 ID。" } },
      { q: "预览正常后准备公开，哪项适合放进作品页？", options: ["虚构示例与作品用途", "私有 API 密钥", "未经同意公开队友的住址"], answer: 0, why: "公开页面的内容可能被复制，展示作品时只用有权公开的信息。", wrongHints: { "1": "网页源码对访问者可见，密钥不能出现在其中。", "2": "他人的住址是私人信息，不能由你擅自公开。" } },
      { q: "宽屏的两列内容到了手机很挤，应该怎么检查修正？", options: ["先用窄视口验证可读，再允许单列或换行", "固定每列 500px", "隐藏所有正文"], answer: 0, why: "用可用空间决定布局，并实测小屏打开后的内容。", wrongHints: { "1": "固定宽列可能造成横向溢出。", "2": "隐藏正文会丢失读者需要的信息。" } },
    ] },
    { type: "transfer", prompt: "页面原有「介绍」和「作品」两个区块，各带一个页内链接。你加入「联系方式」和「读书笔记」两个新区块，并为每个新区块添加一个链接。现在有几个不同的有效链接目标？", answer: 4, why: "两个原目标加两个新目标，总共 4 个相互不同的区块 ID。", hint: "每个新区块只增加一个不同目标。" },
    { type: "summary", points: ["先准备读者需要的内容，再用标题、分区和列表组织。", "页内 href 与区块 ID 成对，分别用键盘和窄屏检查。", "保存源文件，发布前审查公开内容，最后验证真实访问地址。"], next: "b19-project-tool" },
  ],
  sources: [
    { title: "MDN：构建网页内容", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content" },
    { title: "MDN：创建超链接", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Creating_links" },
    { title: "MDN：响应式设计", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design" },
  ],
});
