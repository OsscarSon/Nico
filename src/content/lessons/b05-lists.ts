import { lessonSchema, type Lesson } from "../schema";

/** B05。状态为 draft：没有真实学习者试学记录。 */
export const b05: Lesson = lessonSchema.parse({
  id: "b05-lists",
  track: "b",
  unit: "b1",
  art: "lesson-b05-lists.png",
  title: "列表：一排数据",
  objectives: [
    "能创建列表，用下标取值（下标从 0 开始），用 len 数个数",
    "能用 append 添加元素，用 for 遍历列表",
    "能用「擂台」套路在列表里找最大值",
  ],
  prerequisites: ["b03-loops"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "存 3 个分数，用 3 个变量还行；存 300 个呢？列表让你把一排数据放进一个名字里，再用循环一个个处理。",
    },
    {
      type: "explain",
      title: "列表和下标",
      body: [
        "用方括号创建列表：`scores = [80, 95, 70]`。里面的每一项有一个**下标**，**从 0 开始**：`scores[0]` 是 80，`scores[2]` 是 70。`len(scores)` 是项数 3。",
        "`scores.append(88)` 在末尾加一项。最后一项的下标永远是 `len(scores) - 1`，访问超出范围的下标会报 IndexError。",
      ],
    },
    {
      type: "explain",
      title: "遍历：一项一项处理",
      body: [
        "`for s in scores:` 让 s 依次取列表里的每一项，不用管下标。上一课学的循环，现在直接套在列表上。",
        "找最大值的套路叫「擂台」：先让第一项站上擂台（`best = nums[0]`），再依次和每一项比，谁更大谁留在擂台上。",
      ],
      callout: "别把擂台初始值设成 0：如果所有数都是负数，0 反而会赢。用第一项当初始值最稳。",
    },
    {
      type: "sim",
      sim: "python",
      mode: "free",
      title: "摆弄一个列表",
      intro: "运行并观察。试试：改 append 的数；把 scores[0] 换成 scores[3]；故意写 scores[10]，看看报错怎么说。",
      code: {
        starter: `scores = [80, 95, 70]
scores.append(88)
print(scores)
print(scores[0])
print(len(scores))
for s in scores:
    print(s)
`,
      },
    },
    {
      type: "sim",
      sim: "python",
      mode: "challenge",
      title: "挑战：找最大的数",
      intro: "输入一行用空格隔开的数。第一行代码已经把它变成了列表 nums（先照抄）。用循环找出最大的数并显示，不要用现成的 max()。检查程序会用 4 组数测试，包括全是负数的。",
      code: {
        starter: `nums = list(map(int, input().split()))
# 用循环找出最大的数并显示（不要用 max）
`,
        solution: `nums = list(map(int, input().split()))
best = nums[0]
for n in nums:
    if n > best:
        best = n
print(best)
`,
        checks: [
          { label: "输入 3 9 4，最大是 9", stdin: "3 9 4", expect: "9" },
          { label: "只有一个数 7，最大就是 7", stdin: "7", expect: "7" },
          { label: "全是负数 -5 -2 -9，最大是 -2", stdin: "-5 -2 -9", expect: "-2", hint: "擂台的初始值别设成 0，用第一项。" },
          { label: "输入 1 2 3 4 5 6，最大是 6", stdin: "1 2 3 4 5 6", expect: "6" },
        ],
        requires: [
          { pattern: "\\bfor\\b|\\bwhile\\b", message: "请用循环来找最大值。" },
          { pattern: "(?<![\\s\\S])(?![\\s\\S]*\\bmax\\s*\\()", message: "这一题不要用 max()，自己用循环来找。" },
        ],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "nums = [10, 20, 30]。nums[1] 是多少？",
          options: ["10", "20", "30", "报错"],
          answer: 1,
          why: "下标从 0 开始：nums[0] 是 10，nums[1] 是 20。",
          wrongHints: {
            "0": "10 是 nums[0]。下标是从 0 数起的，不是从 1。",
            "2": "30 是 nums[2]（最后一项）。",
            "3": "下标 1 在范围内（有 3 项，合法下标是 0、1、2），不会报错。",
          },
        },
        {
          q: "x = [1, 2]，然后 x.append(9)，print(x) 会显示什么？",
          options: ["[9, 1, 2]", "[1, 2, 9]", "[1, 2]", "[1, 2, [9]]"],
          answer: 1,
          why: "append 把新项加在列表末尾，并且直接修改原列表。",
          wrongHints: {
            "0": "append 加在末尾，不是开头。",
            "2": "append 会直接修改原列表，不是返回新的列表。",
            "3": "append(9) 加进去的就是数 9，不是一个新列表。",
          },
        },
        {
          q: "4 项的列表 a，最后一项的下标是多少？",
          options: ["4", "3", "0", "5"],
          answer: 1,
          why: "下标是 0、1、2、3，所以最后一项是 3，也就是 len(a) - 1。",
          wrongHints: {
            "0": "4 是项数。a[4] 已经超出范围，会报 IndexError。",
            "2": "0 是第一项的下标。",
            "3": "下标不会比项数还大。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "x = [4, 8, 15, 16]。x[len(x) - 1] - x[0] 的结果是多少？",
      answer: 12,
      why: "len(x) 是 4，所以 x[len(x) - 1] 是 x[3] = 16；x[0] = 4。16 - 4 = 12。",
      hint: "先算 len(x) - 1 是几，它就是要取的下标。",
    },
    {
      type: "summary",
      points: [
        "列表用 `[ ]`，下标**从 0 开始**；`len()` 数个数；`append` 加到末尾。",
        "`for 项 in 列表:` 依次处理每一项。",
        "找最大值：先让第一项站擂台，再依次比较。",
      ],
      next: "b06-dicts",
    },
  ],
  sources: [
    { title: "Python 官方教程：列表", url: "https://docs.python.org/zh-cn/3/tutorial/introduction.html#lists" },
  ],
  quality: { state: "draft" },
});
