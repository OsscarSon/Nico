import { describe, expect, it } from "vitest";
import { irisTable } from "../src/content/academy2/data/datasets";
import {
  experiment,
  initialOptions,
  type SplitOptions,
} from "../src/grading/academy2/data/ml";
import {
  fit,
  logitLoss,
  neuralObjective,
  type NeuralParameters,
} from "../src/grading/academy2/data/ml-models";
import {
  multiclassMetrics,
  softmax,
  softmaxObjective,
} from "../src/grading/academy2/data/ml-multiclass";
import { compareOnHoldout } from "../src/grading/academy2/data/projects";
import { tableFingerprint } from "../src/grading/academy2/data/tableFingerprint";

describe("P4 held-out evaluation", () => {
  it("rejects comparisons with modified values despite identical row memberships", () => {
    const left = experiment(irisTable, initialOptions, "development");
    const rightOption = { ...initialOptions, model: "tree" as const };
    const changed = {
      ...irisTable,
      rows: irisTable.rows.map((row, i) =>
        i === 0 ? [99, ...row.slice(1)] : row,
      ),
    };
    const right = experiment(changed, rightOption, "development");
    expect(right.partition).toEqual(left.partition);
    expect(right.fingerprint).not.toBe(left.fingerprint);
    expect(compareOnHoldout(left, right)).toBe(false);
    expect(
      compareOnHoldout(
        left,
        experiment(structuredClone(irisTable), rightOption, "development"),
      ),
    ).toBe(true);
    expect(
      compareOnHoldout(
        left,
        experiment(
          irisTable,
          { ...rightOption, threshold: 0.75 },
          "development",
        ),
      ),
    ).toBe(false);
    expect(tableFingerprint({ columns: ["x"], rows: [[9]] })).not.toBe(
      tableFingerprint({ columns: ["x"], rows: [["9"]] }),
    );
    expect(tableFingerprint(irisTable)).not.toBe(
      tableFingerprint({ ...irisTable, rows: [...irisTable.rows].reverse() }),
    );
  });

  it("keeps the withheld scores, labels, coordinates and row IDs out of development results", () => {
    const h = {
      ...initialOptions,
      model: "softmax",
      mode: "multiclass",
    } satisfies SplitOptions;
    const development = experiment(irisTable, h, "development");
    const final = experiment(irisTable, h, "final");
    expect(development.test).toBeUndefined();
    expect(development.partition?.test).toEqual([]);
    expect(development.values?.filter((row) => row.subset === "test")).toEqual(
      [],
    );
    expect(development.points).toHaveLength(development.validationSize);
    expect(final.test?.kind).toBe("multiclass");
    expect(final.partition?.test).toHaveLength(final.testSize);
    expect(final.points).toHaveLength(final.testSize);
    expect(final.validation).toEqual(development.validation);
    expect(final.weights).toEqual(development.weights);
    expect(() =>
      experiment(irisTable, { ...h, leakDemo: true }, "final"),
    ).toThrow(/泄漏/);
  });
});

