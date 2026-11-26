import { calculate, copyFormula, type Cell, type Sheet } from "./formula";

type Scenario = { name: string; sheet: Sheet; expect: readonly Cell[] };
type Task = { starter: string; scenarios: Scenario[]; copies?: number };
const fees = { A2: 10, A3: 20, A4: 40, B1: .2 };
const roster = { B2: "CL01", C2: 8, B3: "CL02", C3: 13, B4: "CL03", C4: 5 };
export const formulaTasks = {
  types: {
    starter: "=A2+A3+A4",
    scenarios: [
      { name: "文本数字与数值", sheet: { A2: 12, A3: "08", A4: 6 }, expect: [18] },
      { name: "另一批数值", sheet: { A2: 7, A3: "12", A4: 3 }, expect: [10] },
      { name: "空白与零", sheet: { A2: 0, A3: null, A4: 9 }, expect: [9] },
    ],
  },
  references: {
    starter: "=A2*B1", copies: 3,
    scenarios: [
      { name: "费率 20%", sheet: fees, expect: [2, 4, 8] },
      { name: "费率 50%", sheet: { ...fees, B1: .5, A3: 30 }, expect: [5, 15, 20] },
    ],
  },
  conditions: {
    starter: '=IF(B2>60,"通过","跟进")',
    scenarios: [
      { name: "低于门槛", sheet: { B2: 59, B3: 60, B4: 80 }, expect: ["跟进"] },
      { name: "刚好达线", sheet: { B2: 60, B3: 59, B4: 80 }, expect: ["通过"] },
      { name: "明显通过", sheet: { B2: 83, B3: 57, B4: 0 }, expect: ["通过"] },
    ],
  },
  lookup: {
    starter: "=VLOOKUP(A2,B2:C4,2,FALSE)",
    scenarios: [
      { name: "已有编码", sheet: { A2: "CL02", ...roster }, expect: [13] },
      { name: "没有该编码", sheet: { A2: "CL05", ...roster }, expect: ["未找到"] },
      { name: "库存更新", sheet: { A2: "CL03", ...roster, C4: 22 }, expect: [22] },
    ],
  },
  dates: {
    starter: "=D2",
    scenarios: [
      { name: "闰年场次", sheet: { A2: 2024, B2: 2, C2: 29, D2: "  社团   A  " }, expect: ["2024-02-29 · 社团 A"] },
      { name: "年末场次", sheet: { A2: 2026, B2: 12, C2: 1, D2: " 科学  社 " }, expect: ["2026-12-01 · 科学 社"] },
    ],
  },
} satisfies Record<string, Task>;
export type FormulaTask = keyof typeof formulaTasks;

const equals = (a: Cell, b: Cell) => typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : a === b;
export function gradeFormula(key: FormulaTask, candidate: string) {
  const task: Task = formulaTasks[key];
  return task.scenarios.map(scenario => {
    const evaluations = scenario.expect.map((expected, row) => {
      try {
        const formula = task.copies ? copyFormula(candidate, 0, row) : candidate;
        const outcome = calculate(formula, scenario.sheet);
        return outcome.ok
          ? { formula, result: String(outcome.value ?? "空白"), passed: equals(outcome.value, expected) }
          : { formula, result: outcome.error, passed: false };
      } catch (error) {
        return { formula: candidate, result: error instanceof Error ? error.message : "复制失败", passed: false };
      }
    });
    return { name: scenario.name, evaluations };
  });
}
