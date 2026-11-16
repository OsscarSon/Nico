import type { ElementId } from "../../src/ai/elements";

/**
 * 20 条指令样例，每条标注六要素“写了没有”。
 *
 * ⚠ 标注者是写代码的 AI，不是人，也不是真实学习者的指令。
 * 蓝图（02_PHASES Phase 3）要求的是“20 条人工标注样例”，所以这份只是草稿：
 * 需要作者逐条复核，改了标注后重新跑 tests/promptScore.test.ts。
 *
 * 标注口径：
 *  role        明确给 AI 指定了身份或角色
 *  task        说清了要 AI 做什么（动作或问题）
 *  context     交代了你是谁 / 给谁看 / 为什么，或附上了要处理的材料
 *  format      指定了输出的结构（几点、表格、先后顺序）
 *  constraints 给了限制（字数、语气、范围、不要做什么）
 *  examples    给了具体的输入输出示例
 */
export type Sample = {
  id: string;
  note: string;
  prompt: string;
  label: Record<ElementId, boolean>;
};

const L = (s: string): Record<ElementId, boolean> => {
  const [role, task, context, format, constraints, examples] = s.split("").map((c) => c === "1");
  return { role: !!role, task: !!task, context: !!context, format: !!format, constraints: !!constraints, examples: !!examples };
};

export const samples: Sample[] = [
  { id: "s01", note: "只有一个词", prompt: "DNS", label: L("000000") },
  { id: "s02", note: "一个问题就算任务", prompt: "什么是 DNS？", label: L("010000") },
  { id: "s03", note: "最常见的偷懒写法", prompt: "写个请假邮件", label: L("010000") },
  { id: "s04", note: "只有任务", prompt: "帮我解释一下 TCP 三次握手", label: L("010000") },
  { id: "s05", note: "角色 + 任务 + 语气要求", prompt: "你是一位耐心的计算机老师。请用简单的话解释 TCP 三次握手。", label: L("110010") },
  {
    id: "s06",
    note: "附上材料 + 指定表格",
    prompt: "请帮我把下面这段会议记录整理成待办事项，用表格列出负责人和截止日期。\n会议记录：\n小王周五前提交报告，小李下周一联系客户并确认报价，我负责周三前更新排期。",
    label: L("011100"),
  },
  {
    id: "s07",
    note: "五项齐全，没有示例",
    prompt: "你是一位资深产品经理。我是一家 20 人的创业公司的运营，正在筹备新用户引导流程。请给出 3 个提升新用户留存的建议，每个建议用一句话说明原因。不要泛泛而谈，要结合 App 场景。",
    label: L("111110"),
  },
  { id: "s08", note: "英文，只有任务（没附文章）", prompt: "Summarize this article.", label: L("010000") },
  {
    id: "s09",
    note: "英文，五项",
    prompt: "You are a Python tutor for high-school beginners. Explain what a for loop is in under 120 words, using one everyday analogy. Format: two short paragraphs.",
    label: L("111110"),
  },
  { id: "s10", note: "任务 + 带箭头的示例", prompt: "请把用户输入的中文词翻译成英文。示例：「猫」→ cat。", label: L("010001") },
  { id: "s11", note: "凑关键词：只有六个标签名", prompt: "角色 任务 背景 格式 约束 示例", label: L("000000") },
  { id: "s12", note: "空标签：有标签没内容", prompt: "格式：\n约束：\n示例：", label: L("000000") },
  { id: "s13", note: "“关于秋天”是主题，不是背景", prompt: "请写一首关于秋天的诗。", label: L("010000") },
  {
    id: "s14",
    note: "背景、受众、时长和语气",
    prompt: "我是高二学生，下周要在班会上介绍我们小组做的天气预报网页。请帮我写一份 2 分钟的演讲稿，面向同班同学，语气轻松，不要用太多技术词。",
    label: L("011010"),
  },
  { id: "s15", note: "任务 + 表格 + 指定维度", prompt: "对比 Python 和 JavaScript，用表格，列出 4 个维度：语法难度、运行环境、典型用途、学习资源。", label: L("010100") },
  { id: "s16", note: "只有约束，没有任务（“不要写”不是任务）", prompt: "不要写太长。", label: L("000010") },
  { id: "s17", note: "“你是不是”是在提问，不是指定角色", prompt: "你是不是应该先告诉我答案？", label: L("010000") },
  {
    id: "s18",
    note: "六项齐全（带标签的写法）",
    prompt: "你是一位小学语文老师。请把下面的句子改写得更生动。\n要求：保留原意，不超过 30 个字，不要用成语。\n输出格式：先给改写后的句子，再用一句话说明改了什么。\n示例：\n输入：天很热。\n输出：太阳像火炉一样烤着大地。（改动：加入比喻）\n句子：风吹过来了。",
    label: L("111111"),
  },
  { id: "s19", note: "英文：任务 + 否定约束", prompt: "Write a haiku about rain. Don't mention the word 'water'.", label: L("010010") },
  { id: "s20", note: "受众写在“为……解释”里", prompt: "为一个 8 岁孩子解释光合作用，要有一个比喻，大约 100 字。", label: L("011010") },
];

/**
 * 留出集：在规则调好之后才写、写完标注后才第一次运行的 10 条样例，
 * 用来估计规则在“没见过的指令”上的表现。s01–s20 是调规则时看过的，不能再当证据。
 * 这 10 条里规则判错的地方是真实的盲区，**不要为了让测试变绿去改标注**。
 */
export const holdout: Sample[] = [
  { id: "h21", note: "受众、格式、否定约束", prompt: "给我推荐几本适合初中生看的科幻小说，每本一句话介绍，别剧透。", label: L("011110") },
  { id: "h22", note: "英文提问", prompt: "How do I center a div?", label: L("010000") },
  {
    id: "h23",
    note: "角色、背景、交互规则",
    prompt: "你是一位面试官，我是应届毕业生，应聘前端开发岗位。请模拟一次面试，一次只问一个问题，等我回答后再问下一个。",
    label: L("111010"),
  },
  { id: "h24", note: "短材料 + 语气", prompt: "请把这段话改得更正式：“明天开会你来不来啊？”", label: L("011010") },
  { id: "h25", note: "JSON 格式", prompt: "列出 5 个学习 Git 的常见误区，并为每个误区给出一个正确做法。输出为 JSON 数组，每项包含 myth 和 fix 两个字段。", label: L("010100") },
  { id: "h26", note: "“你是谁”是提问", prompt: "你是谁？", label: L("010000") },
  { id: "h27", note: "背景写成“我正在……”", prompt: "我正在学线性代数，卡在特征值上。请先问我两个问题，判断我哪里没懂，再讲解。", label: L("011100") },
  { id: "h28", note: "附上英文材料 + 翻译约束", prompt: "把「The quick brown fox jumps over the lazy dog」翻译成中文，保留原句的语序。", label: L("011010") },
  {
    id: "h29",
    note: "英文，六项",
    prompt: "Act as a travel agent. Plan a 3-day trip to Kyoto for two people with a budget of $1500. Use a day-by-day list. Example: Day 1 - Morning: Fushimi Inari.",
    label: L("111111"),
  },
  { id: "h30", note: "随便什么都行：只有任务", prompt: "帮我想一个周末活动，随便什么都行。", label: L("010000") },
];
