import { lessonSchema, type Lesson } from "../schema";

/**
 * A05。状态为 draft：没有真实学习者试学记录，来源尚未补齐。
 * 迷你 CPU 参考经典教学模型 Little Man Computer 的思路，代码和指令集是本项目自己写的。
 */
export const a05: Lesson = lessonSchema.parse({
  id: "a05-cpu-cycle",
  track: "a",
  unit: "a2",
  art: "lesson-a05-cpu-cycle.png",
  title: "CPU：取指、译码、执行",
  objectives: [
    "能说出 CPU 反复做的三步：取指、译码、执行，以及每一步做什么",
    "能说明 PC、IR、ACC 三个寄存器分别存什么",
    "能手动跟着一个只有几条指令的小程序，推算出它的结果",
  ],
  prerequisites: ["a01-binary", "a04-adder"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "你在计算器上按 5 + 3，几乎立刻得到 8。CPU 里面到底发生了什么？答案出乎意料地简单：它只会反复做同一件事，取一条指令，看懂它，执行它。每秒重复几十亿次。",
    },
    {
      type: "explain",
      title: "CPU 是个按顺序办事的小工人",
      body: [
        "**内存**像一排编号的格子。每一格可以放数据（比如 5），也可以放一条指令（比如\u201C把第 6 格的数拿来\u201D）。程序，就是放在内存里的一串指令。",
        "CPU 里有几个很小但很快的格子，叫**寄存器**。今天认识三个：**PC**（程序计数器）记着下一条指令在内存的第几格；**IR**（指令寄存器）放着正在处理的那条指令；**ACC**（累加器）放计算的中间结果。",
      ],
    },
    {
      type: "explain",
      title: "三步循环：取指、译码、执行",
      body: [
        "**取指（Fetch）**：按 PC 指的格子，把指令拿出来放进 IR，然后 PC 加 1，指向下一条。",
        "**译码（Decode）**：看懂 IR 里的指令是什么意思，要用到哪一格。",
        "**执行（Execute）**：真的去做：读数据、做加法、写回内存，或者停下来。",
        "做完一条，回到取指，周而复始。这就是 CPU 全部的工作方式。",
      ],
    },
    {
      type: "explain",
      title: "我们的迷你 CPU 只会 4 条指令",
      body: [
        "**LOAD 6**：把第 6 格里的数拿到 ACC。**ADD 7**：把第 7 格里的数加到 ACC 上。**STORE 8**：把 ACC 里的数放进第 8 格。**HALT**：停止。",
        "比如 LOAD 6、ADD 7、STORE 8、HALT 连起来，意思就是：取第 6 格的数，加上第 7 格的数，把结果放进第 8 格，然后停下。",
      ],
      callout:
        "这里做了简化：真实 CPU 的指令是二进制数字（就像 A01 的开关），这里为了好读写成了文字；真实 CPU 的指令也远不止 4 条，但每一条仍然走同样的三步。",
    },
    {
      type: "sim",
      sim: "mini-cpu",
      mode: "free",
      title: "单步运行：看 5 + 3 怎么算出来",
      intro:
        "每点一次\u201C下一步\u201D，CPU 只走一个阶段。留意 PC、IR、ACC 的变化，以及内存里哪一格被读、哪一格被写。这个程序把第 6 格和第 7 格相加，结果放进第 8 格。",
    },
    {
      type: "sim",
      sim: "mini-cpu",
      mode: "challenge",
      title: "挑战：先预测，再验证",
      intro:
        "一共 3 个小程序。先读懂指令，预测程序停下来之后第 8 格里是多少，填进去。拿不准的话，可以用下面的单步运行核对。",
    },
    {
      type: "quiz",
      items: [
        {
          q: "CPU 执行完一条指令后，接下来做什么？",
          options: [
            "停下来等待",
            "回到取指，按 PC 取下一条指令",
            "把内存清空",
            "重新从第 0 格开始",
          ],
          answer: 1,
          why: "取指、译码、执行是一个不断重复的循环。除非遇到 HALT，否则 CPU 会接着按 PC 取下一条。",
          wrongHints: {
            "0": "只有遇到 HALT 才会停。否则 CPU 会不停地取下一条指令。",
            "2": "CPU 只是读写指令指定的那几格，不会把内存清空。",
            "3": "PC 在每次取指时加 1，所以是接着往下取，不是回到第 0 格。",
          },
        },
        {
          q: "PC（程序计数器）里存的是什么？",
          options: [
            "正在计算的结果",
            "下一条要取的指令在内存的第几格",
            "当前这条指令的内容",
            "内存一共有多少格",
          ],
          answer: 1,
          why: "PC 存的是一个\u201C位置\u201D：下一条指令放在内存第几格。每次取指之后它加 1。",
          wrongHints: {
            "0": "计算的中间结果放在 ACC，不是 PC。",
            "2": "当前这条指令的内容放在 IR 里。PC 存的是格子的编号，不是指令本身。",
            "3": "PC 只是一个指针，指向下一条指令的位置，和内存总格数无关。",
          },
        },
        {
          q: "第 6 格是 5，第 7 格是 3。依次执行 LOAD 6 和 ADD 7 之后，ACC 里是多少？",
          options: ["5", "3", "8", "53"],
          answer: 2,
          why: "LOAD 6 把 5 拿到 ACC；ADD 7 把第 7 格的 3 加到 ACC 上，5 + 3 = 8。",
          wrongHints: {
            "0": "5 是 LOAD 6 之后的值。后面还有一条 ADD 7，要再加上 3。",
            "1": "ADD 是把第 7 格的数加到 ACC 上，不是替换 ACC。ACC 里先有 5，再加 3。",
            "3": "53 是把两个数字并排写在一起。ADD 是做加法，不是拼接。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt:
        "上面单步运行的程序有 4 条指令：LOAD 6、ADD 7、STORE 8、HALT。每条指令都要走完取指、译码、执行三个阶段（HALT 也一样）。从头到尾，一共要走多少个阶段？",
      answer: 12,
      hint: "先数指令有几条，再乘每条要走的阶段数。",
      why: "4 条指令，每条 3 个阶段：4 × 3 = 12。你可以回到单步运行里数一数，点到程序停下来，步数正好是 12。",
    },
    {
      type: "summary",
      points: [
        "CPU 不停地重复三步：取指（按 PC 把指令拿进 IR，PC 加 1）、译码、执行。",
        "PC 记着下一条指令的位置，IR 放着当前指令，ACC 放着计算的中间结果。",
        "程序和数据都放在内存里。读程序时要留意：前面的指令可能已经改掉了后面要用的数据。",
      ],
      next: "a06-memory",
    },
  ],
  sources: [
    { title: "MIT OCW · Computation Structures · Instruction Set Architecture", url: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/" },
  ],
  quality: { state: "draft" },
});
