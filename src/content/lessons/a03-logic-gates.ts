import { lessonSchema, type Lesson } from "../schema";

/**
 * A03。状态为 draft：没有真实学习者试学记录，来源尚未补齐。
 * 课头插图：GPT 重出的四种门符号图（AND、OR、NOT、XOR 的传统形状）。
 */
export const a03: Lesson = lessonSchema.parse({
  id: "a03-logic-gates",
  track: "a",
  unit: "a1",
  title: "逻辑门：AND、OR、NOT、XOR",
  art: "lesson-a03-logic-gates.png",
  objectives: [
    "能说出 AND、OR、NOT、XOR 分别在什么情况下输出 1",
    "能读懂两输入逻辑门的真值表",
    "能根据几组输入和输出，判断出是哪一种门",
  ],
  prerequisites: ["a01-binary"],
  estimatedMinutes: 9,
  blocks: [
    {
      type: "hook",
      text: "一盏灯，两个开关。是要两个开关都按下灯才亮，还是按下任何一个就亮？这种\u201C什么情况下输出什么\u201D的小规则，就是逻辑门。电脑里的加法、比较、判断，都是用成千上万个这样的小规则搭出来的。",
    },
    {
      type: "explain",
      title: "门：把输入变成输出的小规则",
      body: [
        "逻辑门有一个或两个**输入**，一个**输出**。输入和输出都只有 0 和 1，和上一课的开关一样：关是 0，开是 1。",
        "要完整描述一个门，就把所有可能的输入列出来，写下对应的输出。这张表叫**真值表**。",
        "两个输入一共有 4 种组合：00、01、10、11。这和上一课学的一样：每多一个输入，组合数翻一倍。",
      ],
    },
    {
      type: "explain",
      title: "AND 和 OR",
      body: [
        "**AND（与）**：两个输入都是 1，输出才是 1。像两个开关串在一条线上，必须都合上，灯才亮。",
        "**OR（或）**：只要有一个输入是 1，输出就是 1。像两个开关并在一起，合上任何一个，灯都会亮。",
      ],
      callout:
        "注意：OR 在两个输入都是 1 时，输出也是 1。日常说话里的\u201C或者\u201D常常是二选一，和它不一样。",
    },
    {
      type: "explain",
      title: "NOT 和 XOR",
      body: [
        "**NOT（非）**只有一个输入，作用是反过来：输入 0 输出 1，输入 1 输出 0。",
        "**XOR（异或）**：两个输入**不一样**时输出 1，一样时输出 0。它才是日常说的\u201C二选一\u201D。",
        "XOR 后面会很重要：做加法的电路就要用到它。",
      ],
    },
    {
      type: "sim",
      sim: "logic-gate",
      mode: "free",
      title: "拨一拨，看真值表",
      intro:
        "选一种门，拨动输入开关。表格里当前这一行会被标出来。试着找出每种门输出 1 的所有情况。",
    },
    {
      type: "sim",
      sim: "logic-gate",
      mode: "challenge",
      title: "挑战：看输出，猜是哪个门",
      intro:
        "每个神秘门里藏着一种门。你只能拨动输入、看输出。把每一种输入都试一遍，表格会一行行揭开，然后再猜。一共 3 个。",
      gates: ["not", "or", "xor"],
    },
    {
      type: "quiz",
      items: [
        {
          q: "输入 A=1、B=0 时，下面哪一组门的输出都是 1？",
          options: ["AND 和 OR", "OR 和 XOR", "AND 和 XOR", "只有 OR"],
          answer: 1,
          why: "A=1、B=0 时：OR 有一个输入是 1，输出 1；XOR 两个输入不一样，输出 1；AND 需要两个都是 1，输出 0。",
          wrongHints: {
            "0": "AND 需要两个输入都是 1。这里 B 是 0，所以 AND 输出 0，不能和 OR 放在同一组。",
            "2": "AND 需要两个输入都是 1。这里 B 是 0，所以 AND 输出 0。",
            "3": "OR 是对的，但还漏了一个：两个输入不一样时，XOR 也输出 1。",
          },
        },
        {
          q: "有一盏灯：只有当两个开关\u201C状态不一样\u201D（一个开、一个关）时才亮。它是哪种门？",
          options: ["AND", "OR", "XOR", "NOT"],
          answer: 2,
          why: "两个输入不一样时输出 1，一样时输出 0，这正是 XOR 的规则。",
          wrongHints: {
            "0": "AND 是两个都开才亮。可这盏灯在两个都开时是不亮的。",
            "1": "OR 在两个开关都开时也会亮。但题目里两个都开时是不亮的，所以不是 OR。",
            "3": "NOT 只有一个输入，没法比较两个开关是否一样。",
          },
        },
        {
          q: "一个两输入的门，按 00、01、10、11 的顺序，输出依次是 0、1、1、1。它是哪种门？",
          options: ["AND", "OR", "XOR", "NOT"],
          answer: 1,
          why: "只要有一个输入是 1，输出就是 1，只有 00 时才是 0。这是 OR 的真值表。",
          wrongHints: {
            "0": "AND 的输出是 0、0、0、1：只有最后一行（11）才是 1。",
            "2": "XOR 的输出是 0、1、1、0：最后一行（11）输出是 0，而这个门是 1。",
            "3": "NOT 只有一个输入，只会有 2 行，不会有 4 行。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt:
        "两个输入的门有 4 种输入组合，每种组合的输出可以是 0，也可以是 1。那么理论上一共有多少种不同的两输入逻辑门（也就是多少张不同的真值表）？",
      answer: 16,
      hint: "一共 4 行，每一行的输出有 2 种选择。把选择数连乘起来。",
      why: "4 行，每行 2 种选择：2 × 2 × 2 × 2 = 16（2 的 4 次方）。AND、OR、XOR 只是这 16 种里的 3 种。",
    },
    {
      type: "summary",
      points: [
        "逻辑门把 0 和 1 变成 0 或 1，真值表列出所有输入组合和对应的输出。",
        "AND：都是 1 才是 1。OR：至少一个是 1 就是 1。XOR：两个不一样才是 1。NOT：反过来。",
        "只看输出猜门时，把所有输入都试一遍，找出哪一行和你的猜测对不上。",
      ],
      next: "a04-adder",
    },
  ],
  sources: [
    { title: "MIT OCW · Computation Structures · Combinational Logic", url: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/" },
  ],
  quality: { state: "draft" },
});
