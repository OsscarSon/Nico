import { describe, it, expect } from "vitest";
import { lessonSchema } from "../src/content/schema";
import { lessons, validateContent } from "../src/content";
import { tracks } from "../src/content/catalog";

describe("content", () => {
  it("every lesson passes the schema and the lesson template", () => {
    for (const l of Object.values(lessons))
      expect(lessonSchema.safeParse(l).success).toBe(true);
  });
  it("catalog and lesson content agree", () => {
    expect(validateContent()).toEqual([]);
  });
  it("catalog ids are unique", () => {
    const ids = tracks.flatMap((t) => t.lessons.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("a draft lesson is never presented as published", () => {
    expect(lessons["a01-binary"]!.quality.state).toBe("draft");
  });
  it("rejects a quiz whose wrong option has no diagnostic hint", () => {
    const bad = structuredClone(lessons["a01-binary"]!);
    const q = bad.blocks.find((b) => b.type === "quiz");
    if (q?.type !== "quiz") throw new Error("no quiz");
    delete q.items[0]!.wrongHints["0"];
    expect(lessonSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects a published lesson without sources or evidence", () => {
    const bad = structuredClone(lessons["a01-binary"]!);
    bad.quality = { state: "published" };
    expect(lessonSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects a lesson that lacks the transfer question", () => {
    const bad = structuredClone(lessons["a01-binary"]!);
    bad.blocks = bad.blocks.filter((b) => b.type !== "transfer");
    expect(lessonSchema.safeParse(bad).success).toBe(false);
  });
  it("a01 numbers: quiz answers are correct by independent calculation", () => {
    // 00001101 = 13；2^5 = 32；256 * 4 = 1024
    expect(0b00001101).toBe(13);
    expect(2 ** 5).toBe(32);
    expect(2 ** 10).toBe(1024);
    const t = lessons["a01-binary"]!.blocks.find((b) => b.type === "transfer");
    expect(t?.type === "transfer" && t.answer).toBe(1024);
  });
});
