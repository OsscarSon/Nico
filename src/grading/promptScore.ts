import { ELEMENT_IDS, ELEMENTS, type ElementId } from "../ai/elements";

/**
 * 指令六要素的规则检查（纯函数，不联网）。
 *
 * 它只回答一个问题：“这一项写了没有？”，并指出依据（原文里的哪一句）。
 * 它不判断写得好不好——那是 AI 点评或人的事。关键词规则有盲区：
 * 写得很绕的句子可能被漏掉，凑关键词也能骗过它。界面上必须把这一点说清楚。
 * 规则对不对，由 tests/promptScore.test.ts 里的 20 条标注样例检验。
 */

export type ElementResult = {
  id: ElementId;
  present: boolean;
  /** 判定依据：原文里的那一小句（最多 36 个字符） */
  evidence?: string;
};

export type Level = "empty" | "no-task" | "bare" | "draft" | "solid" | "full";

export type PromptReport = {
  results: ElementResult[];
  presentCount: number;
  level: Level;
  /** 缺失项里最值得先补的一项（任务 > 背景 > 格式 > 约束 > 示例 > 角色） */
  nextStep: ElementId | null;
};

export const LEVEL_TEXT: Record<Level, string> = {
  empty: "还没有内容",
  "no-task": "还看不出要 AI 做什么",
  bare: "只有任务",
  draft: "有雏形",
  solid: "比较完整",
  full: "六项都写了",
};

/** 补写顺序。这是教学上的取舍（先让 AI 知道做什么、为谁做），不是实验结论。 */
const FIX_ORDER: ElementId[] = ["task", "context", "format", "constraints", "examples", "role"];

/** 全角标点换成半角，长度不变，这样下标能对回原文。 */
const FOLD: Record<string, string> = {
  "，": ",", "、": ",", "：": ":", "；": ";", "（": "(", "）": ")",
  "「": '"', "」": '"', "“": '"', "”": '"', "‘": "'", "’": "'",
  "。": ".", "！": "!", "？": "?", "　": " ",
};
const fold = (s: string) =>
  Array.from(s, (ch) => FOLD[ch] ?? (ch.length === 1 ? ch.toLowerCase() : ch)).join("");

/** 在 text 里找第一个匹配，返回它所在的“逗号分隔的小句”（原文）。 */
function clauseAround(original: string, index: number, length: number): string {
  const isComma = (c: string) => c === "," || c === "，" || c === "、";
  let a = index;
  while (a > 0 && !isComma(original[a - 1] ?? "")) a--;
  let b = index + length;
  while (b < original.length && !isComma(original[b] ?? "")) b++;
  const clause = original.slice(a, b).trim();
  return clause.length > 36 ? `${clause.slice(0, 35)}…` : clause;
}

const NEG = "(?<!(?:不要|不能|不可|不许|别|勿|避免|禁止|不|在|正在|已经|刚|刚刚))";

