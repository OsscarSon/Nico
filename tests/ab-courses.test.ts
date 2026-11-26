import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getLesson, nextAvailableAfter, validateContent } from "../src/content";
import { coursesFor, stageSummary } from "../src/content/academy";
import { diagnosticsLessons } from "../src/content/lessons/ab-courses/foundation";
import { intermediateALessons } from "../src/content/lessons/ab-courses/intermediate-a";
import { intermediateBLessons } from "../src/content/lessons/ab-courses/intermediate-b";
import { routeView } from "../src/content/route-view";
import { abLabs } from "../src/grading/ab-courses";
import { evaluateLab, type LabId } from "../src/grading/ab-courses/model";
import { isCatalogItem } from "../src/grading/ab-courses/programming";

const scenarios: Record<LabId, { correct: number[]; witness: string; boundary: number[]; counterexample: string }> = {
  status: { correct: [1, 1, 1], witness: "0s/429 → 3s/200", boundary: [1, 0, 1], counterexample: "0s/429 → 0s/429" },
  logs: { correct: [2, 1, 1], witness: "41ms 上游等待超时", boundary: [1, 1, 1], counterexample: "选中的记录不在请求内" },
  register: { correct: [1, 1, 1], witness: "3 / 7", boundary: [1, 0, 1], counterexample: "12 / 3" },
  linux: { correct: [1, 1, 1], witness: "active · 文件读入", boundary: [1, 2, 1], counterexample: "可读" },
  protocol: { correct: [1, 1, 1, 1], witness: "600 B", boundary: [1, 0, 1, 1], counterexample: "2001:db8::30 / 地址族不匹配" },
  routing: { correct: [1, 1, 1], witness: "阅览室 · 保留内部源地址", boundary: [0, 1, 1], counterexample: "默认出口 · 源地址已转换" },
  response: { correct: [1, 1, 0], witness: "401", boundary: [2, 1, 0], counterexample: "403" },
  cloud: { correct: [1, 1, 1], witness: "node-b · 8 条 / 8 条", boundary: [1, 0, 0], counterexample: "node-b · 0 条 / 0 条" },
  "async-types": { correct: [1, 1, 1], witness: "数据格式错误", boundary: [0, 1, 1], counterexample: "火山 / 5" },
  backend: { correct: [1, 1, 1], witness: "201 /bookings/1", boundary: [1, 0, 1], counterexample: "下午, 3" },
  frontend: { correct: [1, 1, 1], witness: "1 → 1 条 / 月球手册", boundary: [1, 0, 1], counterexample: "1 → 0 条 / " },
  database: { correct: [1, 1, 1], witness: "外键拒绝 #99 / 3", boundary: [1, 1, 0], counterexample: "外键拒绝 #99 / 4" },
  structures: { correct: [1, 1, 1], witness: "新版银河", boundary: [1, 1, 0], counterexample: "银河图册" },
  workflow: { correct: [1, 1, 1], witness: "rev-c / 通过", boundary: [1, 0, 1], counterexample: "误放行" },
  fullstack: { correct: [1, 1, 1, 1], witness: "200 / 201 / 200", boundary: [1, 1, 1, 0], counterexample: "200 / 201 / 201" },
};

describe("A21, A22 and Intermediate A/B", () => {
  const additions = [...diagnosticsLessons, ...intermediateALessons, ...intermediateBLessons];
  it("opens every requested entry with existing IDs and leaves other planned nodes unchanged", () => {
    expect(validateContent()).toEqual([]);
    expect(stageSummary("Foundation")).toBe("已上线 100 / 100");
    expect(stageSummary("Intermediate")).toBe("已上线 16 / 46");
    expect(routeView("a")?.nodes.slice(-2).map(node => [node.id, node.unit])).toEqual([["a21-http-status", "a3"], ["a22-error-logs", "a3"]]);
    expect(routeView("a", "Intermediate")?.nodes.map(node => node.lesson?.id)).toEqual(intermediateALessons.map(lesson => lesson.id));
    expect(routeView("b", "Intermediate")?.nodes.map(node => node.lesson?.id)).toEqual(["b-i01", ...intermediateBLessons.map(lesson => lesson.id)]);
    expect(coursesFor("Advanced").some(course => course.status === "live")).toBe(false);
    expect(getLesson("c-i03")).toBeUndefined();
    expect(nextAvailableAfter("b-i01")?.id).toBe("b-i02");
    expect(nextAvailableAfter("b-i08")).toBeUndefined();
  });
  it("registers a unique lab and 16:9 illustration per complete draft lesson", () => {
    expect(additions).toHaveLength(15);
    const used = new Set<LabId>();
    for (const lesson of additions) {
      expect(lesson.quality).toEqual({ state: "draft" });
      expect(lesson.blocks.map(block => block.type)).toEqual(["hook", "explain", "explain", "explain", "explain", "sim", "sim", "quiz", "transfer", "summary"]);
      const simulations = lesson.blocks.filter(block => block.type === "sim");
      expect(simulations.map(block => block.mode)).toEqual(["free", "challenge"]);
      expect(simulations[0]?.abLab).toBe(simulations[1]?.abLab);
      used.add(simulations[0]!.abLab!);
      expect(lesson.blocks.find(block => block.type === "quiz")?.items).toHaveLength(3);
      expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
      const png = readFileSync("public/art/" + lesson.art);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1600, 900]);
    }
    expect([...used].sort()).toEqual(Object.keys(abLabs).sort());
    expect(new Set(additions.map(lesson => lesson.art)).size).toBe(15);
  });

  it.each(Object.entries(scenarios))("%s requires observed output for all checks", (id, scenario) => {
    const lab = abLabs[id as LabId];
    const good = evaluateLab(lab, scenario.correct);
    const bad = evaluateLab(lab, scenario.boundary);
    expect(good.passed).toBe(true);
    expect(good.checks.map(row => row.observed)).toContain(scenario.witness);
    expect(bad.passed).toBe(false);
    expect(bad.checks.filter(row => row.observed !== row.expected).map(row => row.observed)).toContain(scenario.counterexample);
    expect(evaluateLab(lab, Array(lab.fields.length).fill(0)).passed).toBe(false);
    for (const [i, field] of lab.fields.entries()) {
      field.options.forEach((_, alternative) => {
        if (alternative === scenario.correct[i]) return;
        const modified = scenario.correct.map((original, index) => index === i ? alternative : original);
        expect(evaluateLab(lab, modified).passed, field.label + "=" + alternative).toBe(false);
      });
    }
    expect(() => evaluateLab(lab, [])).toThrow(RangeError);
  });

  it("validates fields and numeric bounds at runtime", () => {
    expect(isCatalogItem({ name: "光学", available: 0 })).toBe(true);
    for (const value of [false, null, {}, { name: "光学" }, { name: "光学", available: "2" }, { name: "光学", available: -1 }, { name: "光学", available: 1.2 }])
      expect(isCatalogItem(value)).toBe(false);
    expect(() => evaluateLab(abLabs.status, [-1, 0, 0])).toThrow(RangeError);
  });
});
