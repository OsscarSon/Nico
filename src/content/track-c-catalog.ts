import type { CatalogLesson } from "./catalog";

// 路线 C 的目录单独放在这里，避免和别的路线同时改 catalog.ts 时冲突。
const L = (id: string, title: string, unit: string, status: CatalogLesson["status"] = "planned"): CatalogLesson => ({
  id, title, unit, status,
});

export const trackCUnits = [
  { id: "c1", title: "理解大模型" },
  { id: "c2", title: "写好指令" },
  { id: "c3", title: "用 AI 做东西" },
  { id: "c4", title: "责任与安全" },
];

export const trackCCatalog: CatalogLesson[] = [
  L("c01-what-is-llm", "大模型是什么，不是什么", "c1", "available"),
  L("c02-tokens-context", "token 与上下文窗口", "c1", "available"),
  L("c03-temperature", "温度与随机", "c1", "available"),
  L("c04-hallucination", "幻觉与核查", "c1", "available"),
  L("c05-prompt-structure", "指令的六要素", "c2", "available"),
  L("c06-few-shot", "给例子（Few-shot）", "c2", "available"),
  L("c07-output-format", "指定输出格式", "c2", "available"),
  L("c08-task-splitting", "拆任务与多步提示", "c2", "available"),
  L("c09-self-check", "让模型自我检查", "c2", "available"),
  L("c10-prompt-loop", "提示词调优循环", "c2", "available"),
  L("c11-rag", "RAG：让模型读你的资料", "c3", "available"),
  L("c12-agent-loop", "工具调用与 Agent 基础", "c3", "available"),
  L("c13-evaluation", "评估：怎么知道提示词变好了", "c3", "available"),
  L("c14-local-models", "本地小模型与隐私", "c3", "available"),
  L("c15-bias-copyright", "偏见与版权", "c4", "available"),
  L("c16-prompt-injection", "提示词注入（防御向）", "c4", "available"),
  L("c17-when-not-ai", "什么时候不该用 AI", "c4", "available"),
  L("c18-assistant-project", "综合项目：AI 助手与评估表", "c4", "available"),
];
