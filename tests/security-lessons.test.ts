import { describe, it, expect } from "vitest";
import { lessons, nextAvailableAfter, validateContent } from "../src/content";
import { tracks } from "../src/content/catalog";
import { curriculum, liveLessonFor } from "../src/content/academy";
import { lessonSchema } from "../src/content/schema";
import { gradeChoice, gradeNumber } from "../src/grading/quiz";
import { belongsToDomain } from "../src/grading/phishing";
describe("A18–A20 teaching and whole A-route integrity", () => {
  for (const [id, sim] of [["a18-passwords", "password"], ["a19-phishing", "phishing"], ["a20-least-privilege", "privilege"]]) it(`${id} is a complete, sourced draft without invented trials`, () => {
    const l = lessons[id!]!; expect(lessonSchema.safeParse(l).success).toBe(true); expect(l.quality).toEqual({ state: "draft" }); expect(l.artPending).toBeUndefined(); expect(l.art).toBe(`lesson-${id}.png`);
    expect(l.blocks.filter(b => b.type === "explain")).toHaveLength(4); expect(l.blocks.filter(b => b.type === "sim").map(b => [b.sim, b.mode])).toEqual([[sim, "free"], [sim, "challenge"]]);
    const q = l.blocks.find(b => b.type === "quiz"); if (q?.type !== "quiz") throw Error("missing quiz"); expect(q.items).toHaveLength(3);
    for (const item of q.items) item.options.forEach((_, i) => { const r = gradeChoice(item, i); expect(r.correct).toBe(i === item.answer); expect(r.message.length).toBeGreaterThan(15); });
    const t = l.blocks.find(b => b.type === "transfer"); if (t?.type !== "transfer") throw Error("missing transfer");
    expect(gradeNumber(t.answer, "x").valid).toBe(false); expect(gradeNumber(t.answer, String(t.answer + 1)).correct).toBe(false); expect(gradeNumber(t.answer, String(t.answer)).correct).toBe(true);
    expect(l.sources.length).toBeGreaterThanOrEqual(3); expect(lessonSchema.safeParse({ ...l, quality: { state: "published" } }).success).toBe(false);
  });
  it("opens all original 20 IDs, keeps every prerequisite backward and connects summaries through A20", () => {
    const a = tracks.find(t => t.id === "a")!.lessons; expect(a).toHaveLength(20); expect(validateContent()).toEqual([]);
    for (let i = 0; i < a.length; i++) {
      const c = a[i]!, l = lessons[c.id]!; expect(c.id.startsWith(`a${String(i + 1).padStart(2, "0")}-`)).toBe(true); expect(c.status).toBe("available"); expect(lessonSchema.safeParse(l).success).toBe(true);
      const record = curriculum.find(item => item.id === `A${String(i + 1).padStart(2, "0")}`)!; expect(liveLessonFor(record)?.id).toBe(c.id);
      for (const p of l.prerequisites) { const prerequisite = a.findIndex(item => item.id === p); expect(prerequisite).toBeGreaterThanOrEqual(0); expect(prerequisite).toBeLessThan(i); }
      const end = l.blocks.at(-1); expect(end?.type).toBe("summary"); if (end?.type === "summary") expect(end.next).toBe(a[i + 1]?.id);
      expect(nextAvailableAfter(c.id)?.id).toBe(a[i + 1]?.id);
    }
    expect(Object.keys(lessons).filter(id => /^b\d/.test(id))).toHaveLength(20); expect(Object.keys(lessons).filter(id => /^c\d/.test(id))).toHaveLength(18);
  });
  it("derives phishing transfer from complete host boundaries", () => {
    const t = lessons["a19-phishing"]!.blocks.find(b => b.type === "transfer"); expect(t?.type === "transfer" && t.answer).toBe(["portal.campus.example", "campus.example.reset.example", "evilcampus.example"].filter(h => belongsToDomain(h, "campus.example")).length);
  });
});
