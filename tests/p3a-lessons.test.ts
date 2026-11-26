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
    const l = lessons[id]!;
    expect(lessonSchema.safeParse(l).success).toBe(true);
    expect(l.quality).toEqual({ state: "draft" });
    expect(l.artPending).toBeUndefined();
    expect(l.art).toBe(`lesson-${id}.png`);
    const png = readFileSync(`public/art/${l.art}`);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1600, 900]);
    expect(l.blocks.filter(b => b.type === "explain").length).toBeGreaterThanOrEqual(3);
    expect(l.blocks.filter(b => b.type === "sim").map(b => b.mode)).toEqual(["free", "challenge"]);
    const q = l.blocks.find(b => b.type === "quiz"); if (q?.type !== "quiz") throw Error("missing quiz"); expect(q.items).toHaveLength(3);
    for (const item of q.items) item.options.forEach((_, i) => { expect(gradeChoice(item, i).correct).toBe(i === item.answer); expect(gradeChoice(item, i).message.length).toBeGreaterThan(10); });
    expect(l.blocks.some(b => b.type === "transfer")).toBe(true); expect(l.blocks.at(-1)?.type).toBe("summary"); expect(l.sources.length).toBeGreaterThanOrEqual(3);
    const c = curriculum.find(c => c.id === id.split("-")[0]!.toUpperCase())!; expect(c.status).toBe("live"); expect(liveLessonFor(c)?.id).toBe(id);
    expect(lessonSchema.safeParse({ ...l, quality: { state: "published" } }).success).toBe(false);
  });
  it("keeps the P3-A protected baseline outside the Academy 2.0 home/profile redesign", () => {
    const redesigned = new Set(["src/pages/pages.tsx", "src/features/profile/ProfilePage.tsx", "src/features/profile/ProfileEditor.tsx"]);
    for (const [file, hash] of Object.entries(protectedFiles)) {
      if (redesigned.has(file)) continue; // These three shell files have behavioral coverage in smoke:academy2 and smoke:p2.
      expect(createHash("sha256").update(readFileSync(file)).digest("hex"), file).toBe(hash);
    }
    expect(validateContent()).toEqual([]);
  });
});
