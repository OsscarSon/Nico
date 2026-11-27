import { beforeAll, describe, expect, it } from "vitest";
import type { SqlJsStatic } from "sql.js";
import { dataLessons } from "../src/content/academy2/data";
import {
  dataCourses,
  dataIds,
  dataTopics,
} from "../src/content/academy2/data/registry";
import { codeLesson, p3CodeKeys } from "../src/content/academy2/data/python";
import { academyCourses } from "../src/content/academy2/model";
import {
  auditGraph,
  knowledgeEdges,
} from "../src/content/academy2/knowledgeGraph";
import {
  searchStudy,
  studyCatalogue,
} from "../src/content/academy2/teaching/library";
import { topicLessonSchema } from "../src/content/academy2/teaching/schema";
import { renderFormula } from "../src/features/academy2/teaching/renderFormula";
import { irisTable, airTable } from "../src/content/academy2/data/datasets";
import {
  capstoneQuery,
  sqlExamples,
} from "../src/content/academy2/data/notebooks";
import {
  clean,
  correlation,
  filterSort,
  grouped,
  histogram,
  numberSummary,
  parseCSV,
  parseJSON,
  profile,
  tableCSV,
  type Table,
} from "../src/grading/academy2/data/table";
import {
  executeSQL,
  exportDatabase,
  loadSQLite,
  measureIndex,
} from "../src/grading/academy2/data/sql";
import {
  experiment,
  initialOptions,
  models,
  type SplitOptions,
} from "../src/grading/academy2/data/ml";
import {
  classification,
  eigenvectors,
  regression,
} from "../src/grading/academy2/data/ml-metrics";
import {
  astar,
  documents,
  evaluateAssistant,
  infer,
  minimax,
  resourceRules,
  temperature,
} from "../src/grading/academy2/data/reasoning";
import {
  compareOnHoldout,
  verifyMonthly,
} from "../src/grading/academy2/data/projects";
import { dataVariant } from "../src/grading/academy2/data/variant";
import { evaluate } from "../src/grading/academy2/teaching/questions";
import { algorithmCode } from "../src/content/academy2/algorithms/python";
import { studySchema, emptyStudy, mergeStudy } from "../src/progress/study";

describe("P3 knowledge, syllabus and first-class study integration", () => {
  it("keeps the 30-course hierarchy while teaching every named P3 topic", () => {
    expect(academyCourses).toHaveLength(30);
    expect(
      academyCourses.find((item) => item.id === "advanced-data-science"),
    ).toBeDefined();
    expect(dataCourses.map((course) => dataIds(course).length)).toEqual([
      17, 23, 16, 31,
    ]);
    expect(dataLessons).toHaveLength(87);
    expect(new Set(dataLessons.map((x) => x.id))).toEqual(
      new Set(dataTopics.map((x) => x.id)),
    );
    for (const item of dataLessons) {
      expect(topicLessonSchema.safeParse(item.lesson).success, item.title).toBe(
        true,
      );
      expect(item.material.steps.length, item.title).toBeGreaterThanOrEqual(2);
      expect(item.base.exercises).toHaveLength(4);
      if (item.material.formula)
        expect(
          renderFormula(item.material.formula, true),
          item.title,
        ).not.toBeNull();
    }
    expect(auditGraph(knowledgeEdges)).toEqual([]);
    expect(
      searchStudy(studyCatalogue().search, "least squares").some((value) =>
        value.path.endsWith("k-8e3c17ec3572"),
      ),
    ).toBe(true);
    expect(
      studyCatalogue().formula.some(
        (value) =>
          value.topic === "k-092fc4770111" && value.anchor === "advanced-2-2",
      ),
    ).toBe(true);
  });
  it("retains old study envelopes and restores the newest independently saved workspaces", () => {
    const original = emptyStudy();
    const older = {
      kind: "ml" as const,
      title: "model",
      at: 7,
      payload: "{}",
      active: true,
    };
    const newer = { ...older, at: 9, payload: '{"model":"logistic"}' };
    const disk = studySchema.parse({
      ...original,
      workspaces: { "ml-run": older },
    });
    expect(studySchema.parse(original)).toEqual(original);
    expect(
      mergeStudy(disk, { ...original, workspaces: { "ml-run": newer } })
        .workspaces?.["ml-run"],
    ).toEqual(newer);
    expect(
      studySchema.safeParse({
        ...original,
        workspaces: { invalid: { ...newer, payload: "z".repeat(500001) } },
      }).success,
    ).toBe(false);
  });
  it("verifies new reference tasks, randomized worksheets, and all P2 follow-up program registrations", () => {
    for (const key of p3CodeKeys)
      expect(codeLesson(key)?.question.cases.length).toBeGreaterThanOrEqual(4);
    for (const key of [
      "avl",
      "trie",
      "union",
      "dfs",
      "topo",
      "bellman",
      "mst",
      "queens",
      "segment",
      "flow",
      "matching",
      "geometry",
    ]) {
      const fixed = algorithmCode(key)?.question,
        variant = algorithmCode(key, 137)?.question;
      if (fixed?.type !== "program" || variant?.type !== "program")
        throw Error(key);
      expect(variant.cases.length).toBe(fixed.cases.length + 2);
    }
    const a = dataVariant("logistic", undefined, 8),
      b = dataVariant("logistic", undefined, 1509, true);
    expect(a?.id).not.toBe(b?.id);
    expect(b?.prompt).not.toBe(a?.prompt);
    if (a?.type !== "number") throw Error("expected a numeric task");
    expect(evaluate(a, String(a.answer)).status).toBe("correct");
    expect(evaluate(a, String(a.answer + 1)).status).toBe("incorrect");
  });
});

