import { lessonSchema, type Lesson } from "../schema";

/** B04。状态为 draft：没有真实学习者试学记录。 */
export const b04: Lesson = lessonSchema.parse({
  id: "b04-functions",
  track: "b",
  unit: "b1",
  art: "lesson-b04-functions.png",
  title: "函数：把做法打包",
  objectives: [
    "能用 def 定义函数，并区分参数和返回值",
    "能说清 print 和 return 的区别",
    "能写出一个返回计算结果的小函数，并在别处使用它",
  ],
  prerequisites: ["b03-loops"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "同一段计算要用十次，难道复制粘贴十次？给这段做法起个名字，需要时喊一声名字就行。这就是函数。",
    },
    {
      type: "explain",
      title: "def：定义一个函数",
      body: [
        "`def 名字(参数):` 开头，下面缩进的是函数体。参数是「调用时才告诉函数的值」。写 `greet(\"Nico\")` 就是**调用**：把 \"Nico\" 交给参数 name，运行函数体。",
        "函数只是被定义出来，不会自己运行；**调用**它才会运行。定义一次，可以调用很多次，每次传不同的值。",
      ],
    },
    {
      type: "explain",
      title: "return：把结果交出来",
      body: [
        "`return 值` 把结果交还给调用的地方，并**立刻结束**函数。交回来的值可以继续用：`print(area(3, 4) + 1)`。",
        "`print` 只是把内容显示到屏幕上，**不会**把值交给别人。常见错误：函数里只 print 不 return，结果别处拿不到。没写 return 的函数，交回的是特殊值 `None`。",
      ],
      callout: "判断标准：这个结果之后还要用来算别的吗？要用就 return，只是给人看就 print。",
    },
    {
      type: "sim",
      sim: "python",
      mode: "free",
      title: "定义并调用",
      intro: "运行它。然后试试：再调用一次 greet，传入你自己的名字；或者把 return 改成 print，看看会发生什么。",
      code: {
        starter: `def greet(name):
    return "你好，" + name

print(greet("Nico"))
print(greet("小明"))
`,
      },
    },
    {
      type: "sim",
      sim: "python",
      mode: "challenge",
      title: "挑战：写一个 area 函数",
      intro: "定义函数 area，接收宽 w 和高 h，**返回**它们的乘积。检查程序会用不同的数调用它，还会把两次调用的结果相加。",
      code: {
        starter: `# 在这里定义函数 area(w, h)，返回 w 乘 h
`,
        solution: `def area(w, h):
    return w * h
`,
        checks: [
          { label: "area(3, 4) 应该是 12", harness: "print(area(3, 4))", expect: "12" },
          { label: "area(5, 5) 应该是 25", harness: "print(area(5, 5))", expect: "25" },
          { label: "area(0, 7) 应该是 0", harness: "print(area(0, 7))", expect: "0" },
          {
            label: "area(2, 3) + area(1, 1) 应该是 7（结果要能拿来继续算）",
            harness: "print(area(2, 3) + area(1, 1))",
            expect: "7",
            hint: "函数要用 return 把结果交出来，只 print 的话别处拿不到。",
          },
        ],
        requires: [{ pattern: "def\\s+area\\s*\\(", message: "请用 def 定义一个叫 area 的函数。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "def f(x): return x + 1。print(f(2)) 会显示什么？",
          options: ["2", "3", "x + 1", "None"],
          answer: 1,
          why: "调用 f(2) 时 x 是 2，返回 2 + 1 = 3，print 显示 3。",
          wrongHints: {
            "0": "2 是传进去的参数。函数返回的是 x + 1 的结果。",
            "2": "函数体里的 x 会被替换成传入的值再计算，所以得到的是数，不是算式。",
            "3": "None 只出现在函数没有 return 的时候。这个函数有 return。",
          },
        },
        {
          q: "一个函数里没有写 return，调用它会得到什么？",
          options: ["0", "None", "空字符串", "报错"],
          answer: 1,
          why: "没有 return 时，函数运行完交回特殊值 None（表示「什么也没有」）。",
          wrongHints: {
            "0": "不会自动是 0。没有 return 交回的是 None。",
            "2": "不会自动是空字符串。交回的是 None。",
            "3": "没有 return 完全合法，函数照常运行，只是交回 None。",
          },
        },
        {
          q: "函数里 return 这一行之后的代码会怎样？",
          options: ["照常执行", "不会执行：函数在 return 处结束", "报错", "执行两次"],
          answer: 1,
          why: "return 会立刻结束函数，后面的代码不会再运行。",
          wrongHints: {
            "0": "return 的意思就是「到此为止，交出结果」，后面不会再执行。",
            "2": "return 后面有代码不算错误，只是永远执行不到。",
            "3": "return 后面的代码一次都不会执行。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "def f(x): return x * 2 + 1。那么 f(f(2)) 是多少？",
      answer: 11,
      why: "先算里面的 f(2) = 2 * 2 + 1 = 5，再算 f(5) = 5 * 2 + 1 = 11。里层的返回值直接成了外层的参数。",
      hint: "先算括号最里面的 f(2)，把结果再交给外面的 f。",
    },
    {
      type: "summary",
      points: [
        "`def 名字(参数):` 定义函数；**调用**它才会运行。",
        "`return` 把结果交出来并结束函数；`print` 只是显示，不交出值。",
        "没有 return 的函数交回 `None`。",
      ],
      next: "b05-lists",
    },
  ],
  sources: [
    { title: "Python 官方教程：定义函数", url: "https://docs.python.org/zh-cn/3/tutorial/controlflow.html#defining-functions" },
  ],
  quality: { state: "draft" },
});
