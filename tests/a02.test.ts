import { describe, it, expect } from "vitest";
import { lessonSchema } from "../src/content/schema";
import { a02 } from "../src/content/lessons/a02-hex-encoding";

describe("a02-hex-encoding", () => {
  it("passes the schema and stays a draft", () => {
    expect(lessonSchema.safeParse(a02).success).toBe(true);
    expect(a02.quality.state).toBe("draft");
  });
  it("numbers are correct by independent calculation", () => {
    expect(0x2f).toBe(47); // quiz 1
    expect(0x80).toBe(128); // transfer
    expect(0xff).toBe(255);
    expect(0xa).toBe(10);
    expect("A".charCodeAt(0)).toBe(65);
    expect("a".charCodeAt(0)).toBe(97);
    expect("A".charCodeAt(0).toString(16)).toBe("41");
    expect("你".codePointAt(0)!.toString(16)).toBe("4f60");
  });
  it("challenge targets and transfer answer match the lesson text", () => {
    const sim = a02.blocks.find((b) => b.type === "sim");
    expect(sim?.type === "sim" && sim.targets).toEqual([10, 65, 97]);
    const t = a02.blocks.find((b) => b.type === "transfer");
    expect(t?.type === "transfer" && t.answer).toBe(128);
  });
  it("quiz answers point at the intended options", () => {
    const quiz = a02.blocks.find((b) => b.type === "quiz");
    if (quiz?.type !== "quiz") throw new Error("no quiz");
    expect(quiz.items[0]!.options[quiz.items[0]!.answer]).toBe("47");
    expect(quiz.items[1]!.options[quiz.items[1]!.answer]).toBe("红色");
  });
});
