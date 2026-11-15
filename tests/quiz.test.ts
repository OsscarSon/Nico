import { describe, it, expect } from "vitest";
import { gradeChoice, gradeNumber, parseIntegerInput } from "../src/grading/quiz";
import { getLesson } from "../src/content";

const quiz = getLesson("a01-binary")!.blocks.find((b) => b.type === "quiz");
if (quiz?.type !== "quiz") throw new Error("a01 has no quiz");

describe("quiz grading", () => {
  it("returns the explanation for a correct choice", () => {
    const item = quiz.items[0]!;
    const r = gradeChoice(item, item.answer);
    expect(r.correct).toBe(true);
    expect(r.message).toBe(item.why);
  });
  it("returns the diagnostic hint for each wrong choice", () => {
    for (const item of quiz.items)
      item.options.forEach((_, idx) => {
        if (idx === item.answer) return;
        const r = gradeChoice(item, idx);
        expect(r.correct).toBe(false);
        expect(r.message).toBe(item.wrongHints[String(idx)]);
      });
  });
  it("parses integers with spaces and thousands separators", () => {
    expect(parseIntegerInput(" 1,024 ")).toBe(1024);
    expect(parseIntegerInput("1 024")).toBe(1024);
    expect(parseIntegerInput("1，024")).toBe(1024);
  });
  it("rejects non-integer input", () => {
    for (const bad of ["", "abc", "1.5", "2^10", "1e3", "--1"])
      expect(parseIntegerInput(bad)).toBe(null);
  });
  it("grades numeric answers and flags invalid input separately", () => {
    expect(gradeNumber(1024, "1024")).toEqual({ valid: true, correct: true });
    expect(gradeNumber(1024, "512")).toEqual({ valid: true, correct: false });
    expect(gradeNumber(1024, "很多")).toEqual({ valid: false, correct: false });
  });
});
