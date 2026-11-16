import { describe, it, expect } from "vitest";
import {
  checkSource, countLines, describeError, explainPythonError, firstDiff,
  gradeChecks, normalizeOutput, programFor, type CodeCheck,
} from "../src/grading/code";

describe("normalizeOutput", () => {
  it("ignores trailing spaces, CRLF and trailing blank lines", () => {
    expect(normalizeOutput("a  \r\nb\n\n")).toBe("a\nb");
  });
  it("keeps blank lines in the middle", () => {
    expect(normalizeOutput("a\n\nb")).toBe("a\n\nb");
  });
});

describe("programFor", () => {
  it("returns the code untouched without a harness", () => {
    expect(programFor("print(1)\n", { label: "x", expect: "1" })).toBe("print(1)\n");
  });
  it("appends the harness after the learner code, keeping learner line numbers", () => {
    const p = programFor("x = 1\n\n\n", { label: "x", expect: "", harness: "print(x)" });
    expect(p).toBe("x = 1\nprint(x)\n");
    expect(p.split("\n")[0]).toBe("x = 1");
  });
});

describe("checkSource", () => {
  it("returns the first unmet message", () => {
    const rules = [
      { pattern: "\\bfor\\b", message: "要用 for" },
      { pattern: "range", message: "要用 range" },
    ];
    expect(checkSource("print(1)", rules)).toBe("要用 for");
    expect(checkSource("for i in x: pass", rules)).toBe("要用 range");
    expect(checkSource("for i in range(3): pass", rules)).toBe(null);
  });
  it("no rules means no requirement", () => {
    expect(checkSource("anything", undefined)).toBe(null);
  });
});

describe("firstDiff", () => {
  it("single line", () => {
    expect(firstDiff("60", "")).toBe("期望输出「60」，你的程序输出「（没有输出）」。");
    expect(firstDiff("60", "6")).toContain("「6」");
  });
  it("multi line points at the first differing line", () => {
    expect(firstDiff("a\nb\nc", "a\nx\nc")).toBe("第 2 行不一样：期望「b」，你的是「x」。");
  });
  it("missing lines are named", () => {
    expect(firstDiff("a\nb", "a")).toContain("没有这一行");
  });
});

describe("explainPythonError", () => {
  const nameErr = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 599, in eval_code_async
    await CodeRunner(
  File "<exec>", line 3, in <module>
NameError: name 'totl' is not defined`;
  it("reads type, message and the learner's line", () => {
    const e = explainPythonError(nameErr, 5);
    expect(e.type).toBe("NameError");
    expect(e.message).toBe("name 'totl' is not defined");
    expect(e.line).toBe(3);
    expect(e.hint).toContain("totl");
  });
  it("an error past the learner's last line is blamed on the check program", () => {
    const e = explainPythonError(nameErr, 2);
    expect(e.line).toBe(null);
    expect(e.hint).toContain("检查程序");
  });
  it("syntax errors have no traceback frames beyond the file line", () => {
    const raw = `  File "<exec>", line 2
    print("a"
         ^
SyntaxError: '(' was never closed`;
    const e = explainPythonError(raw, 4);
    expect(e.type).toBe("SyntaxError");
    expect(e.line).toBe(2);
  });
  it("unknown shapes still give a hint", () => {
    const e = explainPythonError("something odd happened", 3);
    expect(e.hint.length).toBeGreaterThan(0);
  });
  it("describeError reads naturally", () => {
    expect(describeError(nameErr, 5)).toContain("第 3 行：NameError");
  });
});

describe("gradeChecks", () => {
  const checks: CodeCheck[] = [
    { label: "a", expect: "60" },
    { label: "b", expect: "x\ny", hint: "提示" },
  ];
  it("passes when every output matches (ignoring trailing whitespace)", () => {
    const r = gradeChecks(checks, [
      { stdout: "60\n", error: null, timedOut: false },
      { stdout: "x \ny\n\n", error: null, timedOut: false },
    ], 3);
    expect(r.ok).toBe(true);
  });
  it("fails with a precise reason and the check's hint", () => {
    const r = gradeChecks(checks, [
      { stdout: "60", error: null, timedOut: false },
      { stdout: "x\nz", error: null, timedOut: false },
    ], 3);
    expect(r.ok).toBe(false);
    expect(r.results[1]!.detail).toContain("第 2 行");
    expect(r.results[1]!.detail).toContain("提示");
  });
  it("a runtime error or timeout fails only that check, with its own message", () => {
    const r = gradeChecks(checks, [
      { stdout: "", error: "NameError: name 'q' is not defined", timedOut: false },
      { stdout: "", error: null, timedOut: true },
    ], 3);
    expect(r.results[0]!.detail).toContain("NameError");
    expect(r.results[1]!.detail).toContain("停止");
  });
  it("checks that were never run fail; an empty list is never a pass", () => {
    const r = gradeChecks(checks, [{ stdout: "60", error: null, timedOut: false }], 3);
    expect(r.ok).toBe(false);
    expect(r.results[1]!.detail).toContain("没有运行");
    expect(gradeChecks([], [], 0).ok).toBe(false);
  });
});

describe("countLines", () => {
  it("ignores trailing newlines", () => {
    expect(countLines("a\nb\n\n")).toBe(2);
    expect(countLines("")).toBe(0);
  });
});
