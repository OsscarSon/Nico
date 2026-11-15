import { describe, it, expect } from "vitest";
import {
  allGates, evalGate, gateInfo, identifyFeedback, inputRows, rowKey, truthTable, type Bit,
} from "../src/grading/gates";

const outs = (g: Parameters<typeof truthTable>[0]) => truthTable(g).map((r) => r.out);

describe("truth tables", () => {
  it("AND is 0,0,0,1", () => expect(outs("and")).toEqual([0, 0, 0, 1]));
  it("OR is 0,1,1,1", () => expect(outs("or")).toEqual([0, 1, 1, 1]));
  it("XOR is 0,1,1,0", () => expect(outs("xor")).toEqual([0, 1, 1, 0]));
  it("NOT is 1,0", () => expect(outs("not")).toEqual([1, 0]));
  it("two-input gates have 4 rows and NOT has 2", () => {
    for (const g of allGates)
      expect(inputRows(g).length).toBe(gateInfo[g].arity === 1 ? 2 : 4);
  });
  it("XOR equals addition modulo 2", () => {
    for (const a of [0, 1] as Bit[]) for (const b of [0, 1] as Bit[])
      expect(evalGate("xor", a, b)).toBe(((a + b) % 2) as Bit);
  });
  it("AND equals multiplication and OR equals max", () => {
    for (const a of [0, 1] as Bit[]) for (const b of [0, 1] as Bit[]) {
      expect(evalGate("and", a, b)).toBe((a * b) as Bit);
      expect(evalGate("or", a, b)).toBe(Math.max(a, b) as Bit);
    }
  });
  it("NOT ignores any second input", () => {
    expect(evalGate("not", 0, 1)).toBe(1);
    expect(evalGate("not", 1, 1)).toBe(0);
  });
  it("transfer answer: there are 2^4 = 16 possible two-input truth tables", () => {
    expect(2 ** 4).toBe(16);
  });
});

describe("identifyFeedback", () => {
  const allKeys = (g: Parameters<typeof inputRows>[0]) => inputRows(g).map(rowKey);

  it("accepts the right gate", () => {
    expect(identifyFeedback("xor", "xor", allKeys("xor")).ok).toBe(true);
  });
  it("names a concrete contradicting row for a wrong guess", () => {
    const r = identifyFeedback("or", "and", allKeys("or"));
    expect(r.ok).toBe(false);
    // 第一个矛盾的行是 A=0,B=1：AND 应该是 0，实际 OR 给出 1
    expect(r.message).toContain("A=0，B=1");
    expect(r.message).toContain("应该输出 0");
    expect(r.message).toContain("你看到的是 1");
  });
  it("every pair of distinct two-input gates differs on some row, so feedback is never vague", () => {
    const two = allGates.filter((g) => gateInfo[g].arity === 2);
    for (const truth of two) for (const guess of two) {
      if (truth === guess) continue;
      const r = identifyFeedback(truth, guess, allKeys(truth));
      expect(r.ok).toBe(false);
      expect(r.message.includes("还不能确定")).toBe(false);
    }
  });
  it("only mentions rows the learner has actually observed", () => {
    // 只看过 00：OR 和 AND 在这一行一样，所以还不能下结论
    const r = identifyFeedback("or", "and", ["00"]);
    expect(r.message).toContain("还不能确定");
  });
  it("explains input-count mismatches without naming the answer", () => {
    const a = identifyFeedback("not", "and", allKeys("not"));
    expect(a.message).toContain("只有一个输入");
    expect(a.message.includes("NOT")).toBe(false);
    const b = identifyFeedback("or", "not", allKeys("or"));
    expect(b.message).toContain("有两个输入");
    expect(b.message.includes("OR")).toBe(false);
  });
});
