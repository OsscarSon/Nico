import { describe, expect, it } from "vitest";
import { definitions, findP4Lesson } from "../src/content/academy2/advanced";
import available from "../src/content/academy2/advanced/available.json";
import { reusedTopics } from "../src/content/academy2/advanced/legacy";
import { enrichment } from "../src/content/academy2/advanced/enrichment";
import {
  advancedProgram,
  advancedPrograms,
} from "../src/content/academy2/advanced/programs";
import { findKnowledge } from "../src/content/academy2/knowledgeRegistry";
import {
  topicLessonSchema,
  questionSchema,
} from "../src/content/academy2/teaching/schema";
import { renderFormula } from "../src/features/academy2/teaching/renderFormula";
import {
  auditGraph,
  knowledgeEdges,
} from "../src/content/academy2/knowledgeGraph";
import { labs, runLab } from "../src/grading/academy2/advanced/labs";
import {
  compensatedSum,
  dft,
  heat,
  information,
  integrate,
  interpolate,
  minimizeQuartic,
  ode,
  packing,
  plu,
  thinQr,
} from "../src/grading/academy2/advanced/numerics";
import {
  bernoulliEstimate,
  bootstrap,
  forecastAR,
  kaplanMeier,
  markov,
  monteCarloPi,
  multipleTests,
  normalChain,
  standardizedDifference,
} from "../src/grading/academy2/advanced/statistics";
import {
  emit,
  fold,
  interpret,
  parse,
  run,
  scan,
} from "../src/grading/academy2/advanced/compiler";
import {
  roundRobin,
  waitCycle,
  lru,
  windows,
} from "../src/grading/academy2/advanced/systems";
import {
  attention,
  conv2d,
  decoderBlock,
  quantize,
  trainCorridor,
} from "../src/grading/academy2/advanced/learning";
import { verifyProject } from "../src/grading/academy2/advanced/projectEvidence";

describe("P4 course and experiment contract", () => {
  it("registers only fully linked lesson pages under existing identities", () => {
    expect([...available].sort()).toEqual(Object.keys(definitions).sort());
    for (const id of available) {
      const item = findP4Lesson(id)!;
      expect(item?.id).toBe(id);
      expect(item.spec.questions.length).toBe(4);
      for (const formula of item.spec.formulas)
        expect(renderFormula(formula, true), id).not.toBeNull();
      expect(topicLessonSchema.safeParse(item.lesson).success, id).toBe(true);
    }
    for (const { topic } of reusedTopics)
      expect(findKnowledge(topic)?.id).toBe(topic);
    for (const [id, blocks] of Object.entries(enrichment)) {
      expect(available, id).toContain(id);
      for (const block of blocks) {
        if (block.type !== "sequence" && block.type !== "example") continue;
        for (const { formula } of block.steps) {
          if (formula) expect(renderFormula(formula, true), id).not.toBeNull();
        }
      }
    }
    expect(auditGraph(knowledgeEdges)).toEqual([]);
  });
  it("executes every lab's initial input and generates real case variants", () => {
    for (const [id, definition] of Object.entries(labs)) {
      const input = Object.fromEntries(
        definition.controls.map((c) => [c.key, c.initial]),
      );
      const output = runLab(id, input, definition.text?.initial ?? "");
      expect(output.metrics.length, id).toBeGreaterThan(0);
      expect(
        output.metrics.some(
          ([, value]) => typeof value === "number" && !Number.isFinite(value),
        ),
        id,
      ).toBe(false);
    }
    for (const key of Object.keys(advancedPrograms)) {
      const base = advancedProgram(key)!.question,
        variant = advancedProgram(key, 7)!.question;
      expect(variant.cases.length).toBe(base.cases.length + 2);
      expect(variant.cases).not.toEqual(
        advancedProgram(key, 4)!.question.cases,
      );
      expect(questionSchema.safeParse(variant).success, key).toBe(true);
    }
    expect(() => runLab("ode", { steps: -1 }, "")).toThrow(/超出/);
  });
});

