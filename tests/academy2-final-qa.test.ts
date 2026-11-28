import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  binomialTail,
  binomialPower,
  kalman,
  markov,
} from "../src/grading/academy2/advanced/statistics";
import {
  fold,
  scan,
  parse,
  emit,
  interpret,
  run,
} from "../src/grading/academy2/advanced/compiler";
import {
  eigenvectors,
  classification,
  regression,
} from "../src/grading/academy2/data/ml-metrics";
import { exactRandomization } from "../src/grading/academy2/applied/research";
import { labs, runLab } from "../src/grading/academy2/advanced/labs";
import { verifyProject } from "../src/grading/academy2/advanced/projectEvidence";
import { evaluate } from "../src/grading/academy2/teaching/questions";
import { reasoningQuestions } from "../src/content/academy2/applied/reasoning";
import {
  qaFixedQuestions,
  qaVariants,
} from "../src/content/academy2/advanced/qaQuestions";
import {
  qaEnrichment,
  qaSources,
} from "../src/content/academy2/advanced/qaEnrichment";
import { advancedProgram } from "../src/content/academy2/advanced/programs";
import { qaPrograms } from "../src/content/academy2/advanced/qaPrograms";
import { findP4Lesson } from "../src/content/academy2/advanced";
import { questionSchema } from "../src/content/academy2/teaching/schema";
import { renderFormula } from "../src/features/academy2/teaching/renderFormula";

describe("Final QA numerical counterexamples", () => {
  it("keeps central binomial tails when the probability at zero underflows", () => {
    expect(binomialTail(1999, 0.5, 1000)).toBeCloseTo(0.5, 13);
    expect(binomialTail(2000, 0.99, 1980)).toBeCloseTo(0.5590933319986471, 10);
    expect(binomialTail(4, 0.5, 3)).toBeCloseTo(5 / 16, 14);
    expect(binomialPower(4, 0.5, 0.75, 0.2)).toMatchObject({
      threshold: 4,
      typeOne: 1 / 16,
      power: 81 / 256,
    });
    expect(binomialTail(50, 0, 1)).toBe(0);
    expect(binomialTail(50, 1, 50)).toBe(1);
    expect(binomialPower(1, 0.05, 0.7, 0.05).threshold).toBe(1);
    expect(binomialPower(1999, 0.5, 0.99, 0)).toEqual({
      threshold: 2000,
      typeOne: 0,
      power: 0,
    });
  });
  it("uses independent inverse precision to verify the scalar Kalman covariance", () => {
    const extreme = kalman([3, 1], 1e20, 0, 1);
    expect(extreme[0]!.variance).toBeCloseTo(1, 14);
    expect(extreme[1]!.variance).toBeCloseTo(0.5, 14);
    expect(extreme[1]!.mean).toBeCloseTo(2, 14);
    expect(kalman([2], 0, 0, 1)[0]).toMatchObject({
      mean: 0,
      variance: 0,
      gain: 0,
    });
    expect(kalman([1], 1e308, 0, 1e308)[0]!.variance).toBeCloseTo(5e307);
  });
  it("compares PCA with a known eigensystem and preserves covariance scaling", () => {
    const u = [0.6, 0.8],
      v = [-0.8, 0.6],
      weight = Math.sqrt(0.999);
    const states = [
      u,
      u.map((x) => -x),
      v.map((x) => x * weight),
      v.map((x) => -x * weight),
    ];
    for (const scale of [1, 1e-10, 1e9]) {
      const adjusted = states.map((row) => row.map((x) => x * scale));
      const pca = eigenvectors(adjusted, 2);
      expect(
        Math.abs(pca.basis[0]![0]! * 0.6 + pca.basis[0]![1]! * 0.8),
      ).toBeCloseTo(1, 12);
      expect(pca.variances[0]! / scale ** 2).toBeCloseTo(2 / 3, 12);
      expect(pca.variances[1]! / scale ** 2).toBeCloseTo((2 * 0.999) / 3, 12);
      const dot = pca.basis[0]!.reduce(
        (s, x, i) => s + x * pca.basis[1]![i]!,
        0,
      );
      expect(dot).toBeCloseTo(0, 12);
    }
    expect(
      eigenvectors(
        [
          [1, 2],
          [1, 2],
        ],
        2,
      ).variances,
    ).toEqual([0, 0]);
  });
  it("permutes labeled observations equivalently under changes of units and under ties", () => {
    for (const magnitude of [1, 1e-12, 1e-40, 1e3]) {
      const experiment = exactRandomization(
        [1, 2, 9, 10].map((value) => value * magnitude).join(" "),
        2,
      );
      expect(experiment.extreme).toBe(2);
      expect(experiment.p).toBeCloseTo(1 / 3, 14);
      expect(experiment.observed / magnitude).toBeCloseTo(-8, 13);
    }
    expect(exactRandomization("4 4 4 4", 2)).toMatchObject({
      observed: 0,
      p: 1,
      draws: 6,
    });
  });
  it("keeps AUC ties separate from threshold-dependent classifications", () => {
    expect(classification([1, 0, 1, 0, 0], [0.3, 0.3, 0.3, 0.3, 0.3]).auc).toBe(
      0.5,
    );
    expect(classification([1, 1], [2, 3]).auc).toBeNull();
    expect(() => classification([1], [2], NaN)).toThrow();
    expect(() => regression([Infinity], [0])).toThrow();
    expect(regression([3, 3], [3, 3]).r2).toBeNull();
  });
  it("distinguishes the stationary distribution from pointwise convergence", () => {
    const state = markov(0, 1, 1, 4);
    expect(state.stationary).toBe(0.5);
    expect(state.prob.map((p) => p.y)).toEqual([0, 1, 0, 1, 0]);
  });
});