describe("Data Studio actual data operations and SQLite", () => {
  let sql: SqlJsStatic;
  beforeAll(async () => {
    sql = await loadSQLite();
  });

  it("handles CSV quoting, preserved identifiers, JSON nulls, cleaning and exports", () => {
    const source = parseCSV(
      '\ufeffid,name,value\r\n001,"A ""C"",\nB",0\r\n002,Z,\n',
    );
    expect(source.rows).toEqual([
      ["001", 'A "C",\nB', 0],
      ["002", "Z", null],
    ]);
    expect(parseCSV(tableCSV(source))).toEqual(source);
    expect(() => parseCSV("a,b\n3,4,5")).toThrow(/字段数/);
    expect(() => parseCSV('a,b\n"oops,2')).toThrow(/引号/);
    expect(parseJSON('[{"v":0},{"v":null},{"k":false}]').rows).toEqual([
      [0, null],
      [null, null],
      [null, false],
    ]);
    expect(() => parseJSON('[{"v":[1]}]')).toThrow(/嵌套/);
    expect(() => parseJSON('[{"X":1,"x":2}]')).toThrow(/列名/);
    expect(parseCSV("zip,v\n1234567890123456789,0").rows[0]).toEqual([
      "1234567890123456789",
      0,
    ]);
    expect(clean(source, "median", "value").rows[1]![2]).toBe(0);
    expect(clean(source, "drop-missing", "value").rows.length).toBe(1);
    expect(filterSort(source, "value", "", "desc").rows[1]![2]).toBeNull();
    expect(tableCSV({ columns: ["v"], rows: [["=testing"], [-2]] })).toContain(
      '"\'=testing"',
    );
    expect(profile(airTable)[0]).toMatchObject({
      missing: 37,
      summary: { n: 116, mean: expect.closeTo(42.12931, 5) },
    });
  });

  it("calculates grouped data, histogram endpoints, quartile fences and pair correlations", () => {
    const bySpecies = grouped(irisTable, "species", "petal_length");
    expect(bySpecies.map((x) => x.rows)).toEqual([50, 50, 50]);
    expect(bySpecies.map((x) => x.mean)).toEqual([
      expect.closeTo(1.462),
      expect.closeTo(4.26),
      expect.closeTo(5.552),
    ]);
    expect(histogram([1, 2, 3, 4, 5], 2)).toEqual([
      { edge: 1, end: 3, count: 2 },
      { edge: 3, end: 5, count: 3 },
    ]);
    expect(numberSummary([1, 2, 3, 4, 99])?.outliers).toEqual([99]);
    expect(
      correlation([
        [1, 6],
        [2, 4],
        [3, 2],
      ]),
    ).toBeCloseTo(-1);
    expect(
      correlation([
        [1, 6],
        [1, 7],
      ]),
    ).toBeNull();
  });

  it("runs parameter-bound SQLite, joins, null aggregation, window frames and transactions", () => {
    const output = executeSQL(sql, airTable, [capstoneQuery]).result[0]!;
    expect(verifyMonthly(airTable, output)).toBe(true);
    expect(output.rows.map((row) => [row[0], row[1], row[3]])).toEqual([
      [5, 26, 26],
      [6, 9, 35],
      [7, 26, 61],
      [8, 26, 87],
      [9, 29, 116],
    ]);
    expect(
      verifyMonthly(airTable, { ...output, rows: output.rows.slice(1) }),
    ).toBe(false);
    const raw = parseJSON(
      '[{"x":1,"note":"O\'Brien"},{"x":null,"note":"two"}]',
    );
    const result = executeSQL(sql, raw, [
      "CREATE TABLE audit(id INTEGER); INSERT INTO audit VALUES(7);",
      "BEGIN; UPDATE audit SET id=17; ROLLBACK; SELECT audit.id,d.note FROM audit, dataset d WHERE d.x IS NOT NULL",
    ]).result[0]!;
    expect(result.rows).toEqual([[7, "O'Brien"]]);
    expect(
      executeSQL(sql, raw, ["SELECT x FROM dataset WHERE x>999"]).result,
    ).toEqual([{ columns: ["x"], rows: [] }]);
    expect(() => executeSQL(sql, raw, ["SELECT badcol FROM dataset"])).toThrow(
      /no such column/,
    );
    expect(
      executeSQL(sql, irisTable, [sqlExamples.nosql!]).result[0]?.rows,
    ).toEqual([
      ["A", 5],
      ["B", 1],
    ]);
    const exported = exportDatabase(sql, raw, [
      "CREATE TABLE saved AS SELECT * FROM dataset;",
    ]);
    const copied = new sql.Database(exported);
    try {
      expect(copied.exec("SELECT COUNT(x) FROM saved")[0]?.values).toEqual([
        [1],
      ]);
    } finally {
      copied.close();
    }
    const perf = measureIndex(sql, irisTable, "species");
    expect(perf.scan.result).toBe(50);
    expect(perf.index.result).toBe(50);
    expect(perf.scan.plan).toContain("SCAN");
    expect(perf.index.plan).toContain("INDEX");
  });
});

