import { lessonSchema, type Lesson } from "../schema";

/** B09。状态为 draft：没有真实学习者试学记录。 */
export const b09: Lesson = lessonSchema.parse({
  id: "b09-css",
  track: "b",
  unit: "b2",
  art: "lesson-b09-css.png",
  title: "CSS：给网页穿衣服",
  objectives: [
    "能写出「选择器 { 属性: 值; }」的 CSS 规则",
    "能用标签选择器和类选择器选中不同的元素",
    "能说清两条规则冲突时哪一条生效",
  ],
  prerequisites: ["b08-html"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "上一课你做出了网页的骨架，但它灰头土脸。CSS 是另一种语言，专门说「长什么样」：什么颜色、多大字、怎么对齐。骨架和衣服分开写，改一处就能换一身。",
    },
    {
      type: "explain",
      title: "一条 CSS 规则",
      body: [
        "一条规则由三部分组成：`p { color: blue; }`。`p` 是**选择器**（选中哪些元素），`color` 是**属性**（改哪方面），`blue` 是**值**。花括号里可以写很多条「属性: 值;」，每条以分号结尾。",
        "把 CSS 写在 HTML 里的 `<style>` 标签中就能生效。常用属性：`color` 文字颜色、`background-color` 背景色、`font-size` 字号、`text-align` 对齐。颜色可以写英文名（red），也可以写 `#2457f5` 这样的十六进制。",
      ],
    },
    {
      type: "explain",
      title: "选择器：选中谁，谁冲突时赢",
      body: [
        "标签选择器直接写标签名：`h1 { … }` 选中所有 h1。要只选其中几个，就给它们起个**类名**：HTML 里写 `<p class=\"note\">`，CSS 里用点号选：`.note { … }`。",
        "两条规则同时作用在一个元素上、而且改的是同一个属性时：**更具体的赢**（类选择器比标签选择器更具体，和写的先后无关）；**一样具体**时，写在**后面**的赢。",
      ],
      callout: "写错了也不会报错：CSS 会悄悄忽略它看不懂的规则。不生效时，先检查有没有漏掉分号、花括号，或者属性名拼错。",
    },
    {
      type: "sim",
      sim: "web",
      mode: "free",
      title: "改改样式，看预览",
      intro: "试试：把 h1 的颜色换成 red；给 p 加一条 `font-size: 24px;`；把 .note 的背景色换掉。",
      code: {
        starter: `<style>
  h1 { color: #2457f5; }
  .note { background-color: #ffb020; }
</style>

<h1>我的小站</h1>
<p>欢迎来到我的网页。</p>
<p class="note">这是一条提示。</p>
`,
      },
    },
    {
      type: "sim",
      sim: "web",
      mode: "challenge",
      title: "挑战：给页面穿上衣服",
      intro: "在 <style> 里写 CSS：h1 的文字用蓝色 #2457f5；所有 p 的字号 20px；类 note 的背景色是 #ffb020，并且文字居中。检查程序会读出浏览器真正算出来的样式。",
      code: {
        starter: `<style>
  /* 在这里写 CSS */
</style>

<h1>我的小站</h1>
<p>欢迎来到我的网页。</p>
<p class="note">这是一条提示。</p>
`,
        solution: `<style>
  h1 { color: #2457f5; }
  p { font-size: 20px; }
  .note { background-color: #ffb020; text-align: center; }
</style>

<h1>我的小站</h1>
<p>欢迎来到我的网页。</p>
<p class="note">这是一条提示。</p>
`,
        webChecks: [
          { label: "h1 的文字颜色是 #2457f5", selector: "h1", style: { prop: "color", value: "#2457f5" }, hint: "写成 h1 { color: #2457f5; }" },
          { label: "所有 p 的字号是 20px", selector: "p", style: { prop: "font-size", value: "20px" }, hint: "写成 p { font-size: 20px; }" },
          { label: ".note 的背景色是 #ffb020", selector: ".note", style: { prop: "background-color", value: "#ffb020" }, hint: "类选择器要加点号：.note { … }" },
          { label: ".note 的文字居中", selector: ".note", style: { prop: "text-align", value: "center" }, hint: "写成 text-align: center;" },
        ],
        requires: [{ pattern: "<style", message: "请把 CSS 写在 <style> 标签里，不要写成元素上的 style 属性。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "p { color: blue; } 这条规则里，color 是什么？",
          options: ["选择器", "属性", "值", "标签"],
          answer: 1,
          why: "p 是选择器，color 是属性（要改哪方面），blue 是值。",
          wrongHints: {
            "0": "选择器是花括号前面的 p，用来选中元素。",
            "2": "值是冒号后面的 blue。",
            "3": "标签是 HTML 里的概念，比如 <p>。这里 p 在 CSS 里叫选择器。",
          },
        },
        {
          q: "HTML 里是 <p class=\"note\">，CSS 里怎么选中它？",
          options: [".note", "#note", "note", "*note"],
          answer: 0,
          why: "类选择器用点号加类名：.note。",
          wrongHints: {
            "1": "# 是选 id 的写法，类要用点号。",
            "2": "不加点号的 note 会被当成标签名，而不是类。",
            "3": "CSS 里没有这种写法。",
          },
        },
        {
          q: "同一个 p 上，两条规则一样具体，都设置了 color：先写 red，后写 blue。最终是什么颜色？",
          options: ["blue", "red", "两种颜色混合", "报错"],
          answer: 0,
          why: "同样具体时，后写的覆盖先写的，所以是 blue。",
          wrongHints: {
            "1": "一样具体时，后面的会覆盖前面的，不是前面的优先。",
            "2": "CSS 不会把两个值混在一起，只会选一个。",
            "3": "CSS 遇到冲突不会报错，而是按规则选出一个。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "<p class=\"big\"> 同时被 p { font-size: 16px; } 和 .big { font-size: 24px; } 作用（标签规则写在后面）。它的字号是多少 px？",
      answer: 24,
      why: "类选择器比标签选择器更具体，所以 .big 赢，和谁写在后面无关。字号是 24px。",
      hint: "哪一个选择器更具体？更具体的赢，写的先后只在一样具体时才起作用。",
    },
    {
      type: "summary",
      points: [
        "规则的格式：`选择器 { 属性: 值; }`，写在 `<style>` 里。",
        "标签选择器选一类元素，`.类名` 选一部分元素。",
        "冲突时更具体的赢；一样具体时后写的赢。",
      ],
      next: "b10-css-layout",
    },
  ],
  sources: [
    { title: "MDN：CSS（层叠样式表）", url: "https://developer.mozilla.org/zh-CN/docs/Web/CSS" },
  ],
  quality: { state: "draft" },
});
