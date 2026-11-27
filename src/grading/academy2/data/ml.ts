import { columnIndex, numberSummary, type Cell, type Table } from "./table";
import {
  cluster,
  fit,
  logLoss,
  random,
  shuffle,
  type Hyper,
  type ModelKind,
  type Sample,
  type Vector,
} from "./ml-models";
import { classification, eigenvectors, regression } from "./ml-metrics";
import { argmax, multiclassMetrics, trainMulticlass } from "./ml-multiclass";
import { tableFingerprint } from "./tableFingerprint";

export type Mode =
  "classification" | "multiclass" | "regression" | "clustering";
export type Evaluation = "development" | "final";
export type SplitOptions = Hyper & {
  model: ModelKind;
  mode: Mode;
  features: string[];
  target: string;
  positive: string;
  standard: boolean;
  pca: boolean;
  trainPercent: number;
  validationPercent: number;
  threshold: number;
  folds: number;
  balance: boolean;
  selfTrain: boolean;
  leakDemo: boolean;
  query?: Vector;
};
const clusterModels = ["kmeans", "hierarchy", "dbscan"] as const;
export const modelNames: Record<ModelKind, string> = {
  linear: "线性回归",
  ridge: "岭回归",
  logistic: "逻辑回归",
  softmax: "Softmax 多项逻辑回归",
  knn: "K 近邻",
  bayes: "高斯朴素贝叶斯",
  tree: "CART 决策树",
  forest: "随机森林",
  svm: "线性 SVM",
  boosting: "梯度提升树",
  neural: "两层神经网络",
  kmeans: "K-means",
  hierarchy: "凝聚层次聚类",
  dbscan: "DBSCAN",
};
export function models(mode: Mode): ModelKind[] {
  if (mode === "multiclass") return ["softmax", "knn"];
  return mode === "classification"
    ? [
        "logistic",
        "knn",
        "bayes",
        "tree",
        "forest",
        "svm",
        "boosting",
        "neural",
      ]
    : mode === "regression"
      ? ["linear", "ridge", "knn"]
      : [...clusterModels];
}
export const initialOptions: SplitOptions = {
  model: "logistic",
  mode: "classification",
  features: ["petal_length", "petal_width"],
  target: "species",
  positive: "virginica",
  standard: true,
  pca: false,
  trainPercent: 60,
  validationPercent: 20,
  threshold: 0.5,
  folds: 0,
  balance: false,
  selfTrain: false,
  leakDemo: false,
  epochs: 100,
  rate: 0.15,
  lambda: 0.015,
  k: 3,
  depth: 3,
  seed: 17,
  epsilon: 0.5,
};
type Row = { values: (number | null)[]; label: number; index: number };
type Point = { x: number; y: number; label: number; score: number };
function validate(options: SplitOptions) {
  const h = options;
  const bounded = (x: number, a: number, b: number, integer = false) =>
    Number.isFinite(x) && x >= a && x <= b && (!integer || Number.isInteger(x));
  if (
    !models(h.mode).includes(h.model) ||
    !bounded(h.epochs, 1, 500, true) ||
    !bounded(h.rate, 0.0001, 1) ||
    !bounded(h.lambda, 0, 2) ||
    !bounded(h.k, 1, 32, true) ||
    !bounded(h.depth, 1, 8, true) ||
    !bounded(h.seed, 0, 2147483647, true) ||
    !bounded(h.epsilon, 0.01, 20) ||
    !bounded(h.threshold, 0, 1) ||
    !bounded(h.folds, 0, 8, true) ||
    h.folds === 1 ||
    !bounded(h.trainPercent, 40, 80, true) ||
    !bounded(h.validationPercent, 10, 30, true) ||
    h.trainPercent + h.validationPercent > 90
  )
    throw Error("检查模型参数和切分比例，至少保留 10% 给测试集。");
  if (
    !h.features.length ||
    h.features.length > 8 ||
    new Set(h.features).size !== h.features.length ||
    (h.mode !== "clustering" && h.features.includes(h.target))
  )
    throw Error("选择 1–8 个互异数值特征。标签列应单独保留。");
}
function extract(table: Table, h: SplitOptions) {
  const features = h.features.map((key) => columnIndex(table, key));
  const target = h.mode === "clustering" ? -1 : columnIndex(table, h.target);
  const rows: Row[] = [],
    dropped: number[] = [];
  const unique =
    h.mode === "multiclass"
      ? [
          ...new Set(
            table.rows.flatMap((row) =>
              row[target] == null ? [] : [row[target]],
            ),
          ),
        ].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1))
      : [];
  const hasAmbiguousLabels = new Set(unique.map(String)).size < unique.length;
  const categories = unique.map((value) =>
    hasAmbiguousLabels ? JSON.stringify(value) : String(value),
  );
  const categoryOf = new Map<Cell, number>(
    unique.map((value, i) => [value, i]),
  );
  if (
    h.mode === "multiclass" &&
    (categories.length < 2 || categories.length > 12)
  )
    throw Error("多类别实验需要 2–12 个有效类别。");
  for (const [index, data] of table.rows.entries()) {
    const y = target === -1 ? 0 : data[target];
    if (y === null || y === undefined) {
      dropped.push(index);
      continue;
    }
    if (h.mode === "regression" && typeof y !== "number")
      throw Error("回归标签必须为数值。");
    const label =
      h.mode === "classification"
        ? Number(String(y) === h.positive)
        : h.mode === "multiclass"
          ? categoryOf.get(y)!
          : Number(y);
    const values = features.map((i) => {
      const x = data[i];
      if (x === null) return x;
      if (typeof x !== "number" || !Number.isFinite(x) || Math.abs(x) > 1e12)
        throw Error("特征需为绝对值至多 10¹² 的数值或缺失值。");
      return x;
    });
    if (!Number.isFinite(label) || Math.abs(label) > 1e12)
      throw Error("标签需为绝对值至多 10¹² 的数值。");
    rows.push({ values, label, index });
  }
  if (rows.length < 9 || rows.length > 600)
    throw Error("机器学习实验使用 9–600 条带有效标签的记录。");
  return { rows, dropped, categories };
}
function groups(rows: Row[], h: SplitOptions) {
  if (h.mode === "multiclass") {
    const labels = [...new Set(rows.map((row) => row.label))].sort(
      (a, b) => a - b,
    );
    return labels.map((label) => rows.filter((row) => row.label === label));
  }
  if (h.mode !== "classification") return [rows];
  return [rows.filter((row) => !row.label), rows.filter((row) => row.label)];
}
export function splitRows(rows: Row[], h: SplitOptions) {
  const rand = random(h.seed);
  const train: Row[] = [],
    validation: Row[] = [],
    test: Row[] = [];
  for (const group of groups(rows, h)) {
    if (group.length < 3)
      throw Error("每个分类标签至少需要三条数据，确保三个切分都有该类。");
    const sorted = shuffle(group, rand),
      a = Math.max(
        1,
        Math.min(
          sorted.length - 2,
          Math.floor((sorted.length * h.trainPercent) / 100),
        ),
      );
    const b = Math.min(
      sorted.length - 1,
      a + Math.max(1, Math.floor((sorted.length * h.validationPercent) / 100)),
    );
    train.push(...sorted.slice(0, a));
    validation.push(...sorted.slice(a, b));
    test.push(...sorted.slice(b));
  }
  return {
    train: shuffle(train, rand),
    validation: shuffle(validation, rand),
    test: shuffle(test, rand),
  };
}
function preprocess(rows: Row[], h: SplitOptions) {
  const summaries = rows[0]!.values.map((_, index) =>
    numberSummary(
      rows.flatMap((row) =>
        row.values[index] === null ? [] : [row.values[index]!],
      ),
    ),
  );
  if (summaries.some((summary) => !summary))
    throw Error("拟合数据中有整列缺失值，请更换特征。");
  const median = summaries.map((s) => s!.median),
    center = summaries.map((s) => s!.mean),
    stdev = summaries.map((s) => s!.sd || 1);
  const standard = (row: (number | null)[]) =>
    row.map((value, i) => {
      const filled = value ?? median[i]!;
      return h.standard ? (filled - center[i]!) / stdev[i]! : filled;
    });
  let projection: ReturnType<typeof eigenvectors> | undefined;
  if (h.pca && median.length > 1)
    projection = eigenvectors(
      rows.map((row) => standard(row.values)),
      Math.min(2, median.length),
    );
  const transform = (row: (number | null)[]) =>
    projection ? projection.project(standard(row)) : standard(row);
  return {
    median,
    center,
    stdev,
    basis: projection?.basis,
    variances: projection?.variances,
    transform,
  };
}
function overSample(samples: Sample[], seed: number) {
  const split = [samples.filter((s) => !s.y), samples.filter((s) => s.y)],
    goal = Math.max(...split.map((a) => a.length));
  const rand = random(seed);
  return split.flatMap((group) => [
    ...group,
    ...Array.from(
      { length: goal - group.length },
      () => group[Math.floor(rand() * group.length)]!,
    ),
  ]);
}
function training(
  rows: Row[],
  universe: Row[],
  h: SplitOptions,
  classes: number,
) {
  const preparing = preprocess(h.leakDemo ? universe : rows, h);
  const data = rows.map((row) => ({
    x: preparing.transform(row.values),
    y: row.label,
  }));
  if (h.model === "softmax" || (h.mode === "multiclass" && h.model === "knn")) {
    const fitted = trainMulticlass(h.model, data, classes, h);
    return {
      preparing,
      count: data.length,
      pseudo: 0,
      fitted: {
        ...fitted,
        predict: (x: Vector) => argmax(fitted.probabilities(x)),
      },
      probabilities: fitted.probabilities,
    };
  }
  let selected = data,
    pseudo = 0;
  if (h.mode === "classification" && h.selfTrain) {
    const groups = [data.filter((row) => !row.y), data.filter((row) => row.y)];
    const parts = groups.map((group) => {
      const hold = Math.min(group.length - 1, Math.floor(group.length / 3));
      return { seeds: group.slice(hold), hidden: group.slice(0, hold) };
    });
    const seeds = parts.flatMap((part) => part.seeds);
    const provisional = fit(h.model, seeds, h);
    const extra = parts
      .flatMap((part) => part.hidden)
      .flatMap((row) => {
        const score = provisional.predict(row.x);
        return score >= 0.9 || score <= 0.1
          ? [{ x: row.x, y: Number(score > 0.5) }]
          : [];
      });
    pseudo = extra.length;
    selected = [...seeds, ...extra];
  }
  const adjusted =
    h.mode === "classification" && h.balance
      ? overSample(selected, h.seed)
      : selected;
  return {
    preparing,
    fitted: fit(h.model, adjusted, h),
    count: adjusted.length,
    pseudo,
  };
}
function crossValidate(rows: Row[], h: SplitOptions, categories: string[]) {
  if (!h.folds) return [];
  const slices: Row[][] = Array.from({ length: h.folds }, () => []);
  const rand = random(h.seed + 41);
  for (const group of groups(rows, h)) {
    if (group.length < h.folds) throw Error("训练集每类记录数至少等于折数。");
    shuffle(group, rand).forEach((row, i) => slices[i % h.folds]!.push(row));
  }
  return slices.map((sample, i) => {
    const remaining = slices.flatMap((group, j) => (i !== j ? group : []));
    const { fitted, preparing } = training(
      remaining,
      rows,
      {
        ...h,
        leakDemo: false,
      },
      categories.length,
    );
    const labels = sample.map((row) => row.label),
      scores = sample.map((row) =>
        fitted.predict(preparing.transform(row.values)),
      );
    return h.mode === "classification"
      ? classification(labels, scores, h.threshold).accuracy
      : h.mode === "multiclass"
        ? multiclassMetrics(labels, scores, categories).accuracy
        : regression(labels, scores).rmse;
  });
}
function readMetrics(
  rows: Row[],
  scores: number[],
  mode: Mode,
  threshold: number,
  categories: string[],
) {
  const labels = rows.map((row) => row.label);
  if (mode === "multiclass")
    return multiclassMetrics(labels, scores, categories);
  return mode === "classification"
    ? {
        kind: "classification" as const,
        ...classification(labels, scores, threshold),
      }
    : { kind: "regression" as const, ...regression(labels, scores) };
}
export type Metrics = ReturnType<typeof readMetrics>;
export type MLResult = {
  fingerprint: string;
  evaluation: Evaluation;
  elapsed: number;
  model: ModelKind;
  options: SplitOptions;
  losses: number[];
  details: string;
  features: string[];
  points: Point[];
  trainSize: number;
  validationSize: number;
  testSize: number;
  fittedSize: number;
  dropped: number;
  validation?: Metrics;
  test?: Metrics;
  partition?: { train: number[]; validation: number[]; test: number[] };
  boundary?: { x: number[]; y: number[]; labels: number[] };
  labels?: number[];
  values?: { subset: string; row: number; label: number; prediction: number }[];
  cv: number[];
  weights?: number[];
  median: number[];
  variances?: number[];
  queryPrediction?: number;
  classNames?: string[];
  queryProbabilities?: number[];
  trainBCE?: number;
  gap?: number;
  pseudo?: number;
};
export function experiment(
  table: Table,
  h: SplitOptions,
  evaluation: Evaluation = h.leakDemo ? "development" : "final",
): MLResult {
  validate(h);
  if (evaluation === "final" && h.leakDemo)
    throw Error("泄漏对照不能进入最终评估。");
  const time = performance.now(),
    { rows, dropped, categories } = extract(table, h);
  const fingerprint = tableFingerprint(table);
  if (h.mode === "clustering") {
    const prep = preprocess(rows, h),
      vectors = rows.map((row) => prep.transform(row.values));
    const result = cluster(h.model, vectors, h);
    return {
      fingerprint,
      evaluation,
      elapsed: performance.now() - time,
      model: h.model,
      options: h,
      losses: result.losses,
      details: result.details,
      features: h.pca && Boolean(prep.basis) ? ["PC1", "PC2"] : h.features,
      trainSize: rows.length,
      validationSize: 0,
      testSize: 0,
      fittedSize: rows.length,
      dropped: dropped.length,
      cv: [],
      median: prep.median,
      variances: prep.variances,
      labels: result.labels,
      points: vectors.map((x, i) => ({
        x: x[0]!,
        y: x[1] ?? 0,
        label: result.labels[i]!,
        score: result.labels[i]!,
      })),
    };
  }
  const { train, validation, test } = splitRows(rows, h),
    {
      fitted,
      preparing: prep,
      count,
      pseudo,
      probabilities,
    } = training(train, rows, h, categories.length);
  const predict = (row: (number | null)[]) =>
    fitted.predict(prep.transform(row));
  const final = evaluation === "final" && !h.leakDemo;
  const v = validation.map((row) => predict(row.values)),
    t = final ? test.map((row) => predict(row.values)) : [],
    trainScores = train.map((row) => predict(row.values));
  const predictRows = (set: Row[], scores: number[], subset: string) =>
    set.map((row, i) => ({
      subset,
      row: row.index + 1,
      label: row.label,
      prediction: scores[i]!,
    }));
  const observed = final ? test : validation;
  const observedScores = final ? t : v;
  const points = observed.map((row, i) => ({
    x: row.values[0] ?? prep.median[0]!,
    y: h.features.length > 1 ? (row.values[1] ?? prep.median[1]!) : 0,
    label: row.label,
    score: observedScores[i]!,
  }));
  const output: MLResult = {
    fingerprint,
    evaluation,
    model: h.model,
    options: h,
    details: fitted.details,
    losses: fitted.losses,
    features: h.features,
    points,
    elapsed: 0,
    pseudo: h.selfTrain ? pseudo : undefined,
    trainSize: train.length,
    validationSize: validation.length,
    testSize: test.length,
    fittedSize: count,
    dropped: dropped.length,
    cv: crossValidate(train, h, categories),
    validation: readMetrics(validation, v, h.mode, h.threshold, categories),
    test: final
      ? readMetrics(test, t, h.mode, h.threshold, categories)
      : undefined,
    partition: {
      train: train.map((row) => row.index),
      validation: validation.map((row) => row.index),
      test: final ? test.map((row) => row.index) : [],
    },
    values: [
      ...predictRows(train, trainScores, "train"),
      ...predictRows(validation, v, "validation"),
      ...(final ? predictRows(test, t, "test") : []),
    ],
    median: prep.median,
    variances: prep.variances,
    weights: fitted.weights,
    classNames: categories.length ? categories : undefined,
  };
  if (h.mode === "classification" || h.mode === "multiclass") {
    if (h.mode === "classification") {
      const trainMetrics = classification(
        train.map((row) => row.label),
        trainScores,
        h.threshold,
      );
      output.gap =
        trainMetrics.accuracy -
        classification(
          validation.map((row) => row.label),
          v,
          h.threshold,
        ).accuracy;
      if (h.model !== "svm")
        output.trainBCE =
          train.reduce(
            (sum, row, i) => sum + logLoss(row.label, trainScores[i]!),
            0,
          ) / train.length;
    }
    if (h.features.length >= 2) {
      const axis = (i: number) => {
        const raw = [...train, ...validation].map(
            (row) => row.values[i] ?? prep.median[i]!,
          ),
          low = Math.min(...raw),
          high = Math.max(...raw);
        return Array.from(
          { length: 21 },
          (_, j) => low + ((high - low) * j) / 20,
        );
      };
      const x = axis(0),
        y = axis(1);
      output.boundary = {
        x,
        y,
        labels: y.flatMap((y) =>
          x.map((x) => {
            const score = predict([x, y, ...prep.median.slice(2)]);
            return h.mode === "multiclass"
              ? score
              : Number(score >= h.threshold);
          }),
        ),
      };
    }
  }
  if (h.query) {
    if (
      h.query.length !== h.features.length ||
      h.query.some((value) => !Number.isFinite(value) || Math.abs(value) > 1e12)
    )
      throw Error("每个所选特征需要一个可用的输入数值。");
    output.queryPrediction = predict(h.query);
    output.queryProbabilities = probabilities?.(prep.transform(h.query));
    if (!Number.isFinite(output.queryPrediction))
      throw Error("预测超出数值范围。");
  }
  output.elapsed = performance.now() - time;
  return output;
}
