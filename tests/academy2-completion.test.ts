import { describe, it, expect } from "vitest";
import { experiments } from "../src/content/academy2/experiments";
import { p1Lessons, findP1Lesson } from "../src/content/academy2/p1";
import { enhanceLesson } from "../src/content/academy2/teaching/p1";
import { createVariant, extendedQuestions } from "../src/content/academy2/teaching/p1/variants";
import { questionSchema } from "../src/content/academy2/teaching/schema";
import {
  gradeExercise,
  emptyKnowledge,
  beginTopic,
  recordIndependentVerification,
} from "../src/grading/academy2/p1/progress";
import { evaluate } from "../src/grading/academy2/teaching/questions";
import {
  eigen2,
  svd2,
  reduceRows,
  graphReport,
  trapezoid,
  taylor,
  quadraticDescent,
} from "../src/grading/academy2/p15/math";
import {
  tTail,
  fTail,
  gammaTail,
  continuous,
  knownSigmaPower,
  permutationDifference,
  residuals,
  signedRanks,
} from "../src/grading/academy2/p15/stats";
import { compareOutputs, parseProgramOutput, programHarness } from "../src/grading/academy2/p15/python";
import { mainAnswers, extraAnswers } from "./fixtures/p15-answer-oracles";
import { applyBackup, mergeBackup, readBackup, type Backup } from "../src/progress/backup";
import { emptyStudy } from "../src/progress/study";
import { emptyProgress } from "../src/progress/store";
import { DEFAULT_PREFERENCES } from "../src/preferences/model";
import { searchStudy, studyCatalogue } from "../src/content/academy2/teaching/library";
import { buildTopicContext } from "../src/ai/topicContext";
import { tutorRequestSchema } from "../src/ai/protocol";

describe("academic worksheet checks", () => {
  it("scores all core problems against independently recalculated expressions", () => {
    expect(Object.keys(mainAnswers)).toHaveLength(82);
    const failures = p1Lessons.flatMap((lesson) =>
      lesson.exercises.flatMap((exercise, i) => {
        const expected = mainAnswers[lesson.id]?.[i];
        return gradeExercise(exercise, String(expected))
          ? []
          : [lesson.id + ": " + exercise.prompt + " ← " + expected];
      }),
    );
    expect(failures).toEqual([]);
  });
  it("checks every closed supplemental answer and open review boundary", () => {
    const seen = new Set<string>();
    for (const lesson of p1Lessons)
      for (const raw of [
        ...enhanceLesson(lesson.id).questions,
        ...(extendedQuestions[lesson.id] ?? []),
      ]) {
        const question = questionSchema.parse(raw);
        if (question.type === "open") {
          expect(evaluate(question, "由假设出发，给出可核对的证据").status).toBe("review");
        } else {
          seen.add(question.id);
          expect(evaluate(question, extraAnswers[question.id] ?? "").status, question.id).toBe(
            "correct",
          );
        }
      }
    expect(seen.size).toBe(Object.keys(extraAnswers).length);
  });
  it("separates seeded practice, another problem and actual prerequisite evidence", () => {
    const practice = createVariant("fm-equations", 0),
      verification = createVariant("fm-equations", 3, true);
    expect(createVariant("fm-equations", 0)).toEqual(practice);
    expect(practice?.prompt).not.toBe(verification?.prompt);
    expect(evaluate(practice!, "2").status).toBe("correct");
    expect(evaluate(verification!, "2").status).toBe("incorrect");
    expect(evaluate(verification!, "5").status).toBe("correct");
    const begun = beginTopic(emptyKnowledge(), "fm-equations", 1);
    expect(recordIndependentVerification(begun, "fm-equations", true, 10)).toBe(begun);
    const expected: Record<string, (n: number, transfer: boolean) => number> = {
      "fm-equations": (n) => ((4 * n + 2) - (n + 2)) / 3,
      "fm-polynomial": (n) => (n * n - 2) * n + 4,
      "fm-exponential": (n, transfer) => Math.log(n ** (transfer ? 4 : 3)) / Math.log(n),
      "fm-sequences": (n) => Array.from({ length: 6 }).reduce<number>((sum) => sum + 3, n),
      "fm-dot": (n) => [n, 2].reduce((sum, x, i) => sum + x * [3, 4][i]!, 0),
      "fs-mean": (n) => (n + n + 4 * (n + 3)) / 6,
      "fs-variance": (n) => ((0 - n) ** 2 + (n - n) ** 2 + (2 * n - n) ** 2) / 2,
      "fs-bayes": (n) => (n / 100) / ((n + 10) / 100),
      "im-determinant": (n) => n * 4 - 2 * 3,
      "im-derivative": (n) => n * n + n * n + n * n,
      "im-integral": (n) => trapezoid((x) => x + x, 0, n, 1),
      "im-gradient": (n) => 2 * n - (2 * n * 2) / 4,
      "is-expectation": (n) => (n + (n + 4) * 3) / 4,
      "is-variance": (n) => (2 * n) ** 2,
      "is-sampling": (n) => Math.sqrt((2 * n) ** 2 / 16),
      "is-ztest": (_n, transfer) => transfer ? -(0.12 * 100) : 0.08 * 100,
    };
    for (const [id, oracle] of Object.entries(expected)) {
      for (let seed = 0; seed < 7; seed++) {
        for (const transfer of [false, true]) {
          const question = createVariant(id, seed, transfer)!;
          expect(evaluate(question, String(oracle(seed + 2, transfer))).status, id).toBe("correct");
        }
      }
    }
  });
  it("checks program output against multiple actual return values", () => {
    const q = extendedQuestions["fs-mean"]![0]!;
    if (q.type !== "program") throw Error("model");
    expect(programHarness("code", q, "tag")).toContain("[[-8,2]]");
    expect(parseProgramOutput("unrelated\ntag [3, -3, 4.5]", "tag")).toEqual(["3", "-3", "4.5"]);
    expect(parseProgramOutput("tag [null, 3]", "tag")).toBeNull();
    expect(evaluate(q, ["3", "3", "3"]).status).toBe("incorrect");
    expect(compareOutputs("4.0", "4")).toBe(true);
    expect(compareOutputs("4.001", "4")).toBe(false);
  });
});

