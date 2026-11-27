import { modelById } from "./index";
import { network, values, type Trace } from "./trace";

export type ProjectRun = {
  name: string;
  input: string;
  parameter?: string;
  rows: [string, string][];
  trace?: Trace;
};
export const projectExample = {
  foundation: ["8,2,6,4,1", "1,2,4,4,7"],
  intermediate: [
    "A>B:8,A>C:1,C>B:2,B>D:3",
    "A>B:10,A>C:4,C>B:-3,B>D:2",
    "2,4;3,5;4,11",
    "5",
  ],
  advanced: ["2,4,1,5,3", "q:0:3,u:1:7,q:0:5,q:2:2", "ababa", "aba"],
} as const;

const run = (id: string, input: string, parameter = "") =>
  modelById(id)!.run(input, parameter);
const row = (output: Trace): string => String(output.answer);
export function sortingProject(input: string, second: string): ProjectRun[] {
  const cases = [input, second].map((value) => values(value, 32, 3));
  if (cases[0]!.join() === cases[1]!.join())
    throw Error("请使用两组不同的输入。");
  if (cases.every((a) => new Set(a).size === a.length))
    throw Error("至少一组排序数据须包含重复键。");
  return cases.map((a) => {
    const raw = a.join(","),
      oracle = [...a].sort((x, y) => x - y).join(",");
    const outcomes = ["插入", "选择", "归并"].map((method) => ({
      method,
      output: run("sort", raw, method),
    }));
    if (outcomes.some(({ output }) => output.answer !== oracle))
      throw Error("出现与独立排序核对不一致的结果。");
    return {
      name: "三种排序",
      input: raw,
      rows: outcomes.map(({ method, output }) => [
        method,
        row(output) + " · " + output.frames.at(-1)!.count + " 次键比较",
      ]),
      trace: outcomes[2]!.output,
    };
  });
}

export function transportProject(
  positive: string,
  negative: string,
  task: string,
  data: string,
  parameter: string,
) {
  const g = network(positive),
    h = network(negative);
  if (
    g.edges.some((edge) => edge.weight < 0) ||
    !h.edges.some((edge) => edge.weight < 0)
  )
    throw Error("第一张图只用非负边，第二张图需要至少一条负边。");
  const d = run("dijkstra", positive, "A,D"),
    b = run("bellman", positive, "A,D"),
    n = run("bellman", negative, "A,D");
  const cycle = "A>B:1,B>C:-4,C>B:1,C>D:2";
  const r = run("bellman", cycle, "A,D");
  if (
    typeof d.answer !== "number" ||
    d.answer !== b.answer ||
    typeof n.answer !== "number" ||
    r.answer !== "负环影响"
  )
    throw Error("两张自定义图都需要 A 可达 D，并且到 D 的距离有界。");
  if (task !== "dp" && task !== "pointers") throw Error("请选择背包或双指针。");
  if (task === "pointers" && values(data).length < 3)
    throw Error("双指针训练至少使用三个数。");
  const c = run(task, data, parameter);
  return [
    {
      name: "非负最短路",
      input: positive,
      parameter: "A,D",
      rows: [
        ["Dijkstra", row(d)],
        ["Bellman–Ford", row(b)],
        ["路径", d.frames.at(-1)!.path?.join(" → ") ?? ""],
      ],
      trace: d,
    },
    {
      name: "负边最短路",
      input: negative,
      parameter: "A,D",
      rows: [
        ["Bellman–Ford", row(n)],
        ["路径", n.frames.at(-1)!.path?.join(" → ") ?? ""],
      ],
      trace: n,
    },
    {
      name: "负环回归",
      input: cycle,
      parameter: "A,D",
      rows: [["诊断", row(r)]],
    },
    {
      name: task === "dp" ? "背包训练" : "双指针训练",
      input: data,
      parameter,
      rows: [["结果", row(c)]],
      trace: c,
    },
  ] satisfies ProjectRun[];
}

