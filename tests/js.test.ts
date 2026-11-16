import { describe, it, expect } from "vitest";
import vm from "node:vm";
import { parse } from "acorn";
import { instrumentLoops, JsSyntaxError, type Parse } from "../src/runtime/loopGuard";
import { buildJsDocument, shimSource } from "../src/runtime/js";
import { describeJsError } from "../src/grading/js";

const P = parse as unknown as Parse;

/** 在一个假的"iframe 全局环境"里运行真正的 shim 和（加了保护的）学习者代码。 */
function runInShim(code: string, budgetMs = 150, instrument = true) {
  const messages: any[] = [];
  const ctx: any = {
    parent: { postMessage: (m: unknown) => messages.push(m) },
    console: {},
    queueMicrotask,
    Date,
    JSON,
    Error,
    Array,
    String,
    Number,
    Math,
    addEventListener: () => {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(shimSource("tok", budgetMs), ctx);
  let thrown: string | null = null;
  const src = instrument ? instrumentLoops(code, P) : code;
  const t0 = Date.now();
  try {
    vm.runInContext(src, ctx, { timeout: 1000 }); // 兜底：就算保护失效，测试也不会卡死
  } catch (e) {
    thrown = (e as Error).message;
  }
  ctx.__nicoDone();
  const done = messages.find((m) => m.type === "done");
  return { lines: [...done.lines] as string[], thrown, ms: Date.now() - t0, done };
}

describe("instrumentLoops: behaviour is unchanged", () => {
  const programs: Record<string, string> = {
    for: "let s = 0; for (let i = 1; i <= 5; i++) { s += i; } console.log(s);",
    "while + break/continue": "let i = 0, out = []; while (true) { i++; if (i % 2) continue; if (i > 8) break; out.push(i); } console.log(out);",
    "do-while": "let n = 0; do { n++; } while (n < 3); console.log(n);",
    "brace-less nested": "let c = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c++; console.log(c);",
    "brace-less while": "let k = 0; while (k < 4) k++; console.log(k);",
    "empty body": "let q = 0; for (; q < 3; q++); console.log(q);",
    "for-of / for-in": "const o = {a:1,b:2}; const keys = []; for (const k in o) keys.push(k); let t = 0; for (const v of [1,2,3]) t += v; console.log(keys, t);",
    labels: "let r = []; outer: for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (j === 2) continue outer; r.push(i + '' + j); } } console.log(r);",
    "loops in functions": "function f(n){ let s = 0; for (let i = 0; i < n; i++) s += i; return s; } const g = (n) => { let x = 0; while (x < n) x++; return x; }; console.log(f(5), g(7));",
    "loop with string/comment lookalikes": "const s = 'while (true) { }'; // for (;;) {}\n/* while(1){} */ let z = 0; for (let i = 0; i < 2; i++) { z++; } console.log(s, z);",
    "else-if dangling": "let a = 0; if (a) for (;;) break; else for (let i = 0; i < 2; i++) a++; console.log(a);",
  };
  for (const [name, code] of Object.entries(programs)) {
    it(name, () => {
      const plain = runInShim(code, 150, false);
      const guarded = runInShim(code, 150, true);
      expect(plain.thrown).toBe(null);
      expect(guarded.thrown).toBe(null);
      expect(guarded.lines).toEqual(plain.lines);
      expect(guarded.lines.length).toBeGreaterThan(0);
    });
  }
  it("keeps the number of lines the same (so error line numbers still match)", () => {
    const code = "for (let i = 0; i < 2; i++)\n  console.log(i);\nwhile (false)\n{\n}\n";
    expect(instrumentLoops(code, P).split("\n").length).toBe(code.split("\n").length);
  });
});

describe("instrumentLoops: endless loops are stopped", () => {
  const endless: Record<string, string> = {
    "while(true)": "while (true) { }",
    "for(;;)": "for (;;) { }",
    "do-while": "do { } while (true);",
    "brace-less": "while (true);",
    "nested brace-less": "while (true) for (;;) ;",
    "forgot to change the variable": "let i = 0; while (i < 10) { console.log('x'); }",
    "inside a function that is called": "function spin(){ while (1) {} } spin();",
    "caught by try/catch inside the loop": "while (true) { try { while (true) {} } catch (e) {} }",
  };
  for (const [name, code] of Object.entries(endless)) {
    it(name, () => {
      const r = runInShim(code, 150, true);
      expect(r.ms).toBeLessThan(3000);
      expect(r.thrown).toContain("__NICO_LOOP__");
    });
  }
  it("without the guard the same code would hang (the test harness's own timeout catches it)", () => {
    const r = runInShim("while (true) { }", 150, false);
    expect(r.thrown).toContain("timed out");
  }, 15000);
  it("a long but finite loop is not stopped", () => {
    const r = runInShim("let s = 0; for (let i = 0; i < 2000000; i++) { s += i; } console.log(s);", 2000, true);
    expect(r.thrown).toBe(null);
    expect(r.lines).toEqual(["1999999000000"]);
  });
  it("the budget is per turn, not forever: a later turn gets a fresh budget", async () => {
    const messages: any[] = [];
    const ctx: any = { parent: { postMessage: (m: unknown) => messages.push(m) }, console: {}, queueMicrotask, Date, JSON, Error, Array, String, addEventListener: () => {} };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(shimSource("t", 120), ctx);
    const quick = instrumentLoops("for (let i = 0; i < 1000; i++) {}", P);
    vm.runInContext(quick, ctx);
    await new Promise((r) => setTimeout(r, 200)); // 过了预算时间，但是新的一轮
    vm.runInContext(quick, ctx);
    ctx.__nicoDone();
    expect(messages.find((m) => m.type === "done").error).toBe(null);
  });
});

describe("instrumentLoops: syntax errors", () => {
  it("throws JsSyntaxError with the line", () => {
    try {
      instrumentLoops("let a = 1;\nlet b = (;\n", P);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e instanceof JsSyntaxError).toBe(true);
      expect((e as JsSyntaxError).line).toBe(2);
      expect((e as JsSyntaxError).message).not.toContain("(2:");
    }
  });
});

describe("the iframe shim", () => {
  it("formats console output deterministically", () => {
    const r = runInShim("console.log(1, 'a', [1,2], {a:1}, undefined, null, true); console.log('x'); console.log(function f(){});", 150, true);
    expect(r.lines).toEqual(['1 a [1,2] {"a":1} undefined null true', "x", "[Function]"]);
  });
  it("alert prints instead of opening a dialog", () => {
    const r = runInShim("alert('hi')", 150, true);
    expect(r.lines).toEqual(["[alert] hi"]);
  });
  it("caps very long output", () => {
    const r = runInShim("for (let i = 0; i < 2000; i++) console.log('line ' + i);", 2000, true);
    expect(r.lines.length).toBe(500);
    expect(r.done.truncated).toBe(true);
  });
});

describe("buildJsDocument", () => {
  it("firstLine points at the first line of the learner's code inside the document", () => {
    const { doc, firstLine } = buildJsDocument({ page: "<p>x</p>\n<p>y</p>", code: "const A = 1;\nconst B = 2;", harness: "console.log(A)", token: "t", budgetMs: 100, settleMs: 10 });
    expect(doc.split("\n")[firstLine - 1]).toBe("const A = 1;");
    expect(doc.split("\n")[firstLine]).toBe("const B = 2;");
  });
  it("forbids network access and keeps the learner's page before the scripts", () => {
    const { doc } = buildJsDocument({ page: "<button id=b></button>", code: "", harness: "", token: "t", budgetMs: 100, settleMs: 10 });
    expect(doc).toContain("default-src 'none'");
    expect(doc.indexOf('<button id=b>')).toBeLessThan(doc.indexOf("<script>\n"));
  });
});

describe("describeJsError", () => {
  it("names the line, the error and a hint", () => {
    const s = describeJsError({ name: "ReferenceError", message: "totl is not defined", line: 3 });
    expect(s).toContain("第 3 行");
    expect(s).toContain("totl");
  });
  it("a TypeError from a missing element points at the selector", () => {
    expect(describeJsError({ name: "TypeError", message: "Cannot set properties of null (setting 'textContent')", line: 1 })).toContain("querySelector");
  });
  it("loop timeouts get their own message and no raw error", () => {
    expect(describeJsError({ name: "LoopTimeout", message: "", line: 2 })).toContain("停不下来的循环");
  });
});
