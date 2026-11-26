import { describe, it, expect } from "vitest";
import { badges, evaluateBadges } from "../src/progress/badges";
import { completeLesson, emptyProgress } from "../src/progress/store";

const day = (s: string) => new Date(`${s}T12:00:00`);
const done = (ids: string[]) =>
  ids.reduce(
    (p, id) => completeLesson(p, id, { firstTryCorrect: 1, quizTotal: 1 }, day("2026-11-14")),
    emptyProgress(),
  );
const byId = (list: ReturnType<typeof evaluateBadges>, id: string) => list.find((b) => b.id === id)!;

describe("badges", () => {
  it("nothing is earned with no progress", () => {
    expect(evaluateBadges(emptyProgress(), day("2026-11-14")).some((b) => b.earned)).toBe(false);
  });
  it("first-bit is earned only after completing A01", () => {
    const list = evaluateBadges(done(["a01-binary"]), day("2026-11-14"));
    expect(byId(list, "first-bit").earned).toBe(true);
    expect(byId(list, "gatekeeper").earned).toBe(false);
  });
  it("a badge whose lessons do not exist yet is not obtainable and never earned", () => {
    // 即使进度里伪造了这些课时，课程没开放也不发徽章
    const future = badges.find((b) => b.id === "formula-wizard")!;
    const list = evaluateBadges(done(future.requires), day("2026-11-14"), id => !future.requires.includes(id));
    expect(byId(list, "formula-wizard").obtainable).toBe(false);
    expect(byId(list, "formula-wizard").earned).toBe(false);
  });
  it.each(["agent-builder", "formula-wizard", "game-maker"])("%s is obtainable and requires actual completion", id => {
    const badge = badges.find(b => b.id === id)!;
    const today = day("2026-11-14");
    expect(byId(evaluateBadges(emptyProgress(), today), id)).toMatchObject({ obtainable: true, earned: false });
    expect(byId(evaluateBadges(done(badge.requires), today), id).earned).toBe(true);
  });
  it("packet-pilot is obtainable after A15–A17 arrive but still needs all actual completion records", () => {
    const packet = badges.find(b => b.id === "packet-pilot")!;
    const partial = byId(evaluateBadges(done(packet.requires.slice(0, -1)), day("2026-11-14")), packet.id);
    expect(partial.obtainable).toBe(true); expect(partial.earned).toBe(false);
    expect(byId(evaluateBadges(done(packet.requires), day("2026-11-14")), packet.id).earned).toBe(true);
  });
  it("gatekeeper is obtainable now that A03 and A04 exist, and needs both", () => {
    const only3 = evaluateBadges(done(["a03-logic-gates"]), day("2026-11-14"));
    expect(byId(only3, "gatekeeper").obtainable).toBe(true);
    expect(byId(only3, "gatekeeper").earned).toBe(false);
    const both = evaluateBadges(done(["a03-logic-gates", "a04-adder"]), day("2026-11-14"));
    expect(byId(both, "gatekeeper").earned).toBe(true);
  });
  it("a badge becomes earned when all required lessons exist and are complete", () => {
    const p = done(["a03-logic-gates", "a04-adder"]);
    const list = evaluateBadges(p, day("2026-11-14"), () => true);
    expect(byId(list, "gatekeeper").earned).toBe(true);
  });
  it("streak badge needs 7 consecutive days", () => {
    const days = ["08", "09", "10", "11", "12", "13", "14"].map((d) => `2026-11-${d}`);
    expect(byId(evaluateBadges({ ...emptyProgress(), activeDays: days }, day("2026-11-14")), "streak-7").earned).toBe(true);
    expect(byId(evaluateBadges({ ...emptyProgress(), activeDays: days.slice(1) }, day("2026-11-14")), "streak-7").earned).toBe(false);
  });
  it("every badge has artwork file name and a human-readable condition", () => {
    for (const b of badges) {
      expect(b.art.endsWith(".png")).toBe(true);
      expect(b.how.length > 0).toBe(true);
    }
  });
});
