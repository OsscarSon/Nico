import { lessonSchema, type Lesson } from "../schema";

/** B02。状态为 draft：没有真实学习者试学记录。 */
export const b02: Lesson = lessonSchema.parse({
  id: "b02-conditions",
  track: "b",
  unit: "b1",
  art: "lesson-b02-conditions.png",
  title: "条件：让程序做选择",
  objectives: [
    "能用比较运算得到 True 或 False，并分清 = 和 ==",
    "能用 if / elif / else 写出会做选择的程序，并正确缩进",
    "能想到并测试边界值（比如刚好 60 分）",
  ],
  prerequisites: ["b01-variables"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "到现在为止，你的程序每次都做同一件事。真正有用的程序会看情况：下雨带伞，不下雨就不带。这节课教它「看情况」。",
    },
    {
      type: "explain",
      title: "比较：答案只有 True 和 False",
      body: [
        "比较两个值，结果不是数字，而是 **True**（成立）或 **False**（不成立）。常用的有：`>` 大于、`<` 小于、`>=` 大于等于、`<=` 小于等于、`==` 等于、`!=` 不等于。",
        "注意：判断「相等」要写**两个**等号 `==`。一个等号 `=` 是上一课学的「放进去」。",
      ],
      callout: "边界值最容易出错：60 >= 60 是 True，60 > 60 是 False。差一个等号，及格线上的人就变了。",
    },
    {
      type: "explain",
      title: "if / elif / else，和缩进",
      body: [
        "`if 条件:` 后面如果条件是 True，就执行下面缩进的那几行。`elif` 是「否则如果」，`else` 是「前面都不成立时」。Python 从上往下检查，**第一个成立的**那一块执行，其余跳过。",
        "两个关键细节：条件那一行**末尾要有冒号**；属于这一块的代码要**缩进 4 个空格**。Python 用缩进来判断「哪些行属于这一块」。",
      ],
    },
    {
      type: "sim",
      sim: "python",
      mode: "free",
      title: "看看它怎么选",
      intro: "在「程序输入」里写一个分数（比如 59、60、61），点「运行」。input() 会读取你写的那一行。再试着把 60 改成 70。",
      code: {
        starter: `score = int(input())
if score >= 60:
    print("及格")
else:
    print("不及格")
`,
        allowInput: true,
      },
    },
    {
      type: "sim",
      sim: "python",
      mode: "challenge",
      title: "挑战：成绩等级",
      intro: "90 分及以上输出「优秀」，60 到 89 输出「及格」，其余输出「不及格」。检查程序会替你输入 5 个分数，包括边界值。",
      code: {
        starter: `score = int(input())
# 在下面用 if / elif / else 输出等级
`,
        solution: `score = int(input())
if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")
`,
        checks: [
          { label: "输入 95，应显示 优秀", stdin: "95", expect: "优秀" },
          { label: "输入 90，应显示 优秀（边界）", stdin: "90", expect: "优秀", hint: "90 分刚好算优秀，想想用 > 还是 >=。" },
          { label: "输入 75，应显示 及格", stdin: "75", expect: "及格" },
          { label: "输入 60，应显示 及格（边界）", stdin: "60", expect: "及格", hint: "60 分刚好及格，想想用 > 还是 >=。" },
          { label: "输入 59，应显示 不及格", stdin: "59", expect: "不及格" },
        ],
        requires: [{ pattern: "\\bif\\b", message: "请用 if 来做选择，不要把每种答案直接写死。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "score = 60 时，score >= 60 的结果是什么？",
          options: ["True", "False", "60", "报错"],
          answer: 0,
          why: ">= 表示「大于或等于」，60 等于 60，所以成立，结果是 True。",
          wrongHints: {
            "1": "大于等于包含「等于」这一种情况：60 >= 60 成立。",
            "2": "比较的结果不是原来的数，而是 True 或 False。",
            "3": "比较是完全合法的，只是给出 True 或 False，不会报错。",
          },
        },
        {
          q: "要判断 a 和 b 是否相等，应该怎么写？",
          options: ["a = b", "a == b", "a === b", "a equals b"],
          answer: 1,
          why: "Python 用两个等号 == 判断相等。",
          wrongHints: {
            "0": "单个等号是「放进去」：它会把 b 的值放进 a，而不是比较。",
            "2": "三个等号是 JavaScript 的写法，Python 里用两个。",
            "3": "Python 没有 equals 这种写法，用 ==。",
          },
        },
        {
          q: "x = 5。有两个各自独立的 if：if x > 3 就显示 A，if x > 4 就显示 B。运行后会显示什么？",
          options: ["只显示 A", "只显示 B", "A 然后 B", "什么都不显示"],
          answer: 2,
          why: "两个独立的 if 各自检查一次。5 > 3 成立，显示 A；5 > 4 也成立，显示 B。只有 elif 和 else 才会「前面成立就跳过」。",
          wrongHints: {
            "0": "x > 4 也成立，第二个 if 也会执行。独立的 if 不会因为前一个成立而被跳过。",
            "1": "x > 3 也成立，第一个 if 也会执行。",
            "3": "两个条件都成立，所以两个都会执行。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "n = 10。如果 n > 10，就让 n = n + 1；否则如果 n == 10，就让 n = n + 5；其余情况 n = 0。最后 print(n) 会显示多少？",
      answer: 15,
      why: "n > 10 不成立（10 不大于 10），轮到 elif：n == 10 成立，n 变成 15，后面的 else 不会再看。",
      hint: "先问：n > 10 成立吗？不成立就看下一个条件。",
    },
    {
      type: "summary",
      points: [
        "比较的结果是 `True` 或 `False`；判断相等用 `==`，不是 `=`。",
        "`if / elif / else` 从上往下检查，执行第一个成立的块；条件行末尾要冒号，块要缩进。",
        "写条件时，专门测一测边界值。",
      ],
      next: "b03-loops",
    },
  ],
  sources: [
    { title: "Python 官方教程：if 语句", url: "https://docs.python.org/zh-cn/3/tutorial/controlflow.html#if-statements" },
  ],
  quality: { state: "draft" },
});
