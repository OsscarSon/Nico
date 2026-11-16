import { lessonSchema, type Lesson } from "../schema";

/** B01。状态为 draft：没有真实学习者试学记录。 */
export const b01: Lesson = lessonSchema.parse({
  id: "b01-variables",
  track: "b",
  unit: "b1",
  art: "lesson-b01-variables.png",
  title: "变量：给数据起名字",
  objectives: [
    "能用 print() 让程序显示文字和计算结果",
    "能用变量保存一个值，并说明 = 在 Python 里是「放进去」而不是「相等」",
    "能说出文字和数字的区别，以及合法的变量名长什么样",
  ],
  prerequisites: [],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "电脑只会照你写的做，一个字也不会替你猜。这节课你会在浏览器里运行真正的 Python：先让它说出第一句话，再让它记住一个数。",
    },
    {
      type: "explain",
      title: "print：让程序说话",
      body: [
        "`print()` 把括号里的内容显示在屏幕上。**文字**要放在引号里，**数字**不用。",
        "`print(\"你好\")` 显示 你好；`print(2 + 3)` 先算出 5 再显示。程序是一行一行从上往下执行的。",
      ],
    },
    {
      type: "explain",
      title: "变量：贴了名字的盒子",
      body: [
        "变量就是给一个值起的名字。`price = 12` 的意思是：把 12 放进叫 price 的盒子里。以后写 price，Python 就知道你说的是 12。",
        "这里的 `=` **不是**数学里的「相等」，而是「把右边的值放进左边的名字」。所以 `count = count + 1` 完全合理：先算右边，再把结果放回去。",
        "变量名可以用字母、数字和下划线，但不能以数字开头，中间不能有空格。大小写不同就是不同的名字：Price 和 price 是两个变量。",
      ],
      callout: "名字起得有意义，代码才读得懂：price 比 p 好，total_price 比 x 好。",
    },
    {
      type: "sim",
      sim: "python",
      mode: "free",
      title: "运行你的第一段 Python",
      intro: "点「运行」看输出。然后改一改：换掉引号里的字，改改 price 和 count 的数，再运行。",
      code: {
        starter: `print("你好，Nico")

price = 12
count = 3
print(price * count)
`,
      },
    },
    {
      type: "sim",
      sim: "python",
      mode: "challenge",
      title: "挑战：算出总价",
      intro: "每件商品 price 元，买 count 件。在最后加一行，用变量算出总价并显示。点「检查答案」，系统会替你运行并核对输出。",
      code: {
        starter: `price = 15
count = 4
# 在下面写一行：用 price 和 count 算出总价并显示
`,
        solution: `price = 15
count = 4
print(price * count)
`,
        checks: [{ label: "应该显示总价 60", expect: "60", hint: "price 是 15，count 是 4。" }],
        requires: [
          {
            pattern: "price\\s*\\*\\s*count|count\\s*\\*\\s*price",
            message: "请用变量 price 和 count 来算，不要直接把 60 写进去。",
          },
        ],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "先 x = 5，再 x = x + 1，最后 print(x)。屏幕上会显示什么？",
          options: ["5", "6", "x + 1", "报错"],
          answer: 1,
          why: "电脑先算右边：5 + 1 = 6，再把 6 放回 x。所以 x 变成了 6。",
          wrongHints: {
            "0": "5 是 x 一开始的值。但第二行把 x + 1 的结果放回了 x，x 已经变了。",
            "2": "print(x) 显示的是 x 里装的值，不是代码里写的算式 x + 1。",
            "3": "x = x + 1 不是错误。= 是「放进去」：先算右边，再放回左边。",
          },
        },
        {
          q: "下面哪一个是合法的变量名？",
          options: ["2cats", "my price", "my_price", "price!"],
          answer: 2,
          why: "只能用字母、数字、下划线，不能以数字开头，中间不能有空格。my_price 全部符合。",
          wrongHints: {
            "0": "变量名不能以数字开头。",
            "1": "名字中间不能有空格。想连起来可以用下划线 _。",
            "3": "感叹号这类符号不能出现在名字里，只能用字母、数字和下划线。",
          },
        },
        {
          q: "print(\"3\" + \"4\") 会显示什么？",
          options: ["7", "34", "\"3\" + \"4\"", "报错"],
          answer: 1,
          why: "带引号的 3 和 4 是文字，不是数字。文字相加是首尾接起来，所以是 34。",
          wrongHints: {
            "0": "只有数字才会做加法：3 + 4 才是 7。带引号的 3 和 4 是文字。",
            "2": "引号只是告诉 Python「这是文字」，不会被显示出来；+ 会把两段文字接起来。",
            "3": "文字加文字完全合法，结果是接起来。文字加数字才会报错。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "a = 7，然后 b = a * 2，再然后 a = 3。三行都执行完后，b 的值是多少？",
      answer: 14,
      why: "b = a * 2 执行时 a 是 7，所以 14 被放进了 b。之后 a 改成 3，不会倒回去改 b：变量存的是值，不是公式。",
      hint: "代码从上到下一行行执行。b 是在哪一行算出来的？那时 a 是多少？",
    },
    {
      type: "summary",
      points: [
        "`print()` 显示内容：文字要加引号，数字不用。",
        "变量是给值起的名字；`=` 的意思是「把右边的值放进左边」。",
        "变量存的是**值**，不是公式；程序从上往下一行行执行。",
      ],
      next: "b02-conditions",
    },
  ],
  sources: [
    { title: "Python 官方教程：非正式介绍", url: "https://docs.python.org/zh-cn/3/tutorial/introduction.html" },
  ],
  quality: { state: "draft" },
});