describe("independent advanced numerical examples", () => {
  it("recovers cancellation, exact polynomials, and Fourier symmetry", () => {
    expect(compensatedSum([1e16, 1, -1e16])).toBe(1);
    expect(compensatedSum([])).toBe(0);
    expect(integrate((x) => x * x, 0, 2, 4).simpson).toBeCloseTo(8 / 3, 14);
    expect(integrate((x) => x * x, 2, 0, 4).simpson).toBeCloseTo(-8 / 3, 14);
    expect(() => integrate((x) => x, 0, 1, 5)).toThrow();
    expect(interpolate([0, 1, 2], [1, 2, 5], 1.5)).toBeCloseTo(3.25, 14);
    expect(dft([1, 0, -1, 0]).map((row) => Math.round(row.real))).toEqual([
      0, 2, 0, 2,
    ]);
    expect(information([0.5, 0.5], [0.25, 0.75]).kl).toBeCloseTo(
      Math.log2(4 / 3) / 2,
      14,
    );
    expect(information([0.5, 0.5], [1, 0]).kl).toBe(Infinity);
  });
  it("reconstructs pivoted LU and orthogonality, checks DE and optimization in separate calculations", () => {
    const A = [
        [0, 1, 2],
        [4, 6, 3],
        [2, 8, 1],
      ],
      { lower: l, upper: u, permutation: p } = plu(A);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(l[i]!.reduce((sum, v, k) => sum + v * u[k]![j]!, 0)).toBeCloseTo(
          A[p[i]!]![j]!,
          12,
        );
    expect(() =>
      plu([
        [1, 2],
        [2, 4],
      ]),
    ).toThrow(/奇异/);
    const { q, r } = thinQr(A);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        expect(q.reduce((sum, row) => sum + row[i]! * row[j]!, 0)).toBeCloseTo(
          Number(i === j),
          12,
        );
        expect(q[i]!.reduce((sum, v, k) => sum + v * r[k]![j]!, 0)).toBeCloseTo(
          A[i]![j]!,
          12,
        );
      }
    const path = ode((_, y) => -2 * y, 1, 0.1, 10, "rk4");
    expect(path.at(-1)!.y).toBeCloseTo(Math.exp(-2), 4);
    expect(heat([0, 4, 0], 0.25, 1)).toEqual([1, 2, 1]);
    expect(() => heat([1, 2], 0.55, 2)).toThrow(/扩散/);
    const x = minimizeQuartic(1.5, "newton", 0.15, 8).at(-1)!.x;
    expect(x ** 3 + 2 * x - 2).toBeCloseTo(0, 12);
    expect(packing(3, 5, 7)).toMatchObject({ integer: [2, 1], objective: 11 });
  });
  it("checks closed-form clinical and sampling examples", () => {
    expect(bernoulliEstimate(7, 3, 2, 2)).toMatchObject({
      mle: 0.7,
      map: 2 / 3,
      a: 9,
      b: 5,
      average: 9 / 14,
    });
    expect(bootstrap([8, 8, 8], 40, 3).standardError).toBe(0);
    expect(monteCarloPi(4000, 42).value).toBeCloseTo(Math.PI, 1);
    const chain = normalChain(5000, 1.5, 69);
    expect(Math.abs(chain.mean)).toBeLessThan(0.15);
    expect(chain.variance).toBeGreaterThan(0.8);
    expect(markov(0, 0.3, 0.2, 2).prob[2]!.y).toBeCloseTo(0.45);
    expect(forecastAR([1, 3, 7, 15]).forecast).toBeCloseTo(31);
    expect(
      kaplanMeier([
        { time: 1, event: true },
        { time: 2, event: false },
        { time: 3, event: true },
      ]).map((row) => row.survival),
    ).toEqual([1 - 1 / 3, 1 - 1 / 3, 0]);
    expect(multipleTests([0.004, 0.021, 0.038, 0.5], 0.05)).toEqual({
      bonferroni: [true, false, false, false],
      bh: [true, true, false, false],
    });
    const d = standardizedDifference([
      {
        treated: 80,
        treatedEvent: 40,
        controls: 20,
        controlEvent: 12,
        weight: 0.5,
      },
      {
        treated: 20,
        treatedEvent: 2,
        controls: 80,
        controlEvent: 16,
        weight: 0.5,
      },
    ]);
    expect(d.crude).toBeCloseTo(0.14);
    expect(d.adjusted).toBeCloseTo(-0.1);
  });
});

