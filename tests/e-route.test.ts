import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { coursesFor, liveLessonFor } from "../src/content/academy";
import { routeView } from "../src/content/route-view";
import { calculate, copyFormula } from "../src/grading/e-route/formula";
import { formulaTasks, gradeFormula, type FormulaTask } from "../src/grading/e-route/formulaTasks";
import {
  checkedCleaning, cleanRows, dispatchTriggers, pipeline, prepareReport, rawRows, reportCsv,
  simulateGemini, summarize, total,
} from "../src/grading/e-route/data";
import { advanceFlow, flowPassed, initialFlow, initialNotebook, notebookPassed, runCell, type FlowAction, type NotebookAction } from "../src/grading/e-route/automation";
import { benches, exampleRequest, passed, type BenchKey } from "../src/grading/e-route/bench";

const formulas: Record<FormulaTask, string> = {
  types: "=SUM(A2:A4)",
  references: "=A2*$B$1",
  conditions: '=IF(B2>=60,"通过","跟进")',
  lookup: '=XLOOKUP(A2,B2:B4,C2:C4,"未找到")',
  dates: '=TEXT(DATE(A2,B2,C2),"yyyy-mm-dd")&" · "&TRIM(D2)',
};
describe("E formula evaluator", () => {
  for (const key of Object.keys(formulas) as FormulaTask[]) it(key + " rejects the starter and computes a valid result for every fixture", () => {
    expect(gradeFormula(key, formulaTasks[key].starter).some(r => r.evaluations.some(v => !v.passed))).toBe(true);
    expect(gradeFormula(key, formulas[key]).every(r => r.evaluations.every(v => v.passed))).toBe(true);
  });
  it("treats numeric-looking text as text and provides explicit conversion and precedence", () => {
    expect(calculate("=SUM(A1:A4)", { A1: 12, A2: "08", A3: null, A4: 0 })).toEqual({ ok: true, value: 12 });
    expect(calculate("=VALUE(A2)+2*3", { A2: "08" })).toEqual({ ok: true, value: 14 });
    expect(calculate("=12+A2", { A2: "08" }).ok).toBe(false);
    expect(calculate("=0/0", {}).ok).toBe(false);
    expect(calculate("=window.alert(1)", {}).ok).toBe(false);
  });
  it("copies each axis independently without translating quoted text", () => {
    expect(copyFormula('=A1+$A1+A$1+$A$1&"A1"', 1, 1)).toBe('=B2+$A2+B$1+$A$1&"A1"');
    expect(() => copyFormula("=A1", 0, -1)).toThrow(/超出/);
  });
  it("checks conditions, lookup misses, strict dates and formula errors", () => {
    const sheet = { A1: 59, A2: 60, A3: 80, B1: 12, B2: 4, B3: 8 };
    expect(calculate('=COUNTIF(A1:A3,">=60")', sheet)).toEqual({ ok: true, value: 2 });
    expect(calculate('=SUMIF(A1:A3,">=60",B1:B3)', sheet)).toEqual({ ok: true, value: 12 });
    expect(calculate('=SUMIF(A1:A2,">=60",B1:C1)', sheet).ok).toBe(false);
    expect(calculate('=IF(FALSE,1/0,"OK")', {}).ok).toBe(true);
    expect(calculate("=VLOOKUP(60,A1:B3,2,FALSE)", sheet)).toEqual({ ok: true, value: 4 });
    expect(calculate("=VLOOKUP(61,A1:B3,2,FALSE)", sheet).ok).toBe(false);
    expect(calculate("=DATE(2025,2,29)", {}).ok).toBe(false);
    expect(calculate('=TEXT(DATE(2024,2,29),"yyyy-mm-dd")', {})).toEqual({ ok: true, value: "2024-02-29" });
  });
});

