import { describe, it, expect } from "vitest";
import {
  loadProgress,
  saveProgress,
  recordStep,
  completeLesson,
  streak,
  emptyProgress,
  localDay,
  STORAGE_KEY,
} from "../src/progress/store";

function memory(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? (data[k] as string) : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}
const d = (s: string) => new Date(`${s}T12:00:00`);

describe("progress store", () => {
  it("starts empty", () => {
    expect(loadProgress(memory())).toEqual(emptyProgress());
  });
  it("round-trips saved progress", () => {
    const m = memory();
    const p = completeLesson(emptyProgress(), "a01-binary", { firstTryCorrect: 3, quizTotal: 4 }, d("2026-11-14"));
    saveProgress(m, p);
    expect(loadProgress(m)).toEqual(p);
  });
  it("backs up corrupted data instead of deleting it", () => {
    const m = memory({ [STORAGE_KEY]: "{not json" });
    const p = loadProgress(m, new Date(1000));
    expect(p).toEqual(emptyProgress());
    expect(m.data[`${STORAGE_KEY}-backup-1000`]).toBe("{not json");
  });
  it("backs up data from a newer schema version", () => {
    const future = JSON.stringify({ schemaVersion: 99, lessons: {}, activeDays: [] });
    const m = memory({ [STORAGE_KEY]: future });
    loadProgress(m, new Date(5));
    expect(m.data[`${STORAGE_KEY}-backup-5`]).toBe(future);
  });
  it("keeps the first completion result when a lesson is redone", () => {
    const first = completeLesson(emptyProgress(), "a01-binary", { firstTryCorrect: 2, quizTotal: 4 }, d("2026-11-14"));
    const again = completeLesson(first, "a01-binary", { firstTryCorrect: 4, quizTotal: 4 }, d("2026-11-20"));
    expect(again.lessons["a01-binary"]).toEqual(first.lessons["a01-binary"]);
  });
  it("records a resume point, and clears it when the lesson completes", () => {
    let p = recordStep(emptyProgress(), "a01-binary", 3, "2026-11-14");
    expect(p.resume).toEqual({ lessonId: "a01-binary", step: 3 });
    p = completeLesson(p, "a01-binary", { firstTryCorrect: 1, quizTotal: 1 }, d("2026-11-14"));
    expect(p.resume).toBe(null);
  });
  it("does not set a resume point for a completed lesson", () => {
    const done = completeLesson(emptyProgress(), "a01-binary", { firstTryCorrect: 1, quizTotal: 1 }, d("2026-11-14"));
    expect(recordStep(done, "a01-binary", 2, "2026-11-15").resume).toBe(null);
  });
  it("counts a streak ending today or yesterday", () => {
    const p = { ...emptyProgress(), activeDays: ["2026-11-12", "2026-11-13", "2026-11-14"] };
    expect(streak(p, d("2026-11-14"))).toBe(3);
    expect(streak(p, d("2026-11-15"))).toBe(3);
    expect(streak(p, d("2026-11-16"))).toBe(0);
  });
  it("a gap breaks the streak", () => {
    const p = { ...emptyProgress(), activeDays: ["2026-11-10", "2026-11-13", "2026-11-14"] };
    expect(streak(p, d("2026-11-14"))).toBe(2);
  });
  it("formats local days with zero padding", () => {
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
