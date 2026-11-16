import { lessonSchema, type Lesson } from "../schema";

/** B11。状态为 draft：没有真实学习者试学记录。 */
export const b11: Lesson = lessonSchema.parse({
  id: "b11-js-dom",
  track: "b",
  unit: "b2",
  title: "JavaScript 与 DOM",
  objectives: [
    "能认出 JavaScript 和 Python 在变量、函数、循环上的对应写法",
    "能用 querySelector 找到页面元素，并用 textContent 修改它",
    "能用 createElement 和 appendChild 往页面里添加新元素",
  ],
  prerequisites: ["b04-functions", "b10-css-layout"],
  estimatedMinutes: 12,
  blocks: [
    {
      type: "hook",
      text: "HTML 是骨架，CSS 是衣服，JavaScript 是肌肉：它让页面动起来。好消息是，你已经学过的变量、条件、循环、函数，在 JavaScript 里全都有，只是换了一种写法。",
    },
    {
      type: "explain",
      title: "同样的事，另一种写法",
      body: [
        "变量：Python 直接写 `price = 12`，JavaScript 用 `const price = 12;`（以后不再改）或 `let count = 3;`（以后会改）。语句末尾习惯加分号。",
        "代码块用花括号 `{ }`，不靠缩进（但仍然要缩进，方便人读）。条件要放在括号里：`if (score >= 60) { … }`。函数：`function greet(name) { return \"你好，\" + name; }`。",
        "循环：`for (let i = 1; i <= 3; i++) { … }`，括号里依次是「起点；继续的条件；每轮之后做什么」。显示内容用 `console.log(…)`，对应 Python 的 print。判断相等推荐用三个等号 `===`。",
      ],
      callout: "这里的 console.log 把数组和对象显示成 [1,2,3] 和 {\"a\":1} 这样的文本，和你浏览器开发者工具里看到的样子略有不同。",
    },
    {
      type: "sim",
      sim: "js",
      mode: "free",
      title: "运行第一段 JavaScript",
      intro: "运行并看 console 输出。试试：改 count 的值；再写一个函数；把 for 的 3 改成 5。",
      code: {
        starter: `const price = 12;
let count = 3;
console.log(price * count);

function greet(name) {
  return "你好，" + name;
}
console.log(greet("Nico"));

for (let i = 1; i <= 3; i++) {
  console.log(i);
}
`,
      },
    },
    {
      type: "sim",
      sim: "js",
      mode: "challenge",
      title: "挑战：写 sumTo 函数",
      intro: "定义函数 sumTo(n)，**返回** 1 + 2 + … + n 的和（n 是 0 时返回 0）。检查程序会用 5 个不同的 n 调用它。",
      code: {
        starter: `// 在这里定义函数 sumTo(n)，返回 1 加到 n 的和
`,
        solution: `function sumTo(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    total = total + i;
  }
  return total;
}
`,
        checks: [
          { label: "sumTo(5) 应该是 15", harness: "console.log(sumTo(5));", expect: "15" },
          { label: "sumTo(1) 应该是 1", harness: "console.log(sumTo(1));", expect: "1" },
          { label: "sumTo(0) 应该是 0", harness: "console.log(sumTo(0));", expect: "0", hint: "n 是 0 时循环一次都不该执行。" },
          { label: "sumTo(10) 应该是 55", harness: "console.log(sumTo(10));", expect: "55" },
          { label: "sumTo(100) 应该是 5050（结果要能拿来继续算）", harness: "console.log(sumTo(100) + 1);", expect: "5051", hint: "函数要用 return 把结果交出来，只 console.log 的话别处拿不到。" },
        ],
        requires: [
          { pattern: "function\\s+sumTo\\s*\\(|sumTo\\s*=", message: "请定义一个叫 sumTo 的函数。" },
          { pattern: "\\bfor\\b|\\bwhile\\b", message: "请用循环来累加，不要直接套公式或写死答案。" },
        ],
      },
    },
    {
      type: "explain",
      title: "DOM：用代码改页面",
      body: [
        "浏览器把 HTML 页面变成一棵可以用代码操作的「树」，叫 **DOM**。`document.querySelector(\"#title\")` 用 CSS 选择器（和上一课一样）找到第一个匹配的元素；`#title` 选 id 是 title 的元素，`.tip` 选类是 tip 的元素。",
        "找到元素后，给它的 `textContent` 赋值就能改文字：`title.textContent = \"新标题\";`。要添加新元素：`document.createElement(\"li\")` 创建，设置文字，再 `list.appendChild(li)` 放进去。",
        "找不到元素时，`querySelector` 返回 `null`，接着对它取属性会报 TypeError。遇到这个错，先检查选择器有没有写对。",
      ],
    },
    {
      type: "sim",
      sim: "js",
      mode: "free",
      title: "改页面",
      intro: "右边的页面是真的。运行后标题变了、列表多了一项。试试：多加几项；改 .tip 那一段的文字。",
      code: {
        page: `<h1 id="title">旧标题</h1>
<p class="tip">一条提示</p>
<ul id="list"></ul>`,
        starter: `const title = document.querySelector("#title");
title.textContent = "你好，JS";

const li = document.createElement("li");
li.textContent = "第一项";
document.querySelector("#list").appendChild(li);
`,
      },
    },
    {
      type: "sim",
      sim: "js",
      mode: "challenge",
      title: "挑战：用代码生成页面",
      intro: "把 #title 的文字改成「你好，JS」，并往 #list 里添加 3 个 li，文字依次是 1、2、3。检查程序会读取页面上的结果。",
      code: {
        page: `<h1 id="title">旧标题</h1>
<ul id="list"></ul>`,
        starter: `// 在这里写代码：改标题，再用循环添加 3 个 li
`,
        solution: `document.querySelector("#title").textContent = "你好，JS";
const list = document.querySelector("#list");
for (let i = 1; i <= 3; i++) {
  const li = document.createElement("li");
  li.textContent = i;
  list.appendChild(li);
}
`,
        checks: [
          { label: "标题文字是「你好，JS」", harness: "console.log(document.querySelector('#title').textContent);", expect: "你好，JS" },
          { label: "列表里有 3 个 li", harness: "console.log(document.querySelectorAll('#list li').length);", expect: "3" },
          { label: "3 个 li 的文字依次是 1、2、3", harness: "console.log([...document.querySelectorAll('#list li')].map(e => e.textContent).join(','));", expect: "1,2,3" },
        ],
        requires: [{ pattern: "querySelector|getElementById", message: "请用 document.querySelector 找到页面上的元素再修改。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "声明一个以后不会再被重新赋值的变量，JavaScript 里推荐用什么？",
          options: ["const", "var", "int", "dim"],
          answer: 0,
          why: "const 声明的变量不能被重新赋值，更不容易写出意外的 bug；需要改变的变量用 let。",
          wrongHints: {
            "1": "var 是很老的写法，作用范围的规则容易让人困惑，现在一般用 let 和 const。",
            "2": "int 是别的语言（如 C、Java）的类型声明，JavaScript 里没有。",
            "3": "dim 是 Visual Basic 的关键字，JavaScript 里没有。",
          },
        },
        {
          q: "判断两个值是否严格相等，JavaScript 里推荐怎么写？",
          options: ["a === b", "a = b", "a == b", "a equals b"],
          answer: 0,
          why: "=== 比较时不会偷偷转换类型。单个 = 是赋值；== 会先转换类型，初学者容易踩坑。",
          wrongHints: {
            "1": "单个等号是赋值，会把 b 放进 a，不是比较。",
            "2": "== 也能比较，但会先自动转换类型（比如 \"1\" == 1 成立），容易出怪结果，所以推荐 ===。",
            "3": "JavaScript 里没有 equals 这种写法。",
          },
        },
        {
          q: "document.querySelector(\"#nothing\") 在页面上找不到这个元素时，返回什么？",
          options: ["null", "报错并停止", "空字符串", "0"],
          answer: 0,
          why: "找不到时返回 null，不会立刻报错；但紧接着对 null 取属性（比如 .textContent）才会报 TypeError。",
          wrongHints: {
            "1": "找不到元素本身不会报错，只是返回 null。报错发生在你接着使用它的时候。",
            "2": "返回的是 null，不是空字符串。",
            "3": "返回的是 null，不是数字 0。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "let n = 0; for (let i = 0; i < 4; i++) { n += i; } console.log(n)。会显示多少？",
      answer: 6,
      why: "i 依次是 0、1、2、3（小于 4），累加 0 + 1 + 2 + 3 = 6。",
      hint: "先写出 i 的所有取值：从 0 开始，到「小于 4」为止。",
    },
    {
      type: "summary",
      points: [
        "JavaScript 的变量、函数、循环和 Python 一一对应：`let` / `const`、`function`、`for (…; …; …)`。",
        "DOM 是页面的树：`querySelector` 找元素（找不到是 `null`），`textContent` 改文字。",
        "`createElement` + `appendChild` 往页面里添加新元素。",
      ],
      next: "b12-events",
    },
  ],
  sources: [
    { title: "MDN：JavaScript", url: "https://developer.mozilla.org/zh-CN/docs/Web/JavaScript" },
    { title: "MDN：文档对象模型（DOM）", url: "https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model" },
  ],
  quality: { state: "draft" },
});
