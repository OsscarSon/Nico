import { describe, it, expect } from "vitest";
import { buildLessonContext } from "../src/ai/context";
import { lessons } from "../src/content";
import { LIMITS } from "../src/ai/protocol";

describe("lesson context for the AI tutor", () => {
  const all = Object.values(lessons);

  it("fits the request limit for every lesson", () => {
    for (const l of all) expect(Array.from(buildLessonContext(l)).length).toBeLessThanOrEqual(LIMITS.context);
  });

  it("includes the objectives and explanation titles", () => {
    const c05 = lessons["c05-prompt-structure"]!;
    const ctx = buildLessonContext(c05);
    expect(ctx).toContain("本课目标");
    expect(ctx).toContain("六要素（上）：任务、背景、格式");
  });

  it("never includes quiz or transfer answers, explanations or hints", () => {
    for (const l of all) {
      const ctx = buildLessonContext(l, 100_000);
      for (const b of l.blocks) {
        if (b.type === "quiz")
          for (const item of b.items) {
            expect(ctx.includes(item.q)).toBe(false);
            expect(ctx.includes(item.why)).toBe(false);
            for (const h of Object.values(item.wrongHints)) expect(ctx.includes(h)).toBe(false);
          }
        if (b.type === "transfer") {
          expect(ctx.includes(b.prompt)).toBe(false);
          expect(ctx.includes(b.why)).toBe(false);
          if (b.hint) expect(ctx.includes(b.hint)).toBe(false);
        }
      }
    }
  });

  it("strips bold markers", () => {
    for (const l of all) expect(buildLessonContext(l, 100_000)).not.toContain("**");
  });

  it("truncates at block boundaries and still returns something for a tiny limit", () => {
    const l = lessons["a01-binary"]!;
    const short = buildLessonContext(l, 120);
    expect(Array.from(short).length).toBeLessThanOrEqual(120);
    expect(short.length).toBeGreaterThan(0);
  });
});
