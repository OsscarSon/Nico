import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { academyCourses } from "../src/content/academy2/model";
import available from "../src/content/academy2/applied/available.json";
import { findP4Lesson } from "../src/content/academy2/advanced";
import { advancedProgram } from "../src/content/academy2/advanced/programs";
import { additionalPrograms } from "../src/content/academy2/applied/programs";
import { p4TopicsIn } from "../src/content/academy2/advanced/registry";
import { reasoningQuestions } from "../src/content/academy2/applied/reasoning";
import { evaluate } from "../src/grading/academy2/teaching/questions";
import { evaluateComparison } from "../src/grading/academy2/advanced/labEvidence";
import type { LabRecord } from "../src/grading/academy2/advanced/projectEvidence";
import * as compute from "../src/grading/academy2/applied/compute";
import { exactRandomization } from "../src/grading/academy2/applied/research";
import {
  closedLoop,
  mobileRestore,
  recordTelemetry,
  scheduleWorkflow,
  sensorCalibration,
} from "../src/grading/academy2/applied/workflows";
import {
  microObjective,
  trainMicro,
  trainSlippingPolicy,
} from "../src/grading/academy2/applied/training";

describe("P5 context and references", () => {
  it("preserves the 30 courses and attaches new teaching to all 50 planned identities", () => {
    expect(academyCourses).toHaveLength(30);
    const courses = [
      "foundation-applied",
      "intermediate-applied",
      "advanced-applied",
    ];
    const lists = courses.map(p4TopicsIn);
    expect(lists.map((ids) => ids.length)).toEqual([14, 16, 20]);
    expect(lists.flat().sort()).toEqual([...available].sort());
    for (const id of available) {
      const { lesson, spec } = findP4Lesson(id)!;
      expect(spec.theory.length, id).toBeGreaterThanOrEqual(2);
      expect(spec.example.steps.length, id).toBeGreaterThanOrEqual(3);
      expect(
        lesson.blocks.find((block) => block.type === "references")?.items[0]
          ?.url,
        id,
      ).toMatch(/^https?:\/\//);
    }
  });

  it("keeps independently evaluated matrix, matching and scalar sequence outcomes", () => {
    const matrix = reasoningQuestions("k-74f74b2295b6")[0]!;
    expect(evaluate(matrix, "1/2,1/2;1/2,-1/2").status).toBe("correct");
    expect(evaluate(matrix, "0.5,0.5;0.5,0.5").status).toBe("incorrect");
    const q = reasoningQuestions("k-f83593e899a9", 9)[0]!;
    expect(evaluate(q, ["2/3", "13", "6"]).status).toBe("correct");
    expect(evaluate(q, ["2/3", "13", "7"]).status).toBe("incorrect");
    expect(q.id).not.toEqual(reasoningQuestions("k-f83593e899a9", 2)[0]!.id);
    const order = reasoningQuestions("k-b6c16354b041")[0]!;
    expect(
      evaluate(order, ["choice-2", "choice-1", "choice-3", "choice-0"]).status,
    ).toBe("correct");
  });
});

describe("P5 laboratory models against independent examples", () => {
  it("checks work-item dependencies, persisted state, telemetry and exact experimental inference", () => {
    expect(scheduleWorkflow("A,3\nB,5\nC,4,A,B\nD,2,C").elapsed).toBe(11);
    expect(() => scheduleWorkflow("A,1,B\nB,2,A")).toThrow(/循环/);
    expect(() => scheduleWorkflow("A,1,Z")).toThrow(/未定义/);
    expect(
      mobileRestore(["edit:4", "save", "edit:8", "kill", "open"]).draft,
    ).toBe(4);
    expect(mobileRestore(["edit:8", "kill", "open"]).draft).toBe(0);
    expect(recordTelemetry("7 10 8 8")).toMatchObject({
      missing: [9],
      unique: 3,
    });
    expect(sensorCalibration(100, 500, 280, 0)).toMatchObject({
      temperature: 23,
      inRange: true,
    });
    expect(closedLoop(0.9, 0.4, 3, 2).points[2]!.y).toBeCloseTo(0.18);
    const sample = exactRandomization("1 2 3 7 8 9", 3);
    expect(sample).toMatchObject({
      observed: -6,
      draws: 20,
      extreme: 2,
      p: 0.1,
    });
  });
  it("separates render intervals from motion, rejects illegal events and handles boundary contacts", () => {
    for (const frame of [13, 30, 55]) {
      expect(compute.gameFrames(frame).at(-1)).toEqual({
        time: 1000,
        position: 6,
        accumulator: 0,
      });
    }
    expect(compute.overlap(0, 0, 3, 3, 3, 0, 3, 3).area).toBe(0);
    expect(compute.overlap(0, 0, 3, 3, 2, 2, 3, 3).area).toBe(1);
    expect(
      compute
        .stateTrace(["start", "pause", "finish", "constructor", "resume"])
        .map((x) => x.accepted),
    ).toEqual([true, true, false, false, true]);
    expect(compute.behavior(7, 0)).toEqual({ choice: "evade", tested: [true] });
  });
  it("preserves circuit limits, writes each business event once, and accounts for queue losses", () => {
    expect(compute.electronics(5, 250, 2.5, 40)).toEqual({
      milliamps: 20,
      watts: 0.1,
      adc: 512,
      average: 2,
    });
    expect(compute.electronics(5, 250, 5, 0).adc).toBe(1023);
    const run = compute.workflow(
      "a,8,record\na,8,record\na,9,record\nb,4,record\nc,5,record",
      5,
      false,
    );
    expect(run.trace.map((x) => x.status)).toEqual([201, 200, 409, 422, 201]);
    expect(run.total).toBe(13);
    expect(compute.workflow("a,,record", 0, false).trace[0]?.status).toBe(400);
    const mailbox = compute.mailbox(1, 3, 2);
    expect(mailbox.completed + mailbox.drops + mailbox.backlog).toBe(60);
    expect(compute.sampleSignals(10, 23).fold).toBe(3);
    expect(compute.periodicSchedule(5, 2, 10, 3).misses).toBe(0);
    expect(compute.periodicSchedule(5, 4, 10, 9).misses).toBeGreaterThan(0);
  });
  it("checks independent geometry, localization, optics and financial cases", () => {
    const { pose, landmark, residuals } = compute.landmarkMap(3, 7, 2, 0);
    expect(pose).toBeCloseTo(11 / 3);
    expect(landmark).toBeCloseTo(19 / 3);
    expect(residuals[0]! - residuals[2]!).toBeCloseTo(0);
    expect(residuals[1]! + residuals[2]!).toBeCloseTo(0);
    expect(compute.robotPose(0.75, 0.75, 0.4, 4)).toEqual({
      x: 3,
      y: 0,
      angle: 0,
    });
    expect(compute.bayesSensor(4, 7, 2, 1).posterior).toBe(6);
    const particles = compute.particleSensor(45, 1, 0.8, 48);
    expect(particles.residues.reduce((s, w) => s + w, 0)).toBeCloseTo(1);
    expect(particles.resampled).toHaveLength(48);
    expect(compute.planGrid("S#G\n...").path).toHaveLength(5);
    expect(compute.planGrid("S#G\n###").path).toEqual([]);
    expect(compute.vision("17\n83", 7).centroid).toEqual({ x: 0.5, y: 0.5 });
    expect(compute.dielectric(0.6, 0.5, 0.4).reflectance).toBeCloseTo(0.07);
    expect(compute.dielectric(0.6, 1, 0.4).normalDensity).toBeGreaterThan(
      compute.dielectric(0.6, 1, 0.8).normalDensity,
    );
    expect(compute.geoDistance(0, 179, 0, -179)).toBeCloseTo(
      (6371.0088 * Math.PI) / 90,
    );
    expect(compute.alignSequences("AB", "BA").distance).toBe(2);
    expect(compute.discounted([-100, 0, 144], 0.2)).toBeCloseTo(0);
    expect(compute.quantumInterference(180, true).probabilities[0]).toBeCloseTo(
      0,
    );
    expect(
      compute.quantumInterference(180, false).probabilities[0],
    ).toBeCloseTo(0.5);
  });
  it("only checks a prediction against a distinct, controlled run", () => {
    const state = (
      controls: Record<string, number>,
      metric: number,
    ): LabRecord => ({
      inputs: controls,
      text: "fixed",
      result: { metrics: [["area", metric]], trace: null },
    });
    const a = state({ x: 2, y: 1 }, 4);
    expect(
      evaluateComparison(a, state({ x: 3, y: 1 }, 6), "area", "up"),
    ).toMatchObject({ status: "correct", actual: "up" });
    expect(
      evaluateComparison(a, state({ x: 3, y: 1 }, 6), "area", "same"),
    ).toMatchObject({ status: "incorrect", actual: "up" });
    expect(
      evaluateComparison(a, state({ x: 3, y: 0 }, 6), "area", "up").status,
    ).toBe("invalid");
    expect(evaluateComparison(a, a, "area", "same").status).toBe("invalid");
  });
});

describe("P5 small-model training", () => {
  it("fits learned parameters and reports genuinely held-out results for each model", () => {
    for (const model of [
      "cnn",
      "decoder",
      "vae",
      "diffusion",
      "lora",
    ] as const) {
      const run = trainMicro(model, 120, 0.06, 13);
      expect(run.records.at(-1)!.y, model).toBeLessThan(run.records[0]!.y);
      expect(run.evaluated, model).toBeLessThan(run.initialTest);
      expect([run.training, run.test, run.records.length]).toEqual([
        28, 24, 121,
      ]);
      expect(run).toEqual(trainMicro(model, 120, 0.06, 13));
    }
    expect(trainMicro("lora", 120, 0.06, 13).example).toMatchObject({
      base: [
        [1, 0],
        [0, 0.5],
      ],
    });
    expect(
      (
        trainMicro("lora", 120, 0.06, 13).example as {
          deltaDeterminant: number;
        }
      ).deltaDeterminant,
    ).toBeCloseTo(0);
  });
  it("checks convolution gradients against a separate scalar objective and protects causal masking", () => {
    const input = [0.3, 0.6, -0.4, 0.5],
      target = 0.3,
      parameters = [0.4, 0.3, 0.15];
    const objective = ([a, b, c]: number[]) =>
      ((Math.tanh(a! * input[0]! + b! * input[1]! + c!) +
        Math.tanh(a! * input[2]! + b! * input[3]! + c!)) /
        2 -
        target) **
      2;
    const result = microObjective("cnn", parameters, [
      { features: input, target: [target] },
    ]);
    expect(result.loss).toBeCloseTo(objective(parameters));
    for (let i = 0; i < parameters.length; i++) {
      const shifted = (h: number) =>
        parameters.map((w, j) => (j === i ? w + h : w));
      expect(result.gradient[i]).toBeCloseTo(
        (objective(shifted(1e-5)) - objective(shifted(-1e-5))) / 2e-5,
        6,
      );
    }
    const original = [0.1, 4, 0.8, 2, 10, 300, -10, -300, 1];
    const shifted = original.map((v, i) => (i >= 4 && i < 8 ? v * 11 : v));
    expect(
      microObjective(
        "decoder",
        [0.7, 0.5, 1],
        [{ features: original, target: [0.4] }],
      ),
    ).toEqual(
      microObjective(
        "decoder",
        [0.7, 0.5, 1],
        [{ features: shifted, target: [0.4] }],
      ),
    );
  });
  it("uses action outcomes, tests a separate seed, and matches a deterministic control oracle", () => {
    const run = trainSlippingPolicy(5, 0, 250, 13);
    const expected = -0.04 * (1 + 0.9 + 0.9 ** 2) + 0.9 ** 3;
    expect(run.analytic).toBeCloseTo(expected);
    expect(run.heldOut).toBeCloseTo(expected);
    expect(run.solved).toBe(60);
    expect(run.evaluationSeed).not.toBe(13);
  });
});

const python = ["python3", "python"].find(
  (bin) => spawnSync(bin, ["--version"]).status === 0,
);
it.skipIf(!python)(
  "runs both Python implementations for every new programming fixture and seed variant",
  () => {
    const fixtures = Object.entries(additionalPrograms).map(([id, spec]) => ({
      ...spec,
      cases: [
        ...spec.cases,
        ...[1, 3, 7, 10].map((seed) =>
          advancedProgram(id, seed)!.question.cases.at(-1)!,
        ),
      ],
    }));
    const reference = `import json,math,sys
cases=json.load(sys.stdin)
for spec in cases:
    for implementation in ('scratch','library'):
        scope={}
        exec(spec[implementation],scope)
        function=scope[spec['name']]
        for item in spec['cases']:
            output=function(*item['args'])
            assert math.isclose(output,item['expected'],abs_tol=1e-6), (spec['name'],implementation,item,output)
print(sum(2*len(spec['cases']) for spec in cases))`;
    const results = spawnSync(python!, ["-I", "-c", reference], {
      input: JSON.stringify(fixtures),
      encoding: "utf8",
      timeout: 2000,
    });
    expect(results.stderr).toBe("");
    expect(results.status).toBe(0);
    expect(Number(results.stdout)).toBe(16 * 16);
  },
);