describe("P4 interactive computation and evidence", () => {
  it("validates token locations, folding and actual compilation against AST interpretation", () => {
    const tokens = scan("a+23 * (2-1)");
    expect(tokens[2]).toMatchObject({ text: "23", offset: 2 });
    const ast = parse(tokens);
    const environment = new Map([["a", 9]]);
    expect(interpret(ast, environment)).toBe(32);
    expect(run(emit(fold(ast)), environment).value).toBe(32);
    expect(emit(fold(ast)).length).toBeLessThan(emit(ast).length);
    expect(() => parse(scan("7 (8)"))).toThrow();
    expect(() => scan("1$")).toThrow(/未知/);
  });
  it("simulates deterministic schedule, deadlock and event time windows", () => {
    const { trace, done } = roundRobin(
      [
        { id: "a", release: 0, duration: 3 },
        { id: "b", release: 0, duration: 2 },
      ],
      2,
    );
    expect(trace.map((i) => [i.id, i.start, i.end])).toEqual([
      ["a", 0, 2],
      ["b", 2, 4],
      ["a", 4, 5],
    ]);
    expect(done.map((i) => i.wait)).toEqual([2, 2]);
    expect(
      waitCycle([
        ["a", "b"],
        ["b", "a"],
      ]),
    ).toEqual(["a", "b", "a"]);
    expect(
      waitCycle([
        ["a", "b"],
        ["b", "c"],
      ]),
    ).toEqual([]);
    expect(lru("ABACB".split(""), 2)).toMatchObject({ hits: 1, misses: 4 });
    const events = [
      { id: "a", time: 1, value: 3 },
      { id: "b", time: 20, value: 1 },
      { id: "a", time: 1, value: 3 },
      { id: "c", time: 4, value: 2 },
    ];
    expect(windows(events, 10, 5)).toMatchObject({
      emitted: [[0, 3]],
      duplicates: ["a"],
      late: ["c"],
    });
  });
  it("checks convolution, causal safety and real convergence", () => {
    expect(conv2d([[0, 1, 1]], [[-1, 1]])).toEqual([[1, 0]]);
    expect(
      attention([[1], [1]], [[0], [Math.log(3)]], [[2], [6]]).embeddings[0]![0],
    ).toBeCloseTo(5);
    expect(
      attention([[1], [1]], [[0], [Math.log(3)]], [[2], [6]], true)
        .embeddings[0],
    ).toEqual([2]);
    const a = decoderBlock([
        [1, 0],
        [1, 1],
        [2, 2],
      ]),
      b = decoderBlock([
        [1, 0],
        [1, 1],
        [-2, 2],
      ]);
    expect(a.output.slice(0, 2)).toEqual(b.output.slice(0, 2));
    const rollout = trainCorridor(5, 120, 0.4, 0.9, 0.2, 37);
    expect(rollout.policy).toEqual(["右", "右", "右", "右"]);
    expect(quantize([-3, 0.4, 3], 3).restored).toEqual([-3, 0, 3]);
  });
  it("requires changed input and result for a project export", () => {
    const record = (reachable: number) => ({
      inputs: { nodes: 5, reachable, stale: 0 },
      text: "",
      result: runLab("quorum", { nodes: 5, reachable, stale: 0 }, ""),
    });
    expect(verifyProject("advanced-systems", [record(3), record(2)])).toBe(
      true,
    );
    expect(verifyProject("advanced-systems", [record(3), record(4)])).toBe(
      false,
    );
    expect(verifyProject("advanced-systems", [record(3)])).toBe(false);
  });
});

describe("P4 project-quality edge cases", () => {
  it("interprets editable event logs and rejects invalid timestamps", () => {
    const raw = "id,time,value\n01,1,3\n02,20,1\n01,1,3\n03,4,2";
    const out = runLab("streaming", { lateness: 5 }, raw);
    expect(out.metrics).toContainEqual(["迟到数", 1]);
    expect(out.metrics).toContainEqual(["重复事件", 1]);
    expect(() =>
      runLab("streaming", { lateness: 5 }, "id,time,value\n0,-1,3"),
    ).toThrow(/非负整数/);
    expect(
      runLab("index", { page: 3, start: 5, width: 3 }, "").metrics,
    ).toContainEqual(["匹配键数", 4]);
    expect(runLab("snapshot", { revision: 5 }, "").metrics).toContainEqual([
      "快照值合计",
      6,
    ]);
  });
  it("keeps commit, healthy routing and authorization cases distinct", () => {
    expect(
      runLab("replication", { reachable: 3, ack: 2 }, "").metrics,
    ).toContainEqual(["允许提交", "否"]);
    expect(
      runLab("replication", { reachable: 3, ack: 3 }, "").metrics,
    ).toContainEqual(["允许提交", "是"]);
    expect(
      runLab("transactions", { vote: 1, durable: 0 }, "").metrics,
    ).toContainEqual(["准备中", 2]);
    expect(
      runLab("transactions", { vote: 1, durable: 1 }, "").metrics,
    ).toContainEqual(["完成决定", "commit"]);
    expect(
      runLab("gateway", { auth: 0, online: 1 }, "/loans").metrics,
    ).toContainEqual(["实际新增数", 0]);
    expect(
      runLab("gateway", { auth: 1, online: 1 }, "/loans").metrics,
    ).toContainEqual(["实际新增数", 1]);
    expect(
      runLab("balancing", { replicas: 4, down: 1, jobs: 17 }, "").metrics,
    ).toContainEqual(["各实例请求数", "0, 6, 6, 5"]);
  });
  it("checks gradient paths and real probability/counting results on known small samples", () => {
    expect(runLab("backprop", { x: 2, a: 3 }, "").metrics).toContainEqual([
      "反向梯度",
      13,
    ]);
    expect(runLab("bigram", {}, "a\na b a b a c").metrics).toContainEqual([
      "最高概率后继",
      "b",
    ]);
    expect(runLab("graphai", { node: 6, edge: 1 }, "").metrics).toContainEqual([
      "节点 2 输出",
      3,
    ]);
    expect(
      runLab("vision", { offset: 1, cutoff: 0.5 }, "").metrics,
    ).toContainEqual(["框 IoU", 0.5]);
    expect(
      runLab("federated", { second: 5, rounds: 1 }, "").metrics,
    ).toContainEqual(["样本数加权参数", 0.4]);
  });
});
