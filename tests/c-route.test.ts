import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getLesson, validateContent } from "../src/content";
import { coursesFor, liveLessonFor } from "../src/content/academy";
import { trackCCatalog } from "../src/content/track-c-catalog";
import { cLabs } from "../src/grading/c-route";
import { probabilities } from "../src/grading/c-route/foundations";
import { searchLibrary } from "../src/grading/c-route/building";
import { initialValues, type CLabKey } from "../src/grading/c-route/types";
import { evaluateBadges } from "../src/progress/badges";
import { completeLesson, emptyProgress } from "../src/progress/store";
import cases from "./fixtures/c-route-cases.json";

describe("Foundation C curriculum and existing course entry points", () => {
  it("reconciles the 18 existing IDs with the Academy catalog and 1600 × 900 art", () => {
    expect(validateContent()).toEqual([]);
    expect(coursesFor("Foundation", "C").filter(course => course.status === "live")).toHaveLength(18);
    for (const entry of trackCCatalog) {
      const course = coursesFor("Foundation", "C").find(course => course.id === entry.id.slice(0, 3).toUpperCase())!;
      const lesson = getLesson(entry.id)!;
      expect(entry.status).toBe("available");
      expect(liveLessonFor(course)).toBe(lesson);
      expect(lesson.quality).toEqual({ state: "draft" });
      const png = readFileSync(`public/art/${lesson.art}`);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1600, 900]);
    }
  });

  it("retains the C05 badge and unlocks C18's badge only via completion", () => {
    const date = new Date("2026-11-26T12:00:00Z");
    const stats = { firstTryCorrect: 3, quizTotal: 4 };
    const c05 = completeLesson(emptyProgress(), "c05-prompt-structure", stats, date);
    const before = evaluateBadges(c05, date);
    expect(before.find(b => b.id === "prompt-smith")?.earned).toBe(true);
    expect(before.find(b => b.id === "agent-builder")).toMatchObject({ obtainable: true, earned: false });
    const after = evaluateBadges(completeLesson(c05, "c18-assistant-project", stats, date), date);
    expect(after.find(b => b.id === "agent-builder")?.earned).toBe(true);
  });

  for (const sample of cases) {
    it(`${sample.id} has a working experiment, an initially failing challenge and an independent assessment`, () => {
      const l = getLesson(sample.id)!;
      const experiments = l.blocks.filter(b => b.type === "sim");
      expect(experiments.map(b => [b.mode, b.cLab])).toEqual([["free", sample.lab], ["challenge", sample.lab]]);
      expect(l.blocks.filter(b => b.type === "explain")).toHaveLength(3);
      expect(l.blocks.find(b => b.type === "quiz")?.items.map(q => q.answer)).toEqual(sample.answers);
      expect(l.blocks.find(b => b.type === "transfer")?.answer).toBe(sample.transfer);
      expect(l.sources.length).toBeGreaterThanOrEqual(2);
      const lab = cLabs[sample.lab as CLabKey];
      const defaults = initialValues(lab);
      expect(lab.run(defaults).passed).toBe(false);
      const configured = new Map(Object.entries(sample.values));
      const report = lab.run(Object.fromEntries(lab.controls.map(control => [control.id, configured.get(control.id) ?? defaults[control.id]!])));
      expect(report.passed).toBe(true);
      expect([report.evidence, ...report.rows].join("\n")).toContain(sample.evidence);
    });
  }
});

describe("C route model boundaries", () => {
  it("temperature flattens the distribution while retaining normalized weights", () => {
    expect(probabilities([.72, .22, .06], 0)).toEqual([1, 0, 0]);
    const low = probabilities([.72, .22, .06], .5);
    const high = probabilities([.72, .22, .06], 2);
    expect(high.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(high[0]).toBeLessThan(low[0]!);
    expect(high[2]).toBeGreaterThan(low[2]!);
  });
  it("checks grammar, schema and facts independently", () => {
    for (const json of ['{', 'null', '[]', '{"title":"社团例会","minutes":"30"}', '{"title":"社团例会","minutes":31}', '{"title":"社团例会","minutes":30,"extra":1}']) {
      expect(cLabs.format.run({ json }).passed).toBe(false);
    }
  });
  it("keeps current, relevant evidence and refuses an empty result", () => {
    expect(searchLibrary("周六 开放", false).map(doc => doc.id)).toEqual(["L1", "L2"]);
    expect(searchLibrary("周六 开放", true).map(doc => doc.id)).toEqual(["L2"]);
    expect(searchLibrary("周六 周六", true)[0]?.score).toBe(1);
    expect(searchLibrary("没有对应的词", true)).toEqual([]);
    expect(cLabs.retrieve.run({ query: "失物", edition: "current", cite: "source" }).passed).toBe(false);
  });
  it("requires independent permissions and passes a normal public request", () => {
    expect(cLabs.agent.run({ tool: "rules", arg: "loan", consent: "no" }).passed).toBe(false);
    expect(cLabs.agent.run({ tool: "write", arg: "loan", consent: "yes" }).passed).toBe(false);
    const report = cLabs.trust.run({ origin: "data", permissions: "read", summarize: "yes" });
    expect(report.rows).toEqual(["资料夹带操作：阻止", "公开规则摘要：普通图书借阅 14 天 [L3]"]);
    expect(cLabs.trust.run({ origin: "instruction", permissions: "read", summarize: "yes" }).passed).toBe(false);
  });
  it("produces a case audit and fails if any capstone protection is removed", () => {
    const good = { docs: "current", unknown: "abstain", access: "block", citation: "cite" };
    for (const [key, value] of Object.entries(initialValues(cLabs.capstone))) {
      expect(cLabs.capstone.run({ ...good, [key]: value }).passed).toBe(false);
    }
    const csv = cLabs.capstone.run(good).csv!;
    expect(csv.split("\r\n")).toHaveLength(5);
    expect(csv).toContain('"当前开放时间","回答","回答","周六 10:00–17:00 开放","L2","L2","是"');
    expect(csv).toContain('"要求替人修改账户","转人工","转人工","","","","是"');
  });
});
