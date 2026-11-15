import { describe, it, expect } from "vitest";
import {
  adderGates, asBinary, circuitOutput, expectedAdd, runTests, testFeedback, type AdderGate,
} from "../src/grading/adder";
import type { Bit } from "../src/grading/gates";

const bits: Bit[] = [0, 1];

describe("expectedAdd", () => {
  it("matches binary addition for all four cases", () => {
    expect(asBinary(expectedAdd(0, 0))).toBe("00");
    expect(asBinary(expectedAdd(0, 1))).toBe("01");
    expect(asBinary(expectedAdd(1, 0))).toBe("01");
    expect(asBinary(expectedAdd(1, 1))).toBe("10");
  });
  it("carry*2 + sum always equals a + b", () => {
    for (const a of bits) for (const b of bits) {
      const r = expectedAdd(a, b);
      expect(r.carry * 2 + r.sum).toBe(a + b);
    }
  });
});

describe("circuit tests", () => {
  it("XOR for the sum and AND for the carry passes every case", () => {
    const res = runTests("xor", "and");
    expect(res.every((r) => r.pass)).toBe(true);
    expect(testFeedback(res).ok).toBe(true);
  });
  it("exactly one of the 9 gate combinations is correct", () => {
    const good: string[] = [];
    for (const s of adderGates) for (const c of adderGates)
      if (runTests(s, c).every((r) => r.pass)) good.push(`${s}/${c}`);
    expect(good).toEqual(["xor/and"]);
  });
  it("OR for the sum fails only on 1 + 1, and the feedback blames the sum", () => {
    const res = runTests("or", "and");
    expect(res.filter((r) => !r.pass).length).toBe(1);
    const fb = testFeedback(res);
    expect(fb.ok).toBe(false);
    expect(fb.message).toContain("A=1，B=1");
    expect(fb.message).toContain("「和」这一位不对");
    expect(fb.message.includes("「进位」")).toBe(false);
  });
  it("AND for the sum is wrong on 01, 10 and 11 (three cases)", () => {
    const fb = testFeedback(runTests("and", "and"));
    expect(fb.message).toContain("有 3 种输入不对");
    expect(fb.message).toContain("A=0，B=1");
  });
  it("OR for both reports 3 failures and names the carry first", () => {
    const fb = testFeedback(runTests("or", "or"));
    expect(fb.message).toContain("有 3 种输入不对");
    expect(fb.message).toContain("A=0，B=1");
    expect(fb.message).toContain("「进位」这一位不对");
  });
  it("every wrong combination produces a specific message with a concrete case", () => {
    for (const s of adderGates) for (const c of adderGates) {
      if (s === "xor" && c === "and") continue;
      const fb = testFeedback(runTests(s as AdderGate, c as AdderGate));
      expect(fb.ok).toBe(false);
      expect(fb.message).toContain("应该得到");
      expect(fb.message).toContain("你的电路得到");
    }
  });
  it("circuitOutput evaluates the chosen gates", () => {
    expect(circuitOutput("xor", "and", 1, 1)).toEqual({ sum: 0, carry: 1 });
    expect(circuitOutput("or", "or", 1, 0)).toEqual({ sum: 1, carry: 1 });
  });
  it("transfer: 255 + 255 = 510 needs 9 bits", () => {
    expect(255 + 255).toBe(510);
    expect(510 < 2 ** 8).toBe(false);
    expect(510 < 2 ** 9).toBe(true);
  });
});