describe("Final QA executable semantics and projects", () => {
  it("does not fold away or move observable overflow ahead of an earlier error", () => {
    const tree = parse(scan("x+(9007199254740991+1)"));
    const optimized = fold(tree);
    expect(() => interpret(tree, new Map())).toThrow(/未定义的变量 x/);
    expect(() => run(emit(optimized), new Map())).toThrow(/未定义的变量 x/);
    expect(() => run(emit(optimized), new Map([["x", 1]]))).toThrow(/安全整数/);
    expect(() =>
      interpret(parse(scan("x")), new Map([["x", Infinity]])),
    ).toThrow(/安全整数/);
    expect(run(emit(fold(parse(scan("18-2*5-4")))), new Map()).value).toBe(4);
  });
  it("requires the named project evidence, including contact and a consistent fit", () => {
    const collision = (x: number) => ({
      inputs: { x, y: 3 },
      text: "",
      result: runLab("game-collision", { x, y: 3 }, ""),
    });
    expect(
      verifyProject("foundation-applied", [collision(0), collision(3)]),
    ).toBe(false);
    expect(
      verifyProject("foundation-applied", [collision(3), collision(4)]),
    ).toBe(false);
    expect(
      verifyProject("foundation-applied", [collision(2), collision(3)]),
    ).toBe(true);
    const slam = (after: number) => ({
      inputs: { displacement: 3, before: 7, after, origin: 0 },
      text: "",
      result: runLab(
        "robot-slam",
        { displacement: 3, before: 7, after, origin: 0 },
        "",
      ),
    });
    expect(verifyProject("advanced-applied", [slam(1), slam(3)])).toBe(false);
    expect(verifyProject("advanced-applied", [slam(4), slam(3)])).toBe(true);
  });
  it("validates 115 experiment profiles at default and one-parameter endpoints", () => {
    const pedagogicalErrors: Record<string, RegExp> = {
      "research-permutation": /每组至少/,
      "sensor-calibration": /高温参考码/,
      optimization: /发散/,
      quorum: /可达数/,
      replication: /可达副本/,
      balancing: /故障实例/,
    };
    expect(Object.keys(labs)).toHaveLength(115);
    for (const [id, lab] of Object.entries(labs)) {
      const initial = Object.fromEntries(
        lab.controls.map((control) => [control.key, control.initial]),
      );
      const variants = [
        initial,
        ...lab.controls.flatMap((control) =>
          [control.min, control.max].map((x) => ({
            ...initial,
            [control.key]: x,
          })),
        ),
      ];
      for (const values of variants) {
        let result;
        try {
          result = runLab(id, values, lab.text?.initial ?? "");
        } catch (error) {
          expect(values, id).not.toBe(initial);
          expect(String(error), id).toMatch(pedagogicalErrors[id] ?? /^never$/);
          continue;
        }
        expect(
          result.metrics.every(
            ([, v]) => typeof v !== "number" || Number.isFinite(v),
          ),
          id,
        ).toBe(true);
        expect(
          (result.points ?? []).every(
            ({ x, y }) => Number.isFinite(x) && Number.isFinite(y),
          ),
          id,
        ).toBe(true);
      }
    }
  });
});
describe("Final QA authored material", () => {
  it("links each new question, proof, and source to an existing topic", () => {
    for (const id of new Set([
      ...Object.keys(qaFixedQuestions),
      ...Object.keys(qaVariants),
      ...Object.keys(qaEnrichment),
      ...Object.keys(qaSources),
    ])) {
      expect(findP4Lesson(id), id).toBeDefined();
      for (const q of [...reasoningQuestions(id), ...reasoningQuestions(id, 7)])
        expect(questionSchema.safeParse(q).success, id).toBe(true);
      for (const block of qaEnrichment[id] ?? []) {
        if (block.type !== "sequence") continue;
        for (const step of block.steps)
          if (step.formula)
            expect(renderFormula(step.formula, true), id).not.toBeNull();
      }
    }
  });
  it("checks structured representations and derived answers from unrelated computation", () => {
    const dft = qaFixedQuestions["k-546ec0001b2b"]!;
    expect(evaluate(dft, "3,0;1,-2;-1,0;1,2").status).toBe("correct");
    expect(evaluate(dft, "3,0;1,2;-1,0;1,-2").status).toBe("incorrect");
    const heat = qaFixedQuestions["k-6428532dca21"]!;
    expect(evaluate(heat, ["2", "4", "0", "8"]).status).toBe("correct");
    const test = qaFixedQuestions["k-c47d7505d81e"]!;
    expect(evaluate(test, ["5/16", "4", "1/16", "81/256"]).status).toBe(
      "correct",
    );
  });
});
const python = ["python3", "python"].find(
  (executable) => spawnSync(executable, ["--version"]).status === 0,
);
it.skipIf(!python)(
  "runs both reference implementations of the seven new programming exercises",
  () => {
    const copies = Object.entries(qaPrograms).map(([id, definition]) => ({
      name: definition.name,
      scratch: definition.scratch,
      library: definition.library,
      cases: [
        ...definition.cases,
        ...[1, 3, 7, 10].map((n) =>
          advancedProgram(id, n)!.question.cases.at(-1),
        ),
      ],
    }));
    const script = `import json, math, sys
total=0
for job in json.load(sys.stdin):
    for side in ('scratch','library'):
        scope={}
        exec(job[side],scope)
        for case in job['cases']:
            answer=scope[job['name']](*case['args'])
            assert math.isclose(answer,case['expected'],abs_tol=1e-6), (job['name'],side,case,answer)
            total+=1
print(total)`;
    const outcome = spawnSync(python!, ["-I", "-c", script], {
      input: JSON.stringify(copies),
      encoding: "utf8",
      timeout: 3000,
    });
    expect(outcome.stderr).toBe("");
    expect(outcome.status).toBe(0);
    expect(Number(outcome.stdout)).toBe(112);
  },
);