export type IntervalOperation = {
  kind: "q" | "u";
  left: number;
  right: number;
};
function queryChecks(input: number[], ops: IntervalOperation[]) {
  const a = [...input],
    checked: number[] = [];
  for (const { kind, left, right } of ops) {
    if (kind === "q")
      checked.push(a.slice(left, right).reduce((sum, value) => sum + value, 0));
    else a[left] = right;
  }
  return checked;
}
export function structuresProject(
  raw: string,
  operations: string,
  text: string,
  pattern: string,
): ProjectRun[] {
  const input = values(raw, 32, 4),
    s = run("segment", raw, operations),
    f = run("fenwick", raw, operations);
  const ops = operations
    .trim()
    .split(/[,，\s]+/)
    .map((op) => {
      const [kind, l, r] = op.split(":");
      return { kind: kind as "q" | "u", left: Number(l), right: Number(r) };
    });
  if (
    !ops.some((op) => op.kind === "u") ||
    ops.filter((op) => op.kind === "q").length < 2
  )
    throw Error("工作负载至少应有一次更新、两次查询。");
  const oracle = queryChecks(input, ops);
  const answers = (output: Trace) =>
    output.frames
      .filter((frame) => frame.event === "区间查询结果")
      .map((frame) => frame.variables[2]![1]);
  if ([s, f].some((output) => String(answers(output)) !== String(oracle)))
    throw Error("区间结构输出与独立扫描不一致。");
  const k = run("kmp", text, pattern),
    a = [...text],
    p = [...pattern];
  const hits = a.flatMap((_, i) =>
    p.every((char, j) => a[i + j] === char) ? [i] : [],
  );
  if (!hits.some((index, i) => i > 0 && index - hits[i - 1]! < p.length))
    throw Error("请设计至少一对重叠匹配，例如 ababa 与 aba。");
  if (k.answer !== hits.join(","))
    throw Error("字符串输出与朴素逐位置核验不一致。");
  return [
    {
      name: "区间和差分核验",
      input: raw,
      parameter: operations,
      rows: [
        ["朴素扫描", oracle.join(",")],
        ["线段树节点访问", String(s.frames.at(-1)!.count)],
        ["Fenwick 节点访问", String(f.frames.at(-1)!.count)],
      ],
      trace: s,
    },
    {
      name: "字符串重叠核验",
      input: text,
      parameter: pattern,
      rows: [
        ["KMP 下标", row(k)],
        ["朴素逐位置下标", hits.join(",")],
      ],
      trace: k,
    },
  ];
}

type Index = {
  update: (i: number, x: number) => void;
  sum: (l: number, r: number) => number;
};
export function createRangeIndex(input: number[], fenwick: boolean): Index {
  const n = input.length,
    a = Float64Array.from(input),
    buffer = new Float64Array(fenwick ? n + 1 : 2 * n);
  function add(i: number, x: number) {
    for (let j = i + 1; j <= n; j += j & -j) buffer[j]! += x;
  }
  function prefix(k: number) {
    let total = 0;
    for (let j = k; j > 0; j -= j & -j) total += buffer[j]!;
    return total;
  }
  if (fenwick) {
    a.forEach((value, i) => add(i, value));
    return {
      update(i, x) {
        add(i, x - a[i]!);
        a[i] = x;
      },
      sum(l, r) {
        return prefix(r) - prefix(l);
      },
    };
  }
  buffer.set(a, n);
  for (let i = n - 1; i > 0; i--)
    buffer[i] = buffer[2 * i]! + buffer[2 * i + 1]!;
  return {
    update(i, x) {
      buffer[n + i] = x;
      for (let j = (n + i) >> 1; j > 0; j >>= 1)
        buffer[j] = buffer[2 * j]! + buffer[2 * j + 1]!;
    },
    sum(l, r) {
      let total = 0;
      for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
        if (l & 1) total += buffer[l++]!;
        if (r & 1) total += buffer[--r]!;
      }
      return total;
    },
  };
}
export function benchmarkRange(
  n: number,
  clock: () => number,
  operations = 4096,
) {
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 4096 ||
    !Number.isInteger(operations) ||
    operations < 32 ||
    operations > 8192
  )
    throw Error("基准规模限于 32–4096 个值及 32–8192 次操作。");
  const input = Array.from({ length: n }, (_, i) => ((i * 43) % 103) - 51);
  const workload = Array.from({ length: operations }, (_, i) => {
    const left = (i * 17) % n;
    return {
      kind: i % 3 === 0 ? "u" : "q",
      left,
      right:
        i % 3 === 0
          ? ((i * 17) % 113) - 56
          : Math.min(n, left + 1 + ((i * 11) % n)),
    } as IntervalOperation;
  });
  const checks = queryChecks(input, workload);
  return [false, true].map((fenwick) => {
    function execute(index: Index) {
      const totals: number[] = [];
      for (const { kind, left, right } of workload) {
        if (kind === "u") index.update(left, right);
        else totals.push(index.sum(left, right));
      }
      return totals;
    }
    if (
      execute(createRangeIndex(input, fenwick)).some(
        (value, i) => value !== checks[i],
      )
    )
      throw Error("基准实现与逐项扫描不一致。");
    const samples = Array.from({ length: 5 }, () => {
      const index = createRangeIndex(input, fenwick),
        start = clock();
      execute(index);
      return Math.max(0, clock() - start);
    }).sort((a, b) => a - b);
    return {
      name: fenwick ? "Fenwick 树" : "线段树",
      size: n,
      operations,
      total: checks.length,
      median: samples[2]!,
      samples,
    };
  });
}
