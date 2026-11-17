import { describe, it, expect } from "vitest";
import { emptyProgress, mergeProgress, parseProgress, completeLesson } from "../src/progress/store";

const at = (s: string) => new Date(`${s}T12:00:00Z`);
const stats = { firstTryCorrect: 3, quizTotal: 4 };

describe("parseProgress（导入备份校验）", () => {
  it("接受导出的完整进度，并规范化", () => {
    const p = completeLesson(emptyProgress(), "a01-binary", stats, at("2026-03-02"));
    const parsed = parseProgress(JSON.stringify(p));
    expect(parsed?.lessons["a01-binary"]?.quizTotal).toBe(4);
    expect(parsed?.schemaVersion).toBe(1);
  });
  it("拒绝非 JSON、错误版本、缺字段和坏日期", () => {
    expect(parseProgress("not json")).toBeNull();
    expect(parseProgress(JSON.stringify({ ...emptyProgress(), schemaVersion: 2 }))).toBeNull();
    expect(parseProgress(JSON.stringify({ schemaVersion: 1, lessons: {} }))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...emptyProgress(), activeDays: ["昨天"] }))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...emptyProgress(), lessons: { x: { completedAt: "bad", firstTryCorrect: 1, quizTotal: 1 } } }))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...emptyProgress(), lessons: { x: { completedAt: "2026-03-02T00:00:00Z", firstTryCorrect: "1", quizTotal: 1 } } }))).toBeNull();
  });
  it("拒绝原型污染键", () => {
    const raw = '{"schemaVersion":1,"resume":null,"activeDays":[],"lessons":{"__proto__":{"completedAt":"2026-03-02T00:00:00Z","firstTryCorrect":1,"quizTotal":1}}}';
    expect(parseProgress(raw)).toBeNull();
  });
  it("无效的 resume 被丢弃而不是整体拒绝", () => {
    const parsed = parseProgress(JSON.stringify({ ...emptyProgress(), resume: { lessonId: 5, step: "x" } }));
    expect(parsed?.resume).toBeNull();
  });
});

describe("mergeProgress（只增不减）", () => {
  it("取并集，同一课时保留更早的首次成绩", () => {
    const mine = completeLesson(emptyProgress(), "a01-binary", { firstTryCorrect: 2, quizTotal: 4 }, at("2026-03-05"));
    const theirs = completeLesson(completeLesson(emptyProgress(), "a01-binary", stats, at("2026-03-02")), "a02-bits", stats, at("2026-03-03"));
    const merged = mergeProgress(mine, theirs);
    expect(Object.keys(merged.lessons).sort()).toEqual(["a01-binary", "a02-bits"]);
    expect(merged.lessons["a01-binary"]?.firstTryCorrect).toBe(3);
    expect(merged.activeDays).toEqual([...merged.activeDays].sort());
    expect(new Set(merged.activeDays).size).toBe(merged.activeDays.length);
  });
  it("已完成的课时不会作为 resume 保留", () => {
    const done = completeLesson(emptyProgress(), "b01-variables", stats, at("2026-03-02"));
    const other = { ...emptyProgress(), resume: { lessonId: "b01-variables", step: 2 } };
    expect(mergeProgress(done, other).resume).toBeNull();
    expect(mergeProgress(emptyProgress(), other).resume).toEqual({ lessonId: "b01-variables", step: 2 });
  });
});
