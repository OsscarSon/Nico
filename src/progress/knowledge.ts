import { useSyncExternalStore } from "react";
import { emptyKnowledge, knowledgeProgressSchema, type KnowledgeProgress } from "../grading/academy2/p1/progress";

export const KNOWLEDGE_KEY = "nico-knowledge-progress";
type View = { data: KnowledgeProgress; warning: string };
const blank: View = { data: emptyKnowledge(), warning: "" };
let value: View | undefined;
const listeners = new Set<() => void>();
const parse = (raw: string) => knowledgeProgressSchema.safeParse(JSON.parse(raw));
export function loadKnowledge(storage: Pick<Storage, "getItem" | "setItem">): View {
  const raw = storage.getItem(KNOWLEDGE_KEY);
  if (raw === null) return blank;
  try {
    const parsed = parse(raw);
    if (parsed.success) return { data: parsed.data, warning: "" };
  } catch { /* preserve the exact input below */ }
  return { data: emptyKnowledge(), warning: "知识点记录暂无法读取，原文已保留。新操作会先备份原文。" };
}
function fromBrowser(): View {
  try { return loadKnowledge(window.localStorage); }
  catch { return { ...blank, warning: "浏览器无法读取本机知识点记录。" }; }
}
const snapshot = () => value ??= fromBrowser();
const notify = () => listeners.forEach(listener => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  const handler = (event: StorageEvent) => {
    if (event.key === null || event.key === KNOWLEDGE_KEY) {
      if (!value?.warning.startsWith("本次")) value = fromBrowser();
      listener();
    }
  };
  window.addEventListener("storage", handler);
  return () => { listeners.delete(listener); window.removeEventListener("storage",handler); };
}
export const useKnowledgeProgress = () => useSyncExternalStore(subscribe,snapshot,() => blank);

export function updateKnowledge(update: (state: KnowledgeProgress) => KnowledgeProgress) {
  const previous = snapshot();
  const next = update(previous.data);
  if (next === previous.data) return;
  try {
    if (previous.warning.startsWith("知识点记录暂无法读取")) {
      const raw = window.localStorage.getItem(KNOWLEDGE_KEY);
      if (raw !== null) window.localStorage.setItem(KNOWLEDGE_KEY + "-backup-" + Date.now(), raw);
    }
    window.localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(next));
    value = { data: next, warning: "" };
  } catch { value = { data: next, warning: "本次修改已生效，但浏览器无法保存。刷新后可能恢复上次的记录。" }; }
  notify();
}
export function setSelfCheck(id: string, checked: boolean) {
  updateKnowledge(state => ({ ...state, selfChecks: { ...state.selfChecks, [id]: checked } }));
}
