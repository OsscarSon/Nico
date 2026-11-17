import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { lessons, validateContent } from "../src/content";
import { curriculum, liveLessonFor } from "../src/content/academy";
import { lessonSchema } from "../src/content/schema";
import { gradeChoice } from "../src/grading/quiz";
import protectedFiles from "../docs/p3a/PROTECTED_BASELINE.json";
describe("P3-A teaching integration and protected baseline", () => {
  for (const id of ["b13-fetch-json", "b16-github", "b17-pages"]) it(`${id}: complete sourced draft with free operation, challenge and diagnostic assessment`, () => {
    const l = lessons[id]!; expect(lessonSchema.safeParse(l).success).toBe(true); expect(l.quality).toEqual({ state: "draft" }); expect(l.artPending).toBe(true); expect(l.art).toBeUndefined();
    expect(l.blocks.filter(b => b.type === "explain").length).toBeGreaterThanOrEqual(3);
    expect(l.blocks.filter(b => b.type === "sim").map(b => b.mode)).toEqual(["free", "challenge"]);
    const q = l.blocks.find(b => b.type === "quiz"); if (q?.type !== "quiz") throw Error("missing quiz"); expect(q.items).toHaveLength(3);
    for (const item of q.items) item.options.forEach((_, i) => { expect(gradeChoice(item, i).correct).toBe(i === item.answer); expect(gradeChoice(item, i).message.length).toBeGreaterThan(10); });
    expect(l.blocks.some(b => b.type === "transfer")).toBe(true); expect(l.blocks.at(-1)?.type).toBe("summary"); expect(l.sources.length).toBeGreaterThanOrEqual(3);
    const c = curriculum.find(c => c.id === id.split("-")[0]!.toUpperCase())!; expect(c.status).toBe("live"); expect(liveLessonFor(c)?.id).toBe(id);
    expect(lessonSchema.safeParse({ ...l, quality: { state: "published" } }).success).toBe(false);
  });
  it("keeps all old art/course/grading/simulator/runtime/AI/progress/P2 bytes unchanged", () => {
    for (const [file, hash] of Object.entries(protectedFiles)) expect(createHash("sha256").update(readFileSync(file)).digest("hex"), file).toBe(hash);
    expect(validateContent()).toEqual([]);
  });
});
