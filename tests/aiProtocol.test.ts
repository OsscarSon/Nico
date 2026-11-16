import { describe, it, expect } from "vitest";
import { aiRequestSchema, critiqueOutputSchema, LIMITS } from "../src/ai/protocol";
import { ERROR_TEXT, HTTP_STATUS } from "../src/ai/messages";

const ok = (x: unknown) => aiRequestSchema.safeParse(x).success;

describe("request schema", () => {
  it("accepts the three request kinds", () => {
    expect(ok({ kind: "tutor", lessonTitle: "二进制", context: "…", question: "为什么？" })).toBe(true);
    expect(ok({ kind: "critique", prompt: "写个邮件", local: [{ element: "task", present: true }] })).toBe(true);
    expect(ok({ kind: "run", prompt: "写个邮件" })).toBe(true);
  });
  it("rejects unknown kinds, empty text and wrong types", () => {
    expect(ok({ kind: "chat", prompt: "x" })).toBe(false);
    expect(ok({ kind: "run", prompt: "" })).toBe(false);
    expect(ok({ kind: "run", prompt: 123 })).toBe(false);
    expect(ok({})).toBe(false);
  });
  it("enforces length limits", () => {
    expect(ok({ kind: "run", prompt: "字".repeat(LIMITS.prompt) })).toBe(true);
    expect(ok({ kind: "run", prompt: "字".repeat(LIMITS.prompt + 1) })).toBe(false);
    expect(ok({ kind: "tutor", lessonTitle: "t", context: "", question: "问".repeat(LIMITS.question + 1) })).toBe(false);
  });
  it("limits history to the last few turns", () => {
    const turn = { role: "user", text: "hi" };
    const base = { kind: "tutor", lessonTitle: "t", context: "", question: "q" };
    expect(ok({ ...base, history: Array(LIMITS.historyTurns).fill(turn) })).toBe(true);
    expect(ok({ ...base, history: Array(LIMITS.historyTurns + 1).fill(turn) })).toBe(false);
    expect(ok({ ...base, history: [{ role: "system", text: "x" }] })).toBe(false);
  });
  it("rejects an element id that is not one of the six", () => {
    expect(ok({ kind: "critique", prompt: "x", local: [{ element: "tone", present: true }] })).toBe(false);
  });
});

describe("critique output schema", () => {
  const good = { summary: "不错", strengths: [], fixes: [{ element: "context", advice: "补上读者" }], rewrite: "新指令" };
  it("accepts a well-formed critique", () => {
    expect(critiqueOutputSchema.safeParse(good).success).toBe(true);
  });
  it("rejects missing fields, unknown elements and oversized lists", () => {
    expect(critiqueOutputSchema.safeParse({ ...good, rewrite: undefined }).success).toBe(false);
    expect(critiqueOutputSchema.safeParse({ ...good, fixes: [{ element: "x", advice: "y" }] }).success).toBe(false);
    expect(critiqueOutputSchema.safeParse({ ...good, strengths: ["a", "b", "c", "d", "e"] }).success).toBe(false);
  });
});

describe("error copy", () => {
  it("every error code has learner-facing text and an HTTP status", () => {
    for (const code of Object.keys(ERROR_TEXT) as (keyof typeof ERROR_TEXT)[]) {
      expect(ERROR_TEXT[code].length).toBeGreaterThan(0);
      expect(HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });
  it("error text never blames the learner's data or leaks internals", () => {
    for (const t of Object.values(ERROR_TEXT)) {
      expect(t).not.toMatch(/api key|apikey|密钥|stack|undefined/i);
    }
  });
});