describe("experiment computations", () => {
  it("runs every published experiment with its genuine default controls", () => {
    const items = [...experiments.math, ...experiments.statistics];
    expect(items).toHaveLength(29);
    expect(new Set(items.map((experiment) => experiment.id)).size).toBe(items.length);
    // Closed forms, direct counting, and independent NumPy/SciPy results at the default inputs.
    const oracles: Record<string, [string, number | string]> = {
      functions: ["变换后 g(0)", 2 * (0.5 * (0 - 1)) ** 2 - 1],
      "unit-circle": ["弧度", Math.PI / 3],
      projection: ["残差·方向", 0],
      "matrix-map": ["有向面积", 2],
      elimination: ["解分类", "唯一解"],
      eigen: ["λ1", 4],
      svd: ["σ₂", 1],
      limit: ["共同极限", 6],
      tangent: ["切线斜率", Math.cos(0.5)],
      integral: ["精确值", 8 / 3],
      taylor: ["近似值", 1 + 1 + 0.5 + 1 / 6],
      gradient: ["最终目标值", 4 * 0.7 ** 24 + 2 * 0.4 ** 24],
      hessian: ["原点分类", "鞍点"],
      discrete: ["组合数", 15],
      descriptive: ["平均数", 59 / 8],
      boxplot: ["围栏外", 25],
      correlation: ["Pearson r", 0.981104910251593],
      pmf: ["P(X=k)", 0.266827932],
      pdf: ["累计 F(x)", 0.841344746068543],
      clt: ["理论标准误", 1 / Math.sqrt(20)],
      confidence: ["临界值", 2.57058183563631],
      testing: ["p 值", 0.17846233128841651],
      rejection: ["临界绝对值", 1.959963984540054],
      power: ["检验力", 0.7819079987319797],
      residuals: ["残差平方和", 6],
      anova: ["上尾 p", 0.006562875569831275],
      rank: ["H 的渐近 p", 0.038176439404577586],
      ab: ["差值（百分点）", 5],
      "chi-square": ["渐近 p", 0.04550026389635857],
    };
    expect(Object.keys(oracles).sort()).toEqual(items.map((item) => item.id).sort());
    for (const experiment of items) {
      const result = experiment.run(experiment.controls.map((field) => field.value));
      expect(result.values.length, experiment.id).toBeGreaterThanOrEqual(3);
      expect(JSON.stringify(result), experiment.id).not.toMatch(/NaN|Infinity|\[null/);
      expect(findP1Lesson(experiment.topic), experiment.id).toBeDefined();
      const [metric, expected] = oracles[experiment.id]!;
      const actual = result.values.find(([name]) => name === metric)?.[1];
      if (typeof expected === "number")
        expect(Number(actual), experiment.id + " " + metric).toBeCloseTo(expected, 5);
      else expect(actual, experiment.id + " " + metric).toBe(expected);
    }
  });
  it("checks RREF, eigen relations, low-rank reconstruction, integration and Taylor bounds", () => {
    expect(
      reduceRows(
        [
          [0, 2, 4],
          [1, 1, 3],
        ],
        2,
      ).matrix,
    ).toEqual([
      [1, 0, 1],
      [0, 1, 2],
    ]);
    expect(
      reduceRows(
        [
          [1, 1, 4],
          [2, 2, 10],
        ],
        2,
      ).inconsistent,
    ).toBe(true);
    expect(
      eigen2([
        [0, -1],
        [1, 0],
      ]).imaginary,
    ).toBe(1);
    expect(
      graphReport(
        [
          ["O", "A"],
          ["O", "B"],
          ["O", "C"],
        ],
        "A",
        "B",
      ).hamilton,
    ).toBeNull();
    for (const [a, b, c, d] of [
      [2, 1, 1, 2],
      [2, 3, 4, 1],
      [0, 0, 0, 0],
      [2, 4, 1, 2],
    ]) {
      const result = svd2([
        [a!, b!],
        [c!, d!],
      ]);
      const rebuild = (i: number, j: number) =>
        result.s1 * result.u1[i]! * result.v1[j]! + result.s2 * result.u2[i]! * result.v2[j]!;
      [a, b, c, d].forEach((value, j) =>
        expect(rebuild(Math.floor(j / 2), j % 2)).toBeCloseTo(value!, 10),
      );
      expect(result.error).toBeCloseTo(result.s2, 10);
    }
    expect(trapezoid((x) => x * x, 0, 2, 8)).toBeCloseTo(2 + 11 / 16, 12);
    expect(taylor(1, 3, "exp")).toMatchObject({ total: expect.closeTo(8 / 3, 10) });
    expect(taylor(1, 3, "sin").error).toBeLessThan(taylor(1, 3, "sin").bound);
    expect(quadraticDescent([2, 1], [1, 2], 0.15, 12).iterations.at(-1)!.value).toBeLessThan(0.01);
  });
  it("matches SciPy distribution and inference oracles", () => {
    expect(tTail(1.5011106998930268, 6.767935027823733) * 2).toBeCloseTo(0.17846233128841651, 10);
    expect(fTail(9.25, 2, 9)).toBeCloseTo(0.006562875569831275, 10);
    expect(gammaTail(0.5, 2)).toBeCloseTo(0.04550026389635857, 10);
    expect(knownSigmaPower(0.5, 30, 1, 0.05, "two").power).toBeCloseTo(0.7819079987319797, 5);
    expect(continuous("exponential", 1, 2, 0)).toEqual([2 * Math.exp(-2), 1 - Math.exp(-2)]);
    expect(continuous("fisher", 0.5, 2, 8)[1]).toBeCloseTo(1 - (8 / 9) ** 4, 10);
    expect(
      residuals([
        [0, 1],
        [1, 3],
        [2, 4],
        [3, 9],
        [4, 8],
      ]).sse,
    ).toBe(6);
    expect(signedRanks([-1, 2, 3, -4])).toMatchObject({ statistic: 5, p: 1 });
    expect(signedRanks([1, 2, 3, 4])).toMatchObject({ statistic: 0, p: 0.125 });
    expect(permutationDifference([1, 2], [4, 5], 100, 99)).toEqual(
      permutationDifference([1, 2], [4, 5], 100, 99),
    );
  });
});

describe("restore and teaching lookup", () => {
  const backup: Backup = {
    format: "nico-academy-backup",
    version: 1,
    legacy: emptyProgress(),
    knowledge: emptyKnowledge(),
    library: emptyStudy(),
    preferences: DEFAULT_PREFERENCES,
    professionalPath: "",
  };
  it("validates both backup versions and preserves sources in a merge", () => {
    expect(readBackup(JSON.stringify(backup))).toEqual(backup);
    expect(readBackup(JSON.stringify(backup.legacy))).toEqual(backup.legacy);
    expect(readBackup(JSON.stringify({ ...backup, version: 7 }))).toBeNull();
    expect(readBackup('{"__proto__":{},"version":1}')).toBeNull();
    const incoming = {
      ...backup,
      professionalPath: "data-science",
      library: { ...backup.library, notes: { "im-svd": { body: "分解", at: 10 } } },
    };
    expect(mergeBackup(backup, incoming, true).professionalPath).toBe("data-science");
    expect(mergeBackup(backup, incoming, false).library.notes["im-svd"]?.body).toBe("分解");
  });
  it("restores prior keys when one storage write fails", () => {
    const store = new Map([["nico-progress", "previous"]]);
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => {
        if (key === "nico-study-library") throw Error("quota");
        store.set(key, value);
      },
    } as unknown as Storage;
    expect(() => applyBackup(storage, backup)).toThrow(/恢复此前/);
    expect(store.get("nico-progress")).toBe("previous");
    expect(store.has("nico-knowledge-progress")).toBe(false);
    expect([...store.keys()].some(key => key.startsWith("nico-recovery-"))).toBe(false);
  });
  it("finds full-term content and keeps private grading data out of AI context", () => {
    const { search, formula } = studyCatalogue();
    expect(formula.length).toBeGreaterThan(80);
    expect(
      searchStudy(search, "Gram–Schmidt").some((item) => item.path.startsWith("/topics/im-projection")),
    ).toBe(true);
    const legacy = findP1Lesson("im-svd")!;
    const context = buildTopicContext(legacy, enhanceLesson(legacy.id), "答题提示", {
      title: "SVD",
      objective: "核验低秩误差",
    });
    expect(
      tutorRequestSchema.safeParse({ kind: "tutor", lessonTitle: "SVD", question: "怎么开始", context })
        .success,
    ).toBe(true);
    expect(context).toContain("练习题面");
    expect(context).toContain("实验目标：SVD");
    expect(context).not.toContain("完整分解为");
  });
});
