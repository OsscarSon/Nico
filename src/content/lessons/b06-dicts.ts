import { lessonSchema, type Lesson } from "../schema";

/** B06。状态为 draft：没有真实学习者试学记录。 */
export const b06: Lesson = lessonSchema.parse({
  id: "b06-dicts",
  track: "b",
  unit: "b1",
  art: "lesson-b06-dicts.png",
  title: "字典：用名字找数据",
  objectives: [
    "能创建字典，用键取值、添加和修改",
    "能用 in 判断键是否存在，用 for 遍历所有键",
    "能用字典统计每个词出现的次数",
  ],
  prerequisites: ["b05-lists"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "通讯录不是「第 7 个人」，而是「按名字找」。字典就是这样：不用记位置，用一个名字（键）直接找到对应的值。",
    },
    {
      type: "explain",
      title: "键和值",
      body: [
        "字典用花括号，每一项是 `键: 值`：`prices = {\"苹果\": 5, \"香蕉\": 3}`。`prices[\"苹果\"]` 取出 5。",
        "加新项和修改是同一个写法：`prices[\"橙子\"] = 4`。键已经存在就是修改，不存在就是新增。`\"香蕉\" in prices` 判断键在不在，结果是 True 或 False。",
        "访问**不存在**的键会报 KeyError，所以不确定时先用 `in` 判断。",
      ],
    },
    {
      type: "explain",
      title: "遍历和计数",
      body: [
        "`for name in prices:` 依次拿到每一个**键**，再用 `prices[name]` 取对应的值。字典会记住键第一次出现的顺序。",
        "统计次数的套路：遇到一个词，如果已经在字典里就加 1，不在就设为 1。",
      ],
      callout: "键必须是不会变的东西：文字、数字都可以；列表不行。",
    },
    {
      type: "sim",
      sim: "python",
      mode: "free",
      title: "摆弄一个字典",
      intro: "运行并观察。试试：加一个新水果；把苹果的价格改掉；故意写 prices[\"西瓜\"]（还没有这个键），看报错。",
      code: {
        starter: `prices = {"苹果": 5, "香蕉": 3}
prices["橙子"] = 4
print(prices["苹果"])
print("香蕉" in prices)
for name in prices:
    print(name, prices[name])
`,
      },
    },
    {
      type: "sim",
      sim: "python",
      mode: "challenge",
      title: "挑战：数一数每个词",
      intro: "输入一行用空格隔开的词。统计每个词出现的次数，按词**第一次出现的顺序**，每行显示「词 次数」。检查程序会试 4 组输入。",
      code: {
        starter: `words = input().split()
counts = {}
# 用循环统计每个词出现的次数，再每行显示：词 次数
`,
        solution: `words = input().split()
counts = {}
for w in words:
    if w in counts:
        counts[w] = counts[w] + 1
    else:
        counts[w] = 1
for w in counts:
    print(w, counts[w])
`,
        checks: [
          { label: "输入 a b a c b a", stdin: "a b a c b a", expect: "a 3\nb 2\nc 1" },
          { label: "只有一个词 hi", stdin: "hi", expect: "hi 1" },
          { label: "同一个词重复 4 次", stdin: "x x x x", expect: "x 4" },
          { label: "输入 red blue red，保持第一次出现的顺序", stdin: "red blue red", expect: "red 2\nblue 1" },
        ],
        requires: [{ pattern: "\\{\\s*\\}|dict\\(", message: "请用字典来统计。" }],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "d = {\"a\": 1, \"b\": 2}。d[\"b\"] 是多少？",
          options: ["1", "2", "\"b\"", "报错"],
          answer: 1,
          why: "d[\"b\"] 用键 \"b\" 取出对应的值 2。",
          wrongHints: {
            "0": "1 是键 \"a\" 对应的值。",
            "2": "\"b\" 是键本身；方括号里放键，取出来的是它对应的值。",
            "3": "键 \"b\" 存在，所以不会报错。",
          },
        },
        {
          q: "d 里没有键 \"z\"。执行 d[\"z\"] 会怎样？",
          options: ["得到 None", "得到 0", "报错（KeyError）", "得到空字符串"],
          answer: 2,
          why: "访问不存在的键会抛出 KeyError。不确定时先用 \"z\" in d 判断。",
          wrongHints: {
            "0": "字典不会自动给 None。找不到键会报错。",
            "1": "字典不会自动当作 0。找不到键会报 KeyError。",
            "3": "字典不会自动给空字符串。找不到键会报 KeyError。",
          },
        },
        {
          q: "d = {}，然后 d[\"x\"] = 1，再 d[\"x\"] = 2。len(d) 是多少？",
          options: ["1", "2", "0", "报错"],
          answer: 0,
          why: "第二次是修改已存在的键 \"x\"，不是新增。字典里始终只有一项。",
          wrongHints: {
            "1": "键 \"x\" 已存在时，赋值是修改而不是再加一项。",
            "2": "第一次赋值已经加入了一项，长度至少是 1。",
            "3": "给不存在的键赋值是新增，完全合法。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "d = {\"a\": 1}。然后 d[\"b\"] = d[\"a\"] + 1，再 d[\"a\"] = 10。最后 d[\"a\"] + d[\"b\"] 是多少？",
      answer: 12,
      why: "d[\"b\"] 在 d[\"a\"] 还是 1 时算出 2。之后 d[\"a\"] 改成 10，不会影响 d[\"b\"]。10 + 2 = 12。存的是值，不是公式。",
      hint: "d[\"b\"] 是在哪一行算出来的？那时 d[\"a\"] 是多少？",
    },
    {
      type: "summary",
      points: [
        "字典 `{键: 值}`：用键取值，赋值既能新增也能修改。",
        "`键 in 字典` 判断键在不在；访问不存在的键会 KeyError。",
        "计数套路：在就加 1，不在就设为 1。",
      ],
      next: "b07-debugging",
    },
  ],
  sources: [
    { title: "Python 官方教程：字典", url: "https://docs.python.org/zh-cn/3/tutorial/datastructures.html#dictionaries" },
  ],
  quality: { state: "draft" },
});