const benchAnswers: Record<BenchKey, Record<string, string>> = {
  cleaning: { trim: "on", strict: "on", dedup: "on" },
  pivot: { group: "team", metric: "sum" },
  chart: { group: "team", kind: "bar" },
  script: { limit: "3", width: "2" },
  triggers: { kind: "clock", hour: "8", dedup: "on" },
  gemini: { data: "summary", request: exampleRequest },
  dashboard: { team: "science", day: "later", metric: "sum" },
  pipeline: { load: "upsert" },
};
describe("E data and automation", () => {
  for (const key of Object.keys(benchAnswers) as BenchKey[]) it(key + " gives measurable results and rejects the default", () => {
    const bench = benches[key];
    const initial = Object.fromEntries(bench.fields.map(field => [field.key, field.initial]));
    expect(passed(bench.run(initial))).toBe(false);
    expect(passed(bench.run(benchAnswers[key]))).toBe(true);
  });
  it("preserves real zero and traces duplicate and invalid amounts", () => {
    const clean = cleanRows(rawRows, checkedCleaning);
    expect(clean.rows.find(r => r.id === "s4")?.amount).toBe(0);
    expect(clean.rejected).toEqual([{ id: "s2", reason: "重复单号" }, { id: "s5", reason: "金额无效" }, { id: "s6", reason: "金额无效" }]);
    expect(summarize(clean.rows, "team", "sum").find(p => p.key === "科学")?.value).toBe(21);
    expect(summarize(clean.rows, "team", "count").find(p => p.key === "科学")?.value).toBe(2);
  });
  it("blocks private and malformed requests, recalculates public response by scope", () => {
    expect(simulateGemini(exampleRequest, "private")).toHaveProperty("error");
    expect(simulateGemini("{", "summary")).toHaveProperty("error");
    expect(simulateGemini("null", "summary")).toHaveProperty("error");
    expect(simulateGemini(exampleRequest, "summary")).toMatchObject({ result: { amount: 34, rows: 5 } });
    expect(simulateGemini(exampleRequest, "later")).toMatchObject({ result: { amount: 17, rows: 3 } });
  });
  it("separates clock runs and duplicate retries while allowing next-day keys", () => {
    const records = dispatchTriggers("clock", 8, true);
    expect(records.filter(row => row.ran).map(row => row.key)).toEqual(["周一报告", "周二报告"]);
    expect(records.filter(row => row.duplicate)).toHaveLength(1);
    expect(dispatchTriggers("clock", 8, false).filter(row => row.ran)).toHaveLength(3);
  });
  it("binds approvals to revisions and emits exactly one receipt after a stale rejection", () => {
    const take = (actions: FlowAction[]) => actions.reduce(advanceFlow, initialFlow());
    expect(take(["preview", "edit", "deliver"]).staleBlocked).toBe(false);
    const stale = take(["preview", "approve", "edit", "deliver"]);
    expect(stale.staleBlocked).toBe(true);
    expect(stale.receipts).toEqual([]);
    const done = (["preview", "approve", "deliver", "deliver"] as FlowAction[]).reduce(advanceFlow, stale);
    expect(done.receipts).toEqual([{ revision: 2, amount: 35 }]);
    expect(flowPassed(done)).toBe(true);
  });
  it("drops variables on restart and requires a real recovery", () => {
    const runAll = (["load", "clean", "summarize"] as NotebookAction[]);
    const empty = initialNotebook();
    expect(runCell(runCell(empty, "restart"), "summarize").missingAfterRestart).toBe(false);
    const first = runAll.reduce(runCell, empty);
    expect(first.sum).toBe(34);
    const cleared = runCell(first, "restart");
    expect(cleared.sum).toBeNull();
    expect(cleared.clean).toBeNull();
    expect(notebookPassed(runAll.reduce(runCell, runCell(cleared, "summarize")))).toBe(true);
  });
  it("keeps corrected data idempotent, then builds a CSV from validated grouped data", () => {
    expect(pipeline("append").twice).toHaveLength(9);
    const rows = pipeline("upsert");
    expect(rows.once).toEqual(rows.twice);
    expect(total(rows.twice)).toBe(38);
    expect(prepareReport({ ...checkedCleaning, dedup: false }).passing).toBe(false);
    const report = prepareReport(checkedCleaning);
    expect(report).toMatchObject({ passing: true, count: 5, amount: 34, revised: 37 });
    expect(reportCsv(report).trim().split("\r\n")).toEqual(["队名,金额", ...report.table.map(p => p.key + "," + p.value), "合计,34"]);
  });
});

it("registers and illustrates all sixteen Foundation courses, with draft quality and links", () => {
  const courses = coursesFor("Foundation", "E");
  expect(courses).toHaveLength(16);
  expect(routeView("e")?.units.map(unit => unit.nodes.length)).toEqual([4, 4, 4, 4]);
  expect(routeView("e", "Intermediate")?.nodes.every(node => !node.available)).toBe(true);
  expect(routeView("e", "Advanced")?.nodes.every(node => !node.available)).toBe(true);
  const lessons = courses.map(course => liveLessonFor(course));
  expect(lessons[0]?.id).toBe("e01-formula-basics");
  for (const [index, lesson] of lessons.entries()) {
    if (!lesson?.art) throw new Error("Missing E illustration or lesson " + index);
    expect(lesson.quality).toEqual({ state: "draft" });
    expect(lesson.sources).toHaveLength(2);
    expect(lesson.blocks.map(block => block.type)).toEqual(["hook", "explain", "explain", "explain", "sim", "sim", "quiz", "transfer", "summary"]);
    expect(lesson.blocks.filter(block => block.type === "sim").map(block => block.mode)).toEqual(["free", "challenge"]);
    expect(lesson.blocks.find(block => block.type === "quiz")?.items).toHaveLength(3);
    expect(lesson.blocks.at(-1)).toMatchObject({ next: lessons[index + 1]?.id });
    const art = readFileSync("public/art/" + lesson.art);
    expect([art.readUInt32BE(16), art.readUInt32BE(20)]).toEqual([1600, 900]);
  }
});
