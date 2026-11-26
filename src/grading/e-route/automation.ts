import { checkedCleaning, cleaned, cleanRows, rawRows, total } from "./data";

export type Workflow = {
  revision: number;
  preview: { revision: number; amount: number } | null;
  approvedRevision: number | null;
  receipts: { revision: number; amount: number }[];
  staleBlocked: boolean;
  duplicateBlocked: boolean;
  message: string;
};
export type FlowAction = "preview" | "approve" | "edit" | "deliver";
export const initialFlow = (): Workflow => ({
  revision: 1, preview: null, approvedRevision: null, receipts: [], staleBlocked: false, duplicateBlocked: false, message: "先生成待审预览。",
});
export function advanceFlow(state: Workflow, action: FlowAction): Workflow {
  switch (action) {
    case "edit":
      return { ...state, revision: state.revision + 1, message: "源数据已改，之前的审核对当前版本失效。" };
    case "preview":
      return { ...state, preview: { revision: state.revision, amount: total(cleaned) + state.revision - 1 }, approvedRevision: null, message: "当前版本已生成预览，等待审核。" };
    case "approve":
      return state.preview?.revision === state.revision
        ? { ...state, approvedRevision: state.revision, message: "已批准当前预览。" }
        : { ...state, message: "先为当前版本生成预览。" };
    case "deliver":
      if (state.approvedRevision !== state.revision || state.preview?.revision !== state.revision) {
        return { ...state, staleBlocked: state.staleBlocked || (state.approvedRevision !== null && state.approvedRevision !== state.revision), message: "审批缺失或过期，交付已阻止。" };
      }
      if (state.receipts.some(r => r.revision === state.revision)) return { ...state, duplicateBlocked: true, message: "当前版本已交付，本次请求去重。" };
      return { ...state, receipts: [...state.receipts, state.preview], message: "已写入本地交付记录。" };
  }
}
export const flowPassed = (state: Workflow) => state.staleBlocked && state.duplicateBlocked
  && state.receipts.length === 1 && state.receipts[0]?.revision === 2 && state.receipts[0]?.amount === 35;

export type Notebook = {
  days: "all" | "later";
  hasInput: boolean;
  clean: typeof cleaned | null;
  sum: number | null;
  restarted: boolean;
  missingAfterRestart: boolean;
  message: string;
};
export type NotebookAction = "load" | "clean" | "summarize" | "restart";
export const initialNotebook = (days: Notebook["days"] = "all"): Notebook => ({
  days, hasInput: false, clean: null, sum: null, restarted: false, missingAfterRestart: false, message: "运行时无已加载记录。",
});
export function runCell(state: Notebook, action: NotebookAction): Notebook {
  switch (action) {
    case "restart":
      return { ...initialNotebook(state.days), restarted: state.restarted || state.sum !== null, missingAfterRestart: state.missingAfterRestart, message: "运行时已重启。单元定义保留，内存变量已清空。" };
    case "load":
      return { ...state, hasInput: true, clean: null, sum: null, message: "数据已加载到运行时。" };
    case "clean":
      if (!state.hasInput) return { ...state, message: "没有变量 raw，请先运行加载单元。" };
      return {
        ...state,
        clean: cleanRows(rawRows.filter(row => state.days === "all" || row.day >= "2026-11-04"), checkedCleaning).rows,
        sum: null, message: "清洗单元完成，可以运行汇总。",
      };
    case "summarize":
      return state.clean
        ? { ...state, sum: total(state.clean), message: "已汇总当前运行时中的清洗结果。" }
        : { ...state, missingAfterRestart: state.missingAfterRestart || state.restarted, message: "没有变量 cleaned，请运行依赖单元。" };
  }
}
export const notebookPassed = (state: Notebook) => state.missingAfterRestart && state.days === "all" && state.clean?.length === 5 && state.sum === 34;
