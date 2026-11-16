import { lessonSchema, type Lesson } from "../schema";

/** B07。状态为 draft：没有真实学习者试学记录。 */
export const b07: Lesson = lessonSchema.parse({
  id: "b07-debugging",
  track: "b",
  unit: "b1",
  art: "lesson-b07-debugging.png",
  title: "调试：读懂报错",
  objectives: [
    "能分清语法错误、运行时错误和逻辑错误",
    "能从报错信息里读出错误类型和出错的行",
    "能用 print 查看变量，逐步找出逻辑错误",
  ],
  prerequisites: ["b03-loops"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "写代码的人，大半时间不是在写，而是在找：它为什么不对？好消息是，报错信息不是在骂你，而是在告诉你哪里出了问题。",
    },
    {
      type: "explain",
      title: "三种错误",
      body: [
        "**语法错误**：Python 读不懂你写的东西（少了冒号、括号没配对），程序一行都不会运行。报错里有 SyntaxError。",
        "**运行时错误**：语法没问题，但运行到某一行时出事了，比如名字没定义（NameError）、除以 0（ZeroDivisionError）、下标越界（IndexError）。",
        "**逻辑错误**：程序顺利跑完、没有任何报错，**但结果不对**。这种最难找，因为没人告诉你哪里错了。",
      ],
    },
    {
      type: "explain",
      title: "怎么读报错、怎么找 bug",
      body: [
        "报错信息先看**最后一行**：它是「错误类型: 说明」。再看它上面写的**行号**。大多数时候，问题就在那一行或它的上一行。",
        "逻辑错误没有报错可读，就自己「看」：在可疑的地方加一行 `print(变量)`，看它此刻的值是不是你以为的值。从第一个「值不对」的地方往回找。",
      ],
      callout: "一次只改一处，改完立刻运行。同时改三处，你就不知道是哪一处起了作用。",
    },
    {
      type: "sim",
      sim: "python",
      mode: "free",
      title: "故意弄坏它，再读报错",
      intro: "先运行，正常。然后每次故意弄坏一处再运行，读报错：把最后一行的 total 改成 totl（NameError）；删掉 for 行末的冒号（SyntaxError）；把 range(1, 4) 改成 range(1, 0) 看总和（逻辑问题，没有报错）。",
      code: {
        starter: `total = 0
for i in range(1, 4):
    total = total + i
print("总和是", total)
`,
      },
    },
    {
      type: "sim",
      sim: "python",
      mode: "challenge",
      title: "挑战：修好这段程序",
      intro: "这段程序想显示 1 到 5 的和（应该是 15），但有两个 bug：一个会报错，另一个藏在后面。点「运行」读报错，修好第一个，再看结果，找出第二个。保留 for 循环。",
      code: {
        starter: `total = 0
for i in range(1, 5)
    total = total + i
print(total)
`,
        solution: `total = 0
for i in range(1, 6):
    total = total + i
print(total)
`,
        checks: [{ label: "应该显示 1 到 5 的和：15", expect: "15", hint: "range(1, 5) 包含哪些数？" }],
        requires: [{ pattern: "\\bfor\\b", message: "请保留 for 循环，不要直接写答案。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "程序报错了，信息很长。最该先看哪里？",
          options: ["第一行 Traceback", "最后一行（错误类型和说明）", "随便挑一行", "不用看，直接重写"],
          answer: 1,
          why: "最后一行写着「错误类型: 说明」，再配合它上面的行号，最容易定位问题。",
          wrongHints: {
            "0": "第一行通常只是「Traceback」几个字，没有具体信息。",
            "2": "信息是有顺序的：最后一行最关键。",
            "3": "重写很费时间，而且可能再犯同样的错。先读报错。",
          },
        },
        {
          q: "NameError: name 'totl' is not defined，最可能是什么原因？",
          options: ["totl 还没定义，或者把 total 拼错了", "totl 是文字，要加引号", "电脑坏了", "缺少括号"],
          answer: 0,
          why: "NameError 说明用到了一个不存在的名字。最常见的原因是拼写错误，或者使用前忘了先赋值。",
          wrongHints: {
            "1": "变量名不需要引号。需要引号的是文字内容。",
            "2": "电脑没坏，报错信息已经把问题说得很清楚了。",
            "3": "缺括号会是 SyntaxError，不是 NameError。",
          },
        },
        {
          q: "程序顺利跑完，没有任何报错，但结果是错的。这属于哪种错误？",
          options: ["语法错误", "逻辑错误", "名字错误", "缩进错误"],
          answer: 1,
          why: "没有报错但结果不对，是逻辑错误：程序按你写的做了，只是你写的不是你想要的。",
          wrongHints: {
            "0": "语法错误会让程序一行都跑不起来，并且有报错。",
            "2": "NameError 会有明确的报错信息。",
            "3": "缩进错误会报 IndentationError，也有报错。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "想把 1 到 10 都加起来，却写成了 range(1, 10)。结果少加了哪个数？（答案写这个数）",
      answer: 10,
      why: "range(1, 10) 到 9 为止，不包含终点 10，所以少加了 10。想包含 10 要写 range(1, 11)。",
      hint: "range 的终点包含吗？它最后一个数是几？",
    },
    {
      type: "summary",
      points: [
        "三类错误：语法错误（读不懂）、运行时错误（跑到某行出事）、逻辑错误（没报错但不对）。",
        "读报错：先看最后一行的错误类型，再看行号。",
        "找逻辑错误：用 `print` 看变量的值；一次只改一处。",
      ],
      next: "b08-html",
    },
  ],
  sources: [
    { title: "Python 官方教程：错误和异常", url: "https://docs.python.org/zh-cn/3/tutorial/errors.html" },
  ],
  quality: { state: "draft" },
});
