/** 指令的六要素。评分器、训练场、课时和 AI 提示词共用这一份定义。 */
export const ELEMENT_IDS = ["role", "task", "context", "format", "constraints", "examples"] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

export type ElementInfo = {
  id: ElementId;
  /** 中文名 */
  name: string;
  /** 一句话：这一项回答什么问题 */
  asks: string;
  /** 缺这一项时给学习者的写法提示 */
  tip: string;
  /** 缺这一项时可以照着补的句式（只是句式，不是答案） */
  template: string;
};

export const ELEMENTS: Record<ElementId, ElementInfo> = {
  role: {
    id: "role",
    name: "角色",
    asks: "让 AI 站在谁的视角、用什么口吻说话？",
    tip: "说明 AI 要扮演谁。角色会影响语气和关注点，但不会让它凭空变得更准确。",
    template: "你是一位……（身份、经验、擅长什么）。",
  },
  task: {
    id: "task",
    name: "任务",
    asks: "到底要 AI 做什么？",
    tip: "用一个动词开头，把要做的事写成一句话：写、整理、翻译、比较、解释。",
    template: "请帮我……（动词 + 对象）。",
  },
  context: {
    id: "context",
    name: "背景",
    asks: "AI 需要知道哪些情况才能做对？",
    tip: "写清楚你是谁、给谁看、为什么要做，或者直接贴上要处理的材料。AI 看不到你脑子里的事。",
    template: "背景：我是……，这份东西是给……看的，用来……。",
  },
  format: {
    id: "format",
    name: "格式",
    asks: "结果要长成什么样？",
    tip: "指定输出的结构：几段、几点、表格、步骤，还是某种固定格式。",
    template: "请用……的格式输出（例如：3 个要点 / 一张表格 / 先结论后理由）。",
  },
  constraints: {
    id: "constraints",
    name: "约束",
    asks: "有哪些必须做到或不能做的？",
    tip: "写下长度、语气、范围，以及不要做什么。限制越具体，结果越可控。",
    template: "要求：不超过……字；语气……；不要……。",
  },
  examples: {
    id: "examples",
    name: "示例",
    asks: "有没有一个“像这样”的样子可以参考？",
    tip: "给一两个输入和输出的例子，比文字描述风格更直接。",
    template: "示例：输入「……」，输出「……」。",
  },
};

export const elementName = (id: ElementId) => ELEMENTS[id].name;
