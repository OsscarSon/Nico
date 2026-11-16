import { lessonSchema, type Lesson } from "../schema";

/** B10。状态为 draft：没有真实学习者试学记录。 */
export const b10: Lesson = lessonSchema.parse({
  id: "b10-css-layout",
  track: "b",
  unit: "b2",
  art: "lesson-b10-css-layout.png",
  title: "CSS 布局：盒子与弹性布局",
  objectives: [
    "能说出盒子模型从内到外的四层：内容、内边距、边框、外边距",
    "能用 display: flex 让子元素排成一行，并用 gap 和 justify-content 控制间距与对齐",
    "能算出一个盒子实际占多宽",
  ],
  prerequisites: ["b09-css"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "网页上的每个元素，不管看起来是圆的还是细长的，在浏览器眼里都是一个矩形的盒子。搞懂盒子怎么算大小、怎么排队，布局就不再神秘。",
    },
    {
      type: "explain",
      title: "盒子模型：四层",
      body: [
        "一个盒子从里到外有四层：**内容**（文字本身）→ **内边距 padding**（内容和边框之间的空隙）→ **边框 border** → **外边距 margin**（盒子和别的盒子之间的空隙）。",
        "padding 在边框**里面**，背景色会铺到那里；margin 在边框**外面**，是透明的。默认情况下，`width` 只管内容那一层，所以盒子实际占的宽度 = 内容宽 + 两侧 padding + 两侧 border（再加两侧 margin 就是它占的总位置）。",
      ],
    },
    {
      type: "explain",
      title: "弹性布局 flex：排成一行",
      body: [
        "给**外层容器**写 `display: flex`，它里面的子元素就会沿着一条线（默认横向）排队，而不是一个叠一个。",
        "`gap: 16px` 设置子元素之间的间距；`justify-content` 控制沿这条线怎么分布：`center` 居中，`space-between` 两头靠边、中间均分；`align-items` 控制另一个方向上的对齐。",
      ],
      callout: "flex 的规则写在**容器**上，不是写在每个子元素上。这是最常见的新手误区。",
    },
    {
      type: "sim",
      sim: "web",
      mode: "free",
      title: "摆弄一排卡片",
      intro: "试试：把 justify-content 换成 center、flex-start；把 gap 改大；去掉 display: flex，看看卡片怎么变回上下叠放。",
      code: {
        starter: `<style>
  .row { display: flex; gap: 12px; justify-content: space-between; }
  .card { padding: 12px; border: 2px solid #14213d; background-color: #e7ecf3; }
</style>

<div class="row">
  <div class="card">一</div>
  <div class="card">二</div>
  <div class="card">三</div>
</div>
`,
      },
    },
    {
      type: "sim",
      sim: "web",
      mode: "challenge",
      title: "挑战：排一排卡片",
      intro: "让 .row 变成弹性布局，卡片之间间距 16px，并两头靠边均分（space-between）；每张 .card 四周内边距 16px，边框 2px 实线。",
      code: {
        starter: `<style>
  /* 在这里写 CSS */
</style>

<div class="row">
  <div class="card">一</div>
  <div class="card">二</div>
  <div class="card">三</div>
</div>
`,
        solution: `<style>
  .row { display: flex; gap: 16px; justify-content: space-between; }
  .card { padding: 16px; border: 2px solid #14213d; }
</style>

<div class="row">
  <div class="card">一</div>
  <div class="card">二</div>
  <div class="card">三</div>
</div>
`,
        webChecks: [
          { label: ".row 是弹性布局（display: flex）", selector: ".row", style: { prop: "display", value: "flex" }, hint: "规则要写在容器 .row 上。" },
          { label: ".row 的间距是 16px", selector: ".row", style: { prop: "column-gap", value: "16px" }, hint: "写成 gap: 16px;" },
          { label: ".row 两头靠边均分", selector: ".row", style: { prop: "justify-content", value: "space-between" }, hint: "写成 justify-content: space-between;" },
          { label: ".card 的内边距是 16px", selector: ".card", style: { prop: "padding-top", value: "16px" }, hint: "写成 padding: 16px;" },
          { label: ".card 的边框宽 2px", selector: ".card", style: { prop: "border-top-width", value: "2px" }, hint: "写成 border: 2px solid 颜色; 没写 solid 的话边框不会显示。" },
          { label: ".card 的边框是实线", selector: ".card", style: { prop: "border-top-style", value: "solid" }, hint: "border 里要写 solid。" },
        ],
        requires: [{ pattern: "<style", message: "请把 CSS 写在 <style> 标签里。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "盒子模型从内到外的顺序是？",
          options: [
            "内容 → 内边距 → 边框 → 外边距",
            "内容 → 外边距 → 边框 → 内边距",
            "边框 → 内容 → 内边距 → 外边距",
            "内边距 → 内容 → 外边距 → 边框",
          ],
          answer: 0,
          why: "里面是内容，外面依次是 padding（内边距）、border（边框）、margin（外边距）。",
          wrongHints: {
            "1": "外边距在最外面，不在内容和边框之间。",
            "2": "内容在最里面，边框在内容和 padding 之外。",
            "3": "内容在最中心，padding 包在内容外面。",
          },
        },
        {
          q: "display: flex 写在哪里才能让一排子元素横着排？",
          options: ["外层的容器上", "每个子元素上", "body 上，别的不用写", "任意位置都一样"],
          answer: 0,
          why: "flex 是容器的属性：写在外层容器上，它的直接子元素才会按弹性方式排列。",
          wrongHints: {
            "1": "写在每个子元素上，只会把子元素各自变成容器，它们之间不会排成一行。",
            "2": "写在 body 上只会影响 body 的直接子元素，不一定是你想排列的那些。",
            "3": "位置很重要：规则要写在你想排列其子元素的那个容器上。",
          },
        },
        {
          q: "padding 和 margin 的区别是？",
          options: [
            "padding 在边框里面，margin 在边框外面",
            "padding 在边框外面，margin 在边框里面",
            "它们完全一样",
            "padding 只能设置颜色",
          ],
          answer: 0,
          why: "padding 是内容和边框之间的空隙（背景色会铺到），margin 是边框之外和别的盒子的间距（透明）。",
          wrongHints: {
            "1": "反了：padding 在边框里面，margin 在边框外面。",
            "2": "它们位置不同，效果也不同：背景色会铺满 padding，不会铺到 margin。",
            "3": "padding 和 margin 设置的是空隙的大小，不是颜色。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "一个盒子，内容宽 100px，四周 padding 各 10px，边框各 2px，外边距各 5px（默认盒子模型）。它在水平方向上一共占多少 px（含左右外边距）？",
      answer: 134,
      why: "内容 100 + 左右 padding 20 + 左右边框 4 + 左右外边距 10 = 134。",
      hint: "左右两侧各有 padding、border、margin，别只算一侧。",
    },
    {
      type: "summary",
      points: [
        "盒子从里到外：内容 → padding → border → margin。",
        "`display: flex` 写在**容器**上，子元素排成一行。",
        "`gap` 管间距，`justify-content` 管沿主轴的分布。",
      ],
      next: "b11-js-dom",
    },
  ],
  sources: [
    { title: "MDN：盒模型", url: "https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Styling_basics/Box_model" },
    { title: "MDN：Flexbox", url: "https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_flexible_box_layout" },
  ],
  quality: { state: "draft" },
});