describe("P4 independent model calculations", () => {
  it("matches an independently calculated confusion matrix and F1 with unequal class sizes", () => {
    const scores = multiclassMetrics(
      [0, 0, 0, 1, 1, 2],
      [0, 0, 1, 1, 2, 2],
      ["a", "b", "c"],
    );
    expect(scores.matrix).toEqual([
      [2, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ]);
    expect(scores.accuracy).toBeCloseTo(4 / 6);
    expect(scores.macroF1).toBeCloseTo((4 / 5 + 1 / 2 + 2 / 3) / 3);
    expect(scores.microF1).toBeCloseTo(4 / 6);
    expect(scores.weightedF1).toBeCloseTo(
      ((3 * 4) / 5 + (2 * 1) / 2 + 2 / 3) / 6,
    );
    expect(() => multiclassMetrics([0], [4], ["a", "b"])).toThrow();
  });

  it("uses stable cross-entropy, converges and handles deterministic stratification", () => {
    expect(softmax([10000, 10000, 9950]).slice(0, 2)).toEqual([0.5, 0.5]);
    softmax([0, Math.log(2), Math.log(3)]).forEach((value, i) =>
      expect(value).toBeCloseTo((i + 1) / 6, 14),
    );
    expect(logitLoss(0, 1000)).toBe(1000);
    expect(logitLoss(1, -1000)).toBe(1000);
    expect(logitLoss(1, 1000)).toBe(0);
    const options = {
      ...initialOptions,
      mode: "multiclass",
      model: "softmax",
      epochs: 250,
      query: [5, 1.7],
    } satisfies SplitOptions;
    const r = experiment(irisTable, options);
    expect(r.classNames).toEqual(["setosa", "versicolor", "virginica"]);
    expect(r.losses[0]).toBeCloseTo(Math.log(3));
    expect(r.losses.at(-1)!).toBeLessThan(r.losses[0]!);
    expect(
      r.test?.kind === "multiclass" &&
        r.test.matrix.map((row) => row.reduce((a, b) => a + b)),
    ).toEqual([10, 10, 10]);
    expect(r.test?.kind === "multiclass" && r.test.accuracy).toBeGreaterThan(
      0.8,
    );
    expect(r.queryProbabilities?.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1);
    expect(experiment(irisTable, options).partition).toEqual(r.partition);
    const rare = {
      ...irisTable,
      rows: [
        [...irisTable.rows[0]!.slice(0, -1), "rare"],
        ...irisTable.rows.slice(1),
      ],
    };
    expect(() => experiment(rare, options)).toThrow(/至少需要三条/);
  });

  it("checks every gradient coordinate against separately written scalar objectives", () => {
    const samples = [
      { x: [1, -2], y: 0 },
      { x: [-0.2, 1.4], y: 1 },
    ];
    const reg = 0.1;
    const eps = 1e-5;
    const central = (
      objective: (x: number[]) => number,
      initial: number[],
      j: number,
    ) => {
      const shifted = (by: number) =>
        initial.map((value, i) => value + (i === j ? by : 0));
      return (objective(shifted(eps)) - objective(shifted(-eps))) / (2 * eps);
    };
    const flat = [0.1, 0.3, -0.8, 0.5, -0.2, 0.4, 0.9, -0.4, 0.7];
    const softObjective = (w: number[]) => {
      const penalty =
        ([1, 2, 4, 5, 7, 8].reduce((sum, i) => sum + w[i]! ** 2, 0) * reg) / 2;
      return (
        penalty -
        samples.reduce((sum, { x: [a, b], y }) => {
          const likelihood = [0, 3, 6].map((i) =>
            Math.exp(w[i]! + w[i + 1]! * a! + w[i + 2]! * b!),
          );
          return (
            sum +
            Math.log(likelihood[y]! / likelihood.reduce((x, y) => x + y)) /
              samples.length
          );
        }, 0)
      );
    };
    const soft = softmaxObjective(
      samples,
      [flat.slice(0, 3), flat.slice(3, 6), flat.slice(6)],
      reg,
    );
    expect(soft.loss).toBeCloseTo(softObjective(flat), 10);
    soft.gradient
      .flat()
      .forEach((coordinate, j) =>
        expect(coordinate).toBeCloseTo(central(softObjective, flat, j), 7),
      );

    const params: NeuralParameters = {
      bias: 0.1,
      hiddenBias: [0.3, -0.8],
      output: [0.5, -0.2],
      input: [
        [0.4, 0.9],
        [-0.4, 0.7],
      ],
    };
    const neuralRef = ([b, c, d, weights0, weights1, a, e, f, g]: number[]) =>
      (reg *
        (weights0! ** 2 +
          weights1! ** 2 +
          a! ** 2 +
          e! ** 2 +
          f! ** 2 +
          g! ** 2)) /
        2 -
      samples.reduce((sum, { x: [x, y], y: label }) => {
        const logOdds =
          b! +
          weights0! * Math.tanh(c! + a! * x! + e! * y!) +
          weights1! * Math.tanh(d! + f! * x! + g! * y!);
        const prob = 1 / (1 + Math.exp(-logOdds));
        return sum + Math.log(label ? prob : 1 - prob) / samples.length;
      }, 0);
    const {
      gradient: { bias, hiddenBias, output, input },
      loss,
    } = neuralObjective(samples, params, reg);
    expect(loss).toBeCloseTo(neuralRef(flat), 10);
    [bias, ...hiddenBias, ...output, ...input.flat()].forEach((coordinate, j) =>
      expect(coordinate).toBeCloseTo(central(neuralRef, flat, j), 7),
    );
    const fitted = fit("neural", samples, { ...initialOptions, epochs: 100 });
    expect(fitted.losses.at(-1)!).toBeLessThan(fitted.losses[0]!);
  });
});
