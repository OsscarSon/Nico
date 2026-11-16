import { lessonSchema, type Lesson } from "../schema";

/** B12。状态为 draft：没有真实学习者试学记录。 */
export const b12: Lesson = lessonSchema.parse({
  id: "b12-events",
  track: "b",
  unit: "b2",
  art: "lesson-b12-events.png",
  title: "事件：让网页有反应",
  objectives: [
    "能用 addEventListener 让页面在点击时运行代码",
    "能分清「现在运行」和「以后事件发生时再运行」",
    "能读取输入框里用户输入的内容并显示出来",
  ],
  prerequisites: ["b11-js-dom"],
  estimatedMinutes: 12,
  blocks: [
    {
      type: "hook",
      text: "上一课的代码在页面一打开就从头跑到尾，然后就结束了。真正的网页会等你：等你点按钮、等你打字。这种「等某件事发生，再做出反应」，就是事件。",
    },
    {
      type: "explain",
      title: "addEventListener：先登记，等事件来",
      body: [
        "`按钮.addEventListener(\"click\", 函数)` 的意思是：先**登记**「点击这个按钮时，运行这个函数」。登记本身不会运行那个函数；以后每点一次，浏览器就调用它一次。",
        "最容易犯的错：写成 `addEventListener(\"click\", handler())`。多了括号，handler 会在登记的那一刻就被调用，而把它的返回值当成了处理函数。要写 `handler`，不加括号；或者直接写一个箭头函数 `() => { … }`。",
      ],
    },
    {
      type: "explain",
      title: "状态：记住发生过什么",
      body: [
        "处理函数每次被调用，里面的普通变量都是新的。想「记住点了几次」，要把变量放在函数**外面**：`let count = 0;`，处理函数里改它，再把它显示到页面上。",
        "输入框的内容在它的 `value` 属性里（不是 textContent）：`const text = input.value;`。每次需要最新的内容，就在处理函数里重新读一次。",
      ],
      callout: "页面上的东西（textContent）和变量里的值是两回事：改了变量，页面不会自动变，要自己再把它写回页面。",
    },
    {
      type: "sim",
      sim: "js",
      mode: "free",
      title: "做一个计数器",
      intro: "运行后，点页面里的按钮试试。然后改一改：每次加 5；再给页面加一个「清零」按钮（要先在页面里有它，这里先试着改 count 的初始值）。",
      code: {
        page: `<button id="btn">点我</button>
<p id="out">0</p>`,
        starter: `let count = 0;
const btn = document.querySelector("#btn");
const out = document.querySelector("#out");

btn.addEventListener("click", () => {
  count = count + 1;
  out.textContent = count;
});
`,
      },
    },
    {
      type: "sim",
      sim: "js",
      mode: "challenge",
      title: "挑战：打招呼",
      intro: "点「打招呼」按钮后，#msg 显示「你好，」加上输入框里的名字。页面刚打开时 #msg 要是空的。检查程序会替你输入名字并点击按钮，试 4 次。",
      code: {
        page: `<input id="name" placeholder="你的名字">
<button id="go">打招呼</button>
<p id="msg"></p>`,
        starter: `// 在这里写代码：点击 #go 时，把「你好，」加输入框的内容显示到 #msg
`,
        solution: `const nameInput = document.querySelector("#name");
const go = document.querySelector("#go");
const msg = document.querySelector("#msg");

go.addEventListener("click", () => {
  msg.textContent = "你好，" + nameInput.value;
});
`,
        checks: [
          { label: "输入 Nico 后点击，显示「你好，Nico」", harness: "document.querySelector('#name').value = 'Nico'; document.querySelector('#go').click(); console.log(document.querySelector('#msg').textContent);", expect: "你好，Nico" },
          { label: "输入 小明 后点击，显示「你好，小明」", harness: "document.querySelector('#name').value = '小明'; document.querySelector('#go').click(); console.log(document.querySelector('#msg').textContent);", expect: "你好，小明", hint: "要在点击的时候才去读输入框的值，不要在代码一开始就读。" },
          { label: "还没点击时，#msg 是空的", harness: "console.log(document.querySelector('#msg').textContent === '');", expect: "true", hint: "addEventListener 里的函数不要写成 handler()（多了括号），那样它会立刻运行。" },
          { label: "改了名字再点一次，显示新的名字", harness: "const n = document.querySelector('#name'), g = document.querySelector('#go'); n.value = 'A'; g.click(); n.value = 'B'; g.click(); console.log(document.querySelector('#msg').textContent);", expect: "你好，B" },
        ],
        requires: [{ pattern: "addEventListener|onclick", message: "请用 addEventListener 监听按钮的点击事件。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "btn.addEventListener(\"click\", fn) 里的 fn，会在什么时候运行？",
          options: ["每次点击发生时", "这行代码执行时立刻运行一次", "每隔一秒运行一次", "永远不会运行"],
          answer: 0,
          why: "addEventListener 只是登记；以后每次点击事件发生，浏览器就调用 fn 一次。",
          wrongHints: {
            "1": "登记时不会运行 fn。只有多写了括号（fn()）才会立刻运行。",
            "2": "没有定时器的话不会自己重复，它只在点击发生时运行。",
            "3": "只要登记了，每次点击都会触发它。",
          },
        },
        {
          q: "写成 btn.addEventListener(\"click\", handler())（多了一对括号），会怎样？",
          options: [
            "handler 立刻运行一次，它的返回值被当成处理函数",
            "点击时才运行 handler",
            "报语法错误",
            "和不加括号完全一样",
          ],
          answer: 0,
          why: "handler() 是「调用」。括号让它在登记的这一刻就运行，而 addEventListener 拿到的是它的返回值，不是函数本身。",
          wrongHints: {
            "1": "加了括号就变成立刻调用了，不会等到点击。",
            "2": "语法上这是合法的，所以不会报语法错误，只是行为不是你想要的。",
            "3": "区别很大：不加括号是「把函数交出去」，加括号是「现在就运行它」。",
          },
        },
        {
          q: "怎么读取输入框 input 里用户输入的内容？",
          options: ["input.value", "input.textContent", "input.text", "input.content"],
          answer: 0,
          why: "输入框的内容放在 value 属性里。",
          wrongHints: {
            "1": "textContent 是元素里的文字内容，输入框的内容不在那里（读到的是空的）。",
            "2": "没有 text 这个属性。",
            "3": "没有 content 这个属性。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "let count = 0。按钮 A 的处理函数让 count += 1，按钮 B 的处理函数让 count += 5。依次点击 A、A、B、A 之后，count 是多少？",
      answer: 8,
      why: "A 加 1，A 加 1，B 加 5，A 加 1：1 + 1 + 5 + 1 = 8。count 在函数外面，所以每次点击都接着上次的值。",
      hint: "count 是共用的，每次点击都在它现在的值上加。",
    },
    {
      type: "summary",
      points: [
        "`addEventListener(\"click\", 函数)` 是**登记**，事件发生时浏览器才调用函数；别写成 `函数()`。",
        "想记住发生过的事，把变量放在处理函数外面；改了变量要自己写回页面。",
        "输入框的内容读 `input.value`，在处理函数里每次重新读。",
      ],
      next: "b13-fetch-json",
    },
  ],
  sources: [
    { title: "MDN：事件介绍", url: "https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Events" },
    { title: "MDN：EventTarget.addEventListener()", url: "https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener" },
  ],
  quality: { state: "draft" },
});
