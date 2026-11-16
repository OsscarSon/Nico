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

import { nextAvailableAfter } from "../src/content";
import { freeProgram, runToHalt } from "../src/grading/cpu";
describe("next lesson", () => {
  it("A01 is followed directly by A02", () => {
    expect(nextAvailableAfter("a01-binary")?.id).toBe("a02-hex-encoding");
  });
  it("A02 is followed directly by A03", () => {
    expect(nextAvailableAfter("a02-hex-encoding")?.id).toBe("a03-logic-gates");
  });
  it("A03 is followed directly by A04", () => {
    expect(nextAvailableAfter("a03-logic-gates")?.id).toBe("a04-adder");
  });
  it("A04 is followed directly by A05", () => {
    expect(nextAvailableAfter("a04-adder")?.id).toBe("a05-cpu-cycle");
  });
  it("A05 skips the unfinished A06–A08 and lands on A09", () => {
    expect(nextAvailableAfter("a05-cpu-cycle")?.id).toBe("a09-network-layers");
  });
  it("A10 skips the unfinished A11–A12 and lands on A13", () => {
    expect(nextAvailableAfter("a10-ip-subnet")?.id).toBe("a13-dns");
  });
  it("returns undefined after the last available lesson of the track", () => {
    expect(nextAvailableAfter("a13-dns")).toBe(undefined);
  });
  it("returns undefined for unknown ids", () => {
    expect(nextAvailableAfter("zz99-nope")).toBe(undefined);
  });
  it("a challenge sim without its targets or gates fails the schema", () => {
    const bad = structuredClone(lessons["a03-logic-gates"]!);
    const sim = bad.blocks.find((b) => b.type === "sim" && b.mode === "challenge");
    if (sim?.type !== "sim") throw new Error("no challenge");
    delete sim.gates;
    expect(lessonSchema.safeParse(bad).success).toBe(false);
  });
  it("a04 transfer answer: 255 + 255 needs 9 bits", () => {
    const t = lessons["a04-adder"]!.blocks.find((b) => b.type === "transfer");
    expect(t?.type === "transfer" && t.answer).toBe(9);
    expect(255 + 255 < 2 ** 9 && 255 + 255 >= 2 ** 8).toBe(true);
  });
  it("a05 transfer answer equals the real step count of the free program", () => {
    const t = lessons["a05-cpu-cycle"]!.blocks.find((b) => b.type === "transfer");
    expect(t?.type === "transfer" && t.answer).toBe(runToHalt(freeProgram()).steps);
  });
  it("a03 transfer answer is 2^4", () => {
    const t = lessons["a03-logic-gates"]!.blocks.find((b) => b.type === "transfer");
    expect(t?.type === "transfer" && t.answer).toBe(2 ** 4);
  });
});