const RE: Record<ElementId, RegExp[]> = {
  role: [
    /(?:你是|假设你是|假如你是|想象你是|你现在是|你将是|你将扮演|请你扮演|请扮演|你来扮演|你扮演|扮演)(?!不是|是否|谁|什么|怎么|吗|否|不)\s*(?:一[位个名]|个|位|名)?\s*[^,.:;\n]{2,30}/,
    /\b(?:you are|you're|act as|pretend (?:to be|you are)|imagine you are)\s+(?:an?|the)\s+\w+/,
  ],
  task: [
    new RegExp(
      `${NEG}(?:帮我|帮忙|麻烦你|给我|替我|为我|我想让你|我需要你|请你|请帮)`,
    ),
    new RegExp(
      `${NEG}(?:写|编写|撰写|整理|总结|概括|归纳|翻译|解释|讲解|说明|生成|创作|列出|列举|比较|对比|分析|改写|润色|修改|优化|设计|制作|制定|规划|推荐|回答|判断|检查|找出|提取|转换|计算|出题|画|起名|取名|续写|扩写|缩写|拆分|分类|评价|点评|介绍|教我|告诉我|改成|改为|改得|改一下)`,
    ),
    /什么是|是什么|怎么|如何|为什么|有哪些|区别是|\?\s*$/,
    /\b(?:write|summari[sz]e|explain|translate|list|compare|rewrite|generate|create|describe|analy[sz]e|draft|outline|give me|tell me|help me|what is|what are|how (?:do|to|does)|why)\b/,
  ],
  context: [
    /背景(?:是|如下|信息)|情况是|现状是|我是(?!不是)|我在|我(?:正在|最近|刚刚?|目前|现在)|适合[^,.;\n]{1,8}(?:看|读|用|学)|我们(?:是|在|公司|团队|班|学校)|我的(?:目标|目的|读者|学生|孩子|公司|团队|班|专业)|目的是|是为了|为了|用来|用于|读者|受众|听众|观众|面向|针对|对象是|主题是|因为|由于|已知|场景是|情境是/,
    /(?:给|面向|针对)(?!我|你)[^,.;\n]{1,12}(?:看|读|听|学习|阅读)/,
    /(?:给|为|对|向|面向|适合)(?!我|你)[^,.;\n]{0,14}(?:孩子|小朋友|初中生|高中生|小学生|大学生|中学生|学生|同学|新手|初学者|小白|客户|领导|老人|读者|用户|观众|家长|老师)/,
    /\b(?:background|context|audience|i am|i'm|my (?:goal|team|class|students)|for (?:a|an|my) [a-z ]{2,20}(?:class|team|audience|reader)|for (?:[a-z-]+ )?(?:beginners|students|kids|children|users|readers|customers|managers))\b/,
  ],
  format: [
    /表格|列表|清单|要点|分点|分条|条目|步骤|逐步|json|markdown|csv|yaml|xml|标题|小标题|段落|分段|编号|项目符号|代码块|邮件格式|书信格式|报告格式|公文格式|每(?:条|点|段|项)|先.{1,24}再.{1,14}/,
    /[一二三四五六七八九十\d]+\s*(?:个)?(?:要点|点|条|段|步|项|句话|行|部分)/,
    /\b(?:table|bullet(?:ed)?|numbered|steps?|format(?:ted)? as|in json|headings?|paragraphs?|sections?)\b/,
    /\bformat\s*:/,
    /\b(?:one|two|three|four|five|six|\d+)\s+(?:short\s+)?(?:bullets?|points?|sentences?|steps?|items?)\b/,
  ],
  constraints: [
    /不要|不能|不可|不许|不得|别(?!人)|避免|禁止|务必|必须|一定要|只能|一次只|每次只|只(?:问|讲|说|回答|用|写|给)|保留|保持|遵循|严格|仅|限制|不超过|至多|最多|至少|以内|之内|不少于|少于|控制在|语气|口吻|风格|通俗|大白话|易懂|简单(?:的话|点|一点|易懂)|简洁|简短|专业|正式|口语|幽默|礼貌|严谨|客观|中立|无需|不必|字数|篇幅|\d+\s*(?:字|词|个字|句|行|分钟|秒)/,
    /\b(?:do not|don't|avoid|no more than|at most|at least|within \d+|must|only|tone|under \d+)\b/,
  ],
  examples: [
    /(?:示例|样例|范例|例子|例如|比如|比如说|举例|example|e\.g\.)\s*\d*\s*[:"]/,
    /(?:输入|input)\s*\d*\s*:[\s\S]{1,200}?(?:输出|output)\s*\d*\s*:/,
    /像这样\s*[:"]|参考(?:下面|以下)的?(?:例子|样例|格式)\s*[:"]/,
    /["'][^"'\n]{1,60}["']\s*(?:->|=>)\s*["']?[^\n]{1,60}/,
  ],
};

/** “任务：……”这类带标签的写法。标签后必须有内容，光写标签不算。 */
const LABELS: [RegExp, ElementId][] = [
  [/^(?:角色)\s*:\s*(\S.{1,})/, "role"],
  [/^(?:任务)\s*:\s*(\S.{1,})/, "task"],
  [/^(?:背景|背景信息|上下文|场景|情境)\s*:\s*(\S.{1,})/, "context"],
  [/^(?:格式|输出格式|输出要求)\s*:\s*(\S.{1,})/, "format"],
  [/^(?:约束|限制|要求|规则|注意)\s*:\s*(\S.{1,})/, "constraints"],
  [/^(?:示例|例子|样例|范例)\s*\d*\s*:\s*(\S.{1,})/, "examples"],
];

const stripBullet = (line: string) => line.replace(/^[\s#>*\-•\d.)、\]】[【]+/, "");

export function scorePrompt(text: string): PromptReport {
  const found = new Map<ElementId, string>();
  const trimmed = text.trim();

  // 1) 带标签的行
  for (const rawLine of text.split("\n")) {
    const line = fold(stripBullet(rawLine));
    for (const [re, id] of LABELS) {
      const m = re.exec(line);
      if (m && !found.has(id)) {
        const shown = stripBullet(rawLine).trim();
        found.set(id, shown.length > 36 ? `${shown.slice(0, 35)}…` : shown);
      }
    }
  }

  // 2) 句子里的关键写法：先把标签词本身去掉，避免“格式：”这种空标签自己触发
  const body = text
    .split("\n")
    .map((l) => stripBullet(l).replace(/^(?:角色|任务|背景信息|背景|上下文|场景|情境|输出格式|输出要求|格式|约束|限制|要求|规则|示例|例子|样例|范例)\s*[:：]\s*/, ""))
    .join("\n");
  for (const segment of body.split(/[\n。！？!?；;]+/)) {
    const folded = fold(segment);
    for (const id of ELEMENT_IDS) {
      if (found.has(id)) continue;
      for (const re of RE[id]) {
        const m = re.exec(folded);
        if (m) {
          found.set(id, clauseAround(segment, m.index, m[0].length));
          break;
        }
      }
    }
  }
  // 问句本身就是任务（分句时问号已被拿掉，所以单独查原文）
  if (!found.has("task")) {
    const q = /[?？]/.exec(text);
    if (q) found.set("task", clauseAround(text, q.index, 1));
  }
  // 输入/输出示例可能跨行，所以对整段再查一次
  if (!found.has("examples")) {
    const folded = fold(body);
    for (const re of RE.examples) {
      const m = re.exec(folded);
      if (m) {
        found.set("examples", clauseAround(body, m.index, Math.min(m[0].length, 30)));
        break;
      }
    }
  }

  // 3) 贴了一大段材料（引号或冒号换行之后的长文本）也算提供了背景
  if (!found.has("context")) {
    const quoted = /[「“"]([^」”"]{8,})[」”"]/.exec(text);
    const block = /[:：]\s*\n+\s*(\S[^]{14,})$/.exec(text);
    // “会议记录：……一长段”：名称不是六要素标签，冒号后面跟着足够长的内容，就当作附上的材料
    const named = body
      .split("\n")
      .some((l) => /^(?!(?:输入|输出|注意|input|output|example|format)\s*[:：])(?![请帮把给写问回])[^\s:：]{2,8}\s*[:：]\s*\S.{13,}$/i.test(l.trim()));
    if (quoted || named) found.set("context", "（附上了材料）");
    else if (block) found.set("context", "（附上了材料）");
  }

  const results: ElementResult[] = ELEMENT_IDS.map((id) => {
    const ev = found.get(id);
    return ev === undefined ? { id, present: false } : { id, present: true, evidence: ev };
  });
  const presentCount = results.filter((r) => r.present).length;
  const hasTask = found.has("task");
  const level: Level =
    trimmed === "" ? "empty" : !hasTask ? "no-task" : presentCount === 1 ? "bare" : presentCount <= 3 ? "draft" : presentCount <= 5 ? "solid" : "full";
  const nextStep = trimmed === "" ? null : (FIX_ORDER.find((id) => !found.has(id)) ?? null);
  return { results, presentCount, level, nextStep };
}

/** 课时挑战用：这次的场景要求哪几项必须写到。 */
export function requiredMet(
  report: PromptReport,
  required: ElementId[],
): { ok: boolean; missing: ElementId[] } {
  const missing = required.filter((id) => !report.results.find((r) => r.id === id)?.present);
  return { ok: missing.length === 0, missing };
}

export const missingElements = (report: PromptReport) =>
  report.results.filter((r) => !r.present).map((r) => ELEMENTS[r.id]);

/** 课时挑战的反馈：缺哪几项、先补哪一项（纯函数，有测试）。 */
export function challengeFeedback(
  report: PromptReport,
  required: ElementId[],
): { ok: boolean; missing: ElementId[]; message: string } {
  const { ok, missing } = requiredMet(report, required);
  if (ok) return { ok, missing, message: `要求的 ${required.length} 项都写到了。` };
  const first = missing[0] as ElementId;
  const names = missing.map((id) => ELEMENTS[id].name).join("、");
  return {
    ok,
    missing,
    message: `还差：${names}。先补「${ELEMENTS[first].name}」——${ELEMENTS[first].tip}`,
  };
}
