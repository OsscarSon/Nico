import { lessonSchema, type Lesson } from "../schema";

/** B03。状态为 draft：没有真实学习者试学记录。 */
export const b03: Lesson = lessonSchema.parse({
  id: "b03-loops",
  track: "b",
  unit: "b1",
  art: "lesson-b03-loops.png",
  title: "循环：让程序重复做事",
  objectives: [
    "能用 for 和 range 让一段代码重复固定的次数",
    "能说清 range(n) 和 range(a, b) 包含哪些数",
    "能说出 while 循环什么时候会停不下来",
  ],
  prerequisites: ["b02-conditions"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "要显示 1 到 100，你会写一百行 print 吗？电脑最擅长的就是不嫌烦：告诉它重复多少次，它就老老实实做多少次。",
    },
    {
      type: "explain",
      title: "for：重复固定的次数",
      body: [
        "`for i in range(5):` 的意思是：让 i 依次取 0、1、2、3、4，每取一个值，就执行一遍下面缩进的代码。",
        "`range(5)` 从 **0** 开始，到 **4** 结束：**终点 5 不包含在内**，一共 5 个数。`range(1, 5)` 给出 1、2、3、4。",
        "和 if 一样：行末有冒号，循环里的代码要缩进。",
      ],
    },
    {
      type: "explain",
      title: "while：只要条件成立就继续",
      body: [
        "`while 条件:` 会反复检查条件，只要还是 True 就继续执行。所以循环里**必须有东西让条件终有一天变成 False**，否则就是死循环。",
        "例如 `while n > 0:` 里要让 n 变小。忘了改 n，程序就会永远转下去。",
      ],
      callout: "别担心把浏览器卡死：这里的程序运行在单独的后台线程里，超过 5 秒会被自动停止，你也可以随时点「停止」。",
    },
    {
      type: "sim",
      sim: "python",
      mode: "free",
      title: "看循环转起来",
      intro: "先运行一遍。然后试试：把 range(5) 改成 range(1, 6)，再改成 range(3)。每次先猜输出，再运行验证。",
      code: {
        starter: `for i in range(5):
    print(i)
`,
      },
    },
    {
      type: "sim",
      sim: "python",
      mode: "challenge",
      title: "挑战：从 1 加到 n",
      intro: "输入一个 n，显示 1 + 2 + … + n 的和。用循环把每个数累加进 total。检查程序会用 4 个不同的 n 测试。",
      code: {
        starter: `n = int(input())
total = 0
# 用循环，把 1 到 n 每个数都加进 total
print(total)
`,
        solution: `n = int(input())
total = 0
for i in range(1, n + 1):
    total = total + i
print(total)
`,
        checks: [
          { label: "n = 5，和是 15", stdin: "5", expect: "15" },
          { label: "n = 1，和是 1（只有一项）", stdin: "1", expect: "1", hint: "range(1, n + 1) 在 n 是 1 时只给出 1。" },
          { label: "n = 10，和是 55", stdin: "10", expect: "55" },
          { label: "n = 100，和是 5050", stdin: "100", expect: "5050" },
        ],
        requires: [{ pattern: "\\bfor\\b|\\bwhile\\b", message: "请用 for 或 while 循环来累加。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "range(3) 会依次给出哪些数？",
          options: ["0、1、2", "1、2、3", "0、1、2、3", "1、2"],
          answer: 0,
          why: "range 从 0 开始，到终点前一个数为止，终点不包含：range(3) 是 0、1、2。",
          wrongHints: {
            "1": "range 默认从 0 开始，不是从 1。想从 1 开始要写 range(1, 4)。",
            "2": "终点 3 不包含在内。range(3) 一共给出 3 个数。",
            "3": "range 默认从 0 开始；而且终点 3 不包含在内。",
          },
        },
        {
          q: "for i in range(4): print(\"*\") 一共会显示几个星号？",
          options: ["3", "4", "5", "无限多"],
          answer: 1,
          why: "range(4) 给出 0、1、2、3，共 4 个值，循环体就执行 4 次。",
          wrongHints: {
            "0": "range(4) 给出 0、1、2、3，是 4 个值，不是 3 个。range(n) 正好执行 n 次。",
            "2": "5 次是 range(5)。range(n) 正好执行 n 次。",
            "3": "for 遇到 range 的值用完就会结束。死循环通常来自条件永远成立的 while。",
          },
        },
        {
          q: "什么情况下 while 循环会停不下来？",
          options: ["条件永远是 True", "循环里有 print", "用了 range", "循环体缩进了"],
          answer: 0,
          why: "while 只要条件是 True 就继续。如果循环里没有任何东西让条件变成 False，它就永远不会停。",
          wrongHints: {
            "1": "print 只是显示内容，不影响循环是否结束。",
            "2": "range 给出有限个值，for 用完就会结束；而且这里说的是 while。",
            "3": "缩进只决定哪些行属于循环，不会让它停不下来。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "total = 0。for i in range(1, 5): total = total + i。循环结束后，total 是多少？",
      answer: 10,
      why: "range(1, 5) 给出 1、2、3、4（5 不包含）。1 + 2 + 3 + 4 = 10。",
      hint: "先写出 range(1, 5) 包含的所有数。终点 5 算不算？",
    },
    {
      type: "summary",
      points: [
        "`for i in range(n):` 重复 n 次；range 从 0 开始、**不含终点**。",
        "`while 条件:` 只要条件成立就继续，所以循环里必须能让条件变成 False。",
        "累加的套路：先 `total = 0`，在循环里 `total = total + 新的数`。",
      ],
      next: "b04-functions",
    },
  ],
  sources: [
    { title: "Python 官方教程：for 语句与 range()", url: "https://docs.python.org/zh-cn/3/tutorial/controlflow.html#for-statements" },
  ],
  quality: { state: "draft" },
});