describe("ML actual training, metrics and intelligent decisions", () => {
  it("uses explicit tie handling and algebraically correct metrics", () => {
    const m = classification([1, 1, 0, 0], [0.9, 0.4, 0.4, 0.1], 0.5);
    expect(m).toMatchObject({
      tp: 1,
      tn: 2,
      fp: 0,
      fn: 1,
      accuracy: 0.75,
      precision: 1,
      recall: 0.5,
      f1: 2 / 3,
      auc: 0.875,
    });
    expect(m.roc.at(-1)).toEqual([1, 1]);
    expect(classification([1, 1], [0.9, 0.1]).auc).toBeNull();
    expect(classification([0, 0], [0.1, 0.2]).precision).toBeNull();
    expect(regression([1, 3], [0, 3])).toMatchObject({
      mae: 0.5,
      mse: 0.5,
      rmse: Math.SQRT1_2,
      r2: 0.5,
    });
    expect(regression([5, 5], [0, 1]).r2).toBeNull();
    expect(regression([1, 3], [0, 0]).r2).toBeLessThan(0);
  });
  it("checks stochastic ties against positive–negative pairs and PCA against exact eigenvectors", () => {
    const y = [0, 1, 1, 0, 1, 0, 0, 1],
      s = [3, 3, 1, 2, 3, 1, 1, 2];
    const plus = s.filter((_, i) => y[i]),
      minus = s.filter((_, i) => !y[i]);
    const pairs = plus.flatMap((p) =>
      minus.map((n) => (p > n ? 1 : p === n ? 0.5 : 0)),
    );
    expect(classification(y, s).auc).toBeCloseTo(
      pairs.reduce<number>((a, b) => a + b, 0) / pairs.length,
    );
    const pca = eigenvectors(
      [
        [2, 0],
        [-2, 0],
        [0, 1],
        [0, -1],
      ],
      2,
    );
    expect(pca.variances).toEqual([8 / 3, 2 / 3]);
    expect(Math.abs(pca.project([2, 5])[0]!)).toBeCloseTo(2);
  });
  it("trains every model on actual data, preserves splits, and verifies leakage and regularization behavior", () => {
    const cleanData: Table = {
      columns: ["x", "z", "label"],
      rows: Array.from({ length: 60 }, (_, i) => [
        i,
        i % 3,
        i < 30 ? "no" : "yes",
      ]),
    };
    const opts = {
      ...initialOptions,
      target: "label",
      positive: "yes",
      features: ["x", "z"],
      epochs: 120,
    };
    for (const model of models("classification")) {
      const result = experiment(cleanData, { ...opts, model });
      expect(result.partition?.test.length).toBe(result.testSize);
      expect(
        result.test?.kind === "classification" && result.test.accuracy,
        model,
      ).toBeGreaterThan(0.65);
      expect(result.values).toHaveLength(60);
    }
    const fit = experiment(cleanData, { ...opts, folds: 4 });
    expect(
      new Set([
        ...fit.partition!.train,
        ...fit.partition!.validation,
        ...fit.partition!.test,
      ]).size,
    ).toBe(60);
    expect(fit.cv).toHaveLength(4);
    expect(fit.losses.at(-1)!).toBeLessThan(fit.losses[0]!);
    expect(fit.boundary?.labels.length).toBe(441);
    expect(
      compareOnHoldout(
        fit,
        experiment(cleanData, { ...opts, model: "tree", folds: 4 }),
      ),
    ).toBe(true);
    const testRows = new Set(fit.partition!.test);
    const perturbed = {
      ...cleanData,
      rows: cleanData.rows.map((row, i) =>
        testRows.has(i) ? [999, 1000, row[2]!] : row,
      ),
    };
    expect(experiment(perturbed, opts).weights).toEqual(fit.weights);
    expect(
      experiment(perturbed, { ...opts, leakDemo: true }).weights,
    ).not.toEqual(fit.weights);
    const semi = experiment(cleanData, { ...opts, selfTrain: true });
    expect(semi.partition).toEqual(experiment(cleanData, opts).partition);
    expect(semi.pseudo).toBeGreaterThanOrEqual(0);
    const high = experiment(cleanData, { ...opts, lambda: 1 });
    expect(Math.abs(high.weights![1]!)).toBeLessThan(
      Math.abs(fit.weights![1]!),
    );
    const real = experiment(irisTable, initialOptions);
    expect(real.trainSize + real.validationSize + real.testSize).toBe(150);
    expect(
      real.test?.kind === "classification" && real.test.accuracy,
    ).toBeGreaterThan(0.75);
  });
  it("fits regression and computes clustering from geometry", () => {
    const generated: Table = {
      columns: ["x", "y"],
      rows: Array.from({ length: 36 }, (_, i) => [i, 2 * i + 1]),
    };
    const config: SplitOptions = {
      ...initialOptions,
      epochs: 500,
      rate: 0.2,
      mode: "regression",
      model: "linear",
      features: ["x"],
      target: "y",
      query: [8],
    };
    const line = experiment(generated, config);
    expect(line.queryPrediction).toBeCloseTo(17, 4);
    expect(line.test?.kind === "regression" && line.test.r2).toBeCloseTo(1, 5);
    const clusters: Table = {
      columns: ["x"],
      rows: [[0], [0.1], [0.2], [0.3], [7], [7.1], [7.2], [7.3], [12]],
    };
    for (const model of ["kmeans", "hierarchy", "dbscan"] as const) {
      const result = experiment(clusters, {
        ...initialOptions,
        mode: "clustering",
        model,
        features: ["x"],
        standard: false,
        k: model === "dbscan" ? 3 : 2,
        epsilon: 0.32,
      });
      expect(result.labels).toHaveLength(9);
      expect(result.labels?.[0]).not.toBe(result.labels?.[4]);
      if (model === "dbscan") expect(result.labels?.at(-1)).toBe(-1);
      if (model === "kmeans")
        expect(
          result.losses.every(
            (v, i) => !i || v <= result.losses[i - 1]! + 1e-10,
          ),
        ).toBe(true);
    }
    expect(() =>
      experiment(irisTable, { ...initialOptions, features: ["species"] }),
    ).toThrow();
  });
  it("tests finite search and rule evaluation independently, including abstention and alpha–beta", () => {
    const cases = temperature([1000, 1000, 1000], 0.5);
    expect(cases).toEqual([1 / 3, 1 / 3, 1 / 3]);
    expect(evaluateAssistant(documents, 0.13).passed).toBe(4);
    expect(evaluateAssistant(documents, 1).passed).toBe(1);
    const assumptions = ["reservation", "trained", "room-open"];
    expect(infer(assumptions, resourceRules).known).toContain("can-use-lab");
    expect(infer(assumptions.slice(0, 2), resourceRules).known).not.toContain(
      "can-use-lab",
    );
    const obstacles = [
      [1, 0],
      [1, 1],
      [1, 2],
    ] as const;
    const a = astar(4, [0, 0], [3, 0], [...obstacles]),
      b = astar(4, [0, 0], [3, 0], [...obstacles], false);
    expect(a.length).toBe(9);
    expect(a.length).toBe(b.length);
    expect(minimax([3, 5, 2, 9])).toMatchObject({ value: 3, count: 3 });
  });
});
