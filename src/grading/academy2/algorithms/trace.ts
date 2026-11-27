export type Scalar = string | number;
export type Edge = { from: string; to: string; weight: number };
export type Network = { nodes: string[]; edges: Edge[]; directed: boolean };
export type TreeFrame = {
  key: number;
  left?: TreeFrame;
  right?: TreeFrame;
  height?: number;
};
export type Point = readonly [number, number];
export type PlotFrame = {
  points: readonly Point[];
  chain: readonly Point[];
  close?: boolean;
};
type Diagram = { tree?: TreeFrame; plot?: PlotFrame };
export type Frame = {
  event: string;
  variables: [string, Scalar][];
  items?: Scalar[];
  active?: number[];
  path?: string[];
  count: number;
} & Diagram;
export type Trace = {
  frames: Frame[];
  answer: Scalar;
  measure: string;
  complexity: string;
  network?: Network;
};
export type Model = {
  id: string;
  title: string;
  label: string;
  input: string;
  parameterLabel?: string;
  parameter?: string;
  run: (input: string, parameter: string) => Trace;
};
export function trace(measure: string, complexity: string, network?: Network) {
  const frames: Frame[] = [];
  let count = 0;
  function step(
    event: string,
    variables: Frame["variables"] = [],
    items?: readonly Scalar[],
    active?: number[],
    path?: string[],
    cost = 1,
    diagram: Diagram = {},
  ) {
    count += cost;
    if (frames.length >= 2200) throw Error("步骤太多，请缩小教学输入规模。");
    frames.push({
      event,
      variables,
      items: items && [...items],
      active,
      path: path && [...path],
      count,
      ...diagram,
    });
  }
  function result(answer: Scalar): Trace {
    const last = frames.at(-1);
    step(
      "执行结束",
      [["结果", answer]],
      last?.items,
      last?.active,
      last?.path,
      0,
      { tree: last?.tree, plot: last?.plot },
    );
    return { frames, answer, measure, complexity, network };
  }
  return { step, result, count: () => count };
}
export function integer(raw: string, min = -1000, max = 1000) {
  if (!/^-?\d+$/.test(raw.trim())) throw Error("请输入整数。");
  const value = Number(raw);
  if (value < min || value > max)
    throw Error("整数范围 " + min + " 至 " + max + "。");
  return value;
}
export function values(raw: string, max = 32, min = 0) {
  const parts = raw.trim() ? raw.trim().split(/[,，\s]+/) : [];
  if (parts.length < min || parts.length > max)
    throw Error("请输入 " + min + " 至 " + max + " 个数，用逗号或空格分隔。");
  return parts.map((item) => integer(item));
}
export function endpoints(value: string) {
  const parts = value
    .trim()
    .toUpperCase()
    .split(/[,，\s]+/);
  if (parts.length !== 2 || parts.some((x) => !/^[A-Z]$/.test(x)))
    throw Error("用 A,D 输入两个顶点。");
  return parts as [string, string];
}
export function network(raw: string, directed = true): Network {
  const parts = raw
    .trim()
    .toUpperCase()
    .split(/[,，\s]+/);
  if (!raw.trim() || parts.length > 22)
    throw Error("请输入 1–22 条边。格式 A>B:3，孤立点写 X。");
  const nodes = new Set<string>(),
    edges: Edge[] = [];
  for (const part of parts) {
    if (/^[A-Z]$/.test(part)) {
      nodes.add(part);
      continue;
    }
    const m = /^([A-Z])[>-]([A-Z])(?::(-?\d+))?$/.exec(part);
    if (!m) throw Error("边格式应为 A>B:3 或 A-B:3。");
    const from = m[1]!,
      to = m[2]!,
      weight = integer(m[3] ?? "1", -99, 99);
    nodes.add(from);
    nodes.add(to);
    edges.push({ from, to, weight });
  }
  if (nodes.size > 12) throw Error("最多 12 个顶点。");
  return { nodes: [...nodes], edges, directed };
}
export const arcs = (g: Network) =>
  g.directed
    ? g.edges
    : g.edges.flatMap((e) => [e, { from: e.to, to: e.from, weight: e.weight }]);
export function pairs(raw: string, max = 24) {
  const entries = raw.trim().split(/[;；]/);
  if (entries.length > max) throw Error("最多 " + max + " 组数对。");
  return entries.map((item) => {
    const [first, second] = values(item, 2, 2);
    return [first!, second!] as const;
  });
}
