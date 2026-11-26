import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curriculum, liveLessonFor } from "../src/content/academy";
import { getLesson } from "../src/content";
import { trackBCatalog } from "../src/content/track-b-catalog";

describe("B route conclusion", () => {
  it("makes all 20 lessons available through both catalogs", () => {
    expect(trackBCatalog).toHaveLength(20);
    for (const entry of trackBCatalog) {
      const course = curriculum.find(item => item.id === entry.id.slice(0, 3).toUpperCase())!;
      expect(entry.status, entry.id).toBe("available");
      expect(liveLessonFor(course)?.id).toBe(entry.id);
    }
  });

  for (const id of ["b18-project-page", "b19-project-tool", "b20-review"]) {
    it(`${id} is a complete draft with a landscape opening PNG`, () => {
      const lesson = getLesson(id)!;
      expect(lesson.quality).toEqual({ state: "draft" });
      expect(lesson.blocks.filter(block => block.type === "sim").map(block => block.mode)).toEqual(["free", "challenge"]);
      expect(lesson.blocks.find(block => block.type === "quiz")?.items).toHaveLength(3);
      expect(lesson.art).toBe(`lesson-${id}.png`);
      const png = readFileSync(`public/art/${lesson.art}`);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16) / png.readUInt32BE(20)).toBeCloseTo(16 / 9, 2);
    });
  }
});
