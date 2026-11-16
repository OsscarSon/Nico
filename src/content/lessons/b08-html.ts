import { lessonSchema, type Lesson } from "../schema";

/** B08。状态为 draft：没有真实学习者试学记录。 */
export const b08: Lesson = lessonSchema.parse({
  id: "b08-html",
  track: "b",
  unit: "b2",
  art: "lesson-b08-html.png",
  title: "HTML：网页的骨架",
  objectives: [
    "能说出标签、元素、属性分别是什么",
    "能用 h1、p、ul/li、a 写出一张有结构的页面",
    "能数清嵌套结构里有多少个元素",
  ],
  prerequisites: [],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "你每天看的网页，骨架都是同一种语言写的：HTML。它不是编程语言，更像给内容贴标签：这是标题，这是段落，这是列表。",
    },
    {
      type: "explain",
      title: "标签：给内容贴标签",
      body: [
        "HTML 用**标签**把内容包起来：`<p>你好</p>` 里，`<p>` 是开始标签，`</p>` 是结束标签，中间是内容。三者合起来叫一个**元素**。",
        "标签告诉浏览器「这是什么」，而不是「长什么样」：`<h1>` 是最大的标题，`<p>` 是段落，`<ul>` 是无序列表，列表里每一项用 `<li>`。",
        "有些标签带**属性**，写在开始标签里。链接的网址就在 href 属性里：`<a href=\"https://example.com\">点这里</a>`。",
      ],
      callout: "浏览器会忽略多余的空格和换行：想分段，要用 <p>，而不是多按几下回车。",
    },
    {
      type: "sim",
      sim: "web",
      mode: "free",
      title: "改一改，看预览",
      intro: "左边（手机上在上面）是 HTML，预览会跟着变。试着改改文字、再加一个 <h2> 小标题。",
      code: {
        starter: `<h1>我的第一个网页</h1>
<p>你好，这是一个段落。</p>
`,
      },
    },
    {
      type: "sim",
      sim: "web",
      mode: "challenge",
      title: "挑战：做一张自我介绍页",
      intro: "写出：一个大标题 h1、至少两个段落 p、一个有 3 项的列表 ul、一个带网址的链接 a。点「检查答案」，系统会检查结构。",
      code: {
        starter: `<!-- 在这里写你的自我介绍页 -->
`,
        solution: `<h1>关于我</h1>
<p>我叫 Nico，正在学做网页。</p>
<p>下面是我的三个爱好：</p>
<ul>
  <li>画画</li>
  <li>游戏</li>
  <li>编程</li>
</ul>
<a href="https://developer.mozilla.org/">去 MDN 看看</a>
`,
        webChecks: [
          { label: "有一个大标题（h1）", selector: "h1", hint: "写成 <h1>标题</h1>。" },
          { label: "至少两个段落（p）", selector: "p", min: 2, hint: "每个段落都要用 <p> 和 </p> 包起来。" },
          { label: "一个有 3 项的列表（ul 里 3 个 li）", selector: "ul li", min: 3, hint: "列表是 <ul>，每一项是 <li>。" },
          { label: "一个带网址的链接（a 的 href）", selector: "a[href]", hint: "写成 <a href=\"网址\">文字</a>。" },
        ],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "哪个标签表示页面上最大的标题？",
          options: ["h1", "p", "title", "big"],
          answer: 0,
          why: "h1 到 h6 是六级标题，h1 最大、最重要。",
          wrongHints: {
            "1": "p 是普通段落，不是标题。",
            "2": "title 是浏览器标签页上显示的名字，写在 head 里，不是页面里的大标题。",
            "3": "HTML 里没有给内容定义「大」的 big 标签（早已废弃）。标题用 h1。",
          },
        },
        {
          q: "无序列表里，每一项应该用哪个标签？",
          options: ["li", "ul", "item", "p"],
          answer: 0,
          why: "ul 是整个列表，里面每一项用 li（list item）。",
          wrongHints: {
            "1": "ul 是整个列表这个容器，不是其中的一项。",
            "2": "HTML 里没有 item 这个标签，列表项叫 li。",
            "3": "p 是段落。列表里的每一项要用 li。",
          },
        },
        {
          q: "链接要跳转的网址，写在 a 标签的哪个属性里？",
          options: ["href", "src", "link", "url"],
          answer: 0,
          why: "href（hypertext reference）属性放链接的目标地址。",
          wrongHints: {
            "1": "src 用在图片这类「要加载的资源」上，链接要跳转的地址用 href。",
            "2": "HTML 里没有叫 link 的属性（有同名的 link 标签，但用途不同）。",
            "3": "属性名不是 url，而是 href。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "这段 HTML 里一共有多少个 li 元素？ <ul><li>A<ul><li>B</li><li>C</li></ul></li><li>D</li></ul>",
      answer: 4,
      why: "外层列表有 A 和 D 两项；A 里面又嵌套了一个列表，里面有 B 和 C。一共 4 个 li。li 里可以再放一个 ul。",
      hint: "别漏了嵌套在里面的列表，一层一层数。",
    },
    {
      type: "summary",
      points: [
        "HTML 用**标签**给内容贴标签；开始标签 + 内容 + 结束标签 = 一个**元素**。",
        "常用结构：`h1` 标题、`p` 段落、`ul` + `li` 列表、`a` + `href` 链接。",
        "标签说的是内容「是什么」，样子由下一课的 CSS 决定。",
      ],
      next: "b09-css",
    },
  ],
  sources: [
    { title: "MDN：HTML（超文本标记语言）", url: "https://developer.mozilla.org/zh-CN/docs/Web/HTML" },
  ],
  quality: { state: "draft" },
});
