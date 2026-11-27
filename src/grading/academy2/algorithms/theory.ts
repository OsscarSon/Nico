import {
  integer,
  network,
  trace,
  values,
  type Edge,
  type Model,
} from "./trace";

export function vertexCover(raw: string, bound: string, approx: boolean) {
  const g = network(raw, false),
    k = approx ? 0 : integer(bound, 0, 8);
  if (g.edges.some((edge) => edge.from === edge.to))
    throw Error("本实验使用无自环的图。");
  const t = trace(
    "分支或边检查",
    approx
      ? "极大匹配端点覆盖，O(V+E)，2-近似"
      : "分支树 O(2^k)，每个结点扫描边；对 k 固定参数可解",
    g,
  );
  const selected = new Set<string>();
  if (approx) {
    for (const e of g.edges) {
      const choose = !selected.has(e.from) && !selected.has(e.to);
      if (choose) {
        selected.add(e.from);
        selected.add(e.to);
      }
      t.step(
        choose ? "两端都未覆盖，纳入两端" : "这条边已经覆盖",
        [["边", e.from + "-" + e.to]],
        [...selected],
        [],
        [e.from, e.to],
      );
    }
    return t.result(selected.size);
  }
  function solve(edges: Edge[], left: number): string[] | null {
    if (!edges.length) return [...selected];
    if (!left) return null;
    const next = edges[0]!;
    for (const n of new Set([next.from, next.to])) {
      selected.add(n);
      t.step(
        "未覆盖边至少取一个端点",
        [
          ["剩余预算", left - 1],
          ["端点", n],
        ],
        [...selected],
        undefined,
        [next.from, next.to],
      );
      const result = solve(
        edges.filter((e) => e.from !== n && e.to !== n),
        left - 1,
      );
      selected.delete(n);
      if (result) return result;
    }
    return null;
  }
  const answer = solve(g.edges, k);
  t.step(
    "检查证书",
    [["覆盖", answer?.join(",") ?? "不存在"]],
    answer ?? [],
    undefined,
    undefined,
    0,
  );
  return t.result(answer ? "是" : "否");
}
function automaton(raw: string) {
  if (!/^[01]{0,64}$/.test(raw))
    throw Error("DFA 输入为 0 和 1 的串，最多 64 字符。");
  const transitions = [
    [0, 1],
    [2, 1],
    [0, 3],
    [2, 1],
  ];
  const t = trace("状态转移", "末尾为 101 的 DFA，一次扫描 Θ(n)，常数空间");
  let state = 0;
  for (const [i, char] of [...raw].entries()) {
    const next = transitions[state]![Number(char)]!;
    t.step(
      "按输入符号走唯一转移",
      [
        ["旧状态", state],
        ["读入", char],
        ["新状态", next],
      ],
      [...raw],
      [i],
    );
    state = next;
  }
  return t.result(state === 3 ? "接受" : "拒绝");
}
function machine(raw: string, parameter: string) {
  if (!/^1{0,24}$/.test(raw))
    throw Error("本模型输入为一元串，最多 24 个 1；空串表示 0。");
  const options = parameter.split(","),
    kind = options[0]?.trim(),
    limit = integer(options[1]?.trim() ?? "20", 1, 50);
  if (kind !== "加一" && kind !== "循环")
    throw Error("选择 加一,20 或 循环,20。");
  const tape = [...raw],
    t = trace(
      "机器转移次数",
      "一元追加 Θ(n)；通用停机不可判定，模拟到上限只报告未判定",
    );
  let head = 0;
  for (let i = 0; i < limit; i++) {
    const symbol = tape[head] ?? "□";
    t.step(
      "读扫描头位置并执行转移",
      [
        ["位置", head],
        ["读到", symbol],
        ["状态", kind],
      ],
      tape,
      [head],
    );
    if (kind === "循环") continue;
    if (symbol === "□") {
      tape[head] = "1";
      t.step("写入 1 并停机", [["位置", head]], tape, [head], undefined, 0);
      return t.result(tape.join(""));
    }
    head++;
  }
  return t.result("步限内未停机");
}
function certificates(raw: string, parameter: string) {
  const numbers = values(raw, 15),
    args = parameter.split(":");
  const target = integer(args[0] ?? "", -15000, 15000);
  const provided = values(args[1] ?? "", numbers.length);
  const t = trace(
    "证书索引检查",
    "给定索引证书可线性核验；本实验未宣称在多项式时间求证书",
  );
  const seen = new Set<number>();
  let amount = 0;
  for (const index of provided) {
    if (index < 0 || index >= numbers.length || seen.has(index)) {
      t.step("拒绝越界或重复的证书", [["索引", index]], numbers);
      return t.result("无效");
    }
    seen.add(index);
    amount += numbers[index]!;
    t.step(
      "累计证书对应的值",
      [
        ["索引", index],
        ["累计", amount],
      ],
      numbers,
      [index],
    );
  }
  return t.result(amount === target ? "有效" : "无效");
}
function reduction(raw: string, parameter: string) {
  const g = network(raw, false),
    indices = parameter
      .trim()
      .toUpperCase()
      .split(/[,，\s]+/)
      .filter(Boolean),
    cover = new Set(indices);
  if (
    indices.length !== cover.size ||
    indices.some((x) => !g.nodes.includes(x))
  )
    throw Error("证书含重复或未定义的顶点。");
  const complement = g.nodes.filter((x) => !cover.has(x)),
    other = new Set(complement);
  const t = trace(
    "原图边检查",
    "补集归约 O(V+E)；独立集大小 ≥k 对应顶点覆盖大小 ≤V−k",
    g,
  );
  let covered = true,
    independent = true;
  for (const e of g.edges) {
    const bad = other.has(e.from) && other.has(e.to);
    covered &&= !bad;
    independent &&= !bad;
    t.step(
      "同一边检验两个判定条件",
      [
        ["覆盖该边", bad ? "否" : "是"],
        ["补集内部边", bad ? "有" : "无"],
      ],
      complement,
      undefined,
      [e.from, e.to],
    );
  }
  t.step(
    "核验两个证书的等价",
    [
      ["覆盖候选大小", cover.size],
      ["补集大小", complement.length],
      ["两判定一致", covered === independent ? "是" : "否"],
    ],
    complement,
    undefined,
    undefined,
    0,
  );
  return t.result(covered ? "满足" : "不满足");
}
export function clauseClique(raw: string) {
  const groups = raw.trim().split(/[;；]/);
  if (!raw.trim() || groups.length > 4)
    throw Error("输入 1–4 个三文字子句，分号分隔。");
  const clauses = groups.map((group) => values(group, 3, 3));
  if (
    clauses.some((clause) =>
      clause.some((lit) => lit === 0 || Math.abs(lit) > 8),
    )
  )
    throw Error("文字使用 ±1 到 ±8，负号表示取反。");
  const vertices = clauses.flatMap((clause, group) =>
    clause.map((lit, i) => ({
      lit,
      group,
      id: String.fromCharCode(65 + group * 3 + i),
    })),
  );
  const adjacent = (
    a: (typeof vertices)[number],
    b: (typeof vertices)[number],
  ) => a.group !== b.group && a.lit !== -b.lit;
  const edges = vertices.flatMap((a, i) =>
    vertices
      .slice(i + 1)
      .filter((b) => adjacent(a, b))
      .map((b) => ({ from: a.id, to: b.id, weight: 1 })),
  );
  const graph = {
    nodes: vertices.map((row) => row.id),
    edges,
    directed: false,
  };
  const t = trace(
    "团搜索结点",
    "构图 O(m²)。本实验穷举小图核对结果，构图的多项式界不包含团搜索。",
    graph,
  );
  let best: string[] = [];
  const info = vertices.map(
    (v) => v.id + "=" + (v.lit < 0 ? "¬x" : "x") + Math.abs(v.lit),
  );
  t.step(
    "从文字出现构造候选边",
    [["目标团大小", clauses.length]],
    info,
    undefined,
    undefined,
    0,
  );
  function visit(start: number, selected: typeof vertices) {
    const chosen = selected.map((v) => v.id);
    if (chosen.length > best.length) best = chosen;
    t.step(
      "检查互相相邻的候选集合",
      [
        ["已选文字", chosen.join(",")],
        ["当前最佳", best.length],
      ],
      info,
      undefined,
      chosen,
    );
    if (chosen.length === clauses.length) return;
    for (
      let i = start;
      i < vertices.length && best.length < clauses.length;
      i++
    ) {
      const next = vertices[i]!;
      if (selected.every((previous) => adjacent(previous, next)))
        visit(i + 1, [...selected, next]);
    }
  }
  visit(0, []);
  t.step(
    "核对是否达到子句数",
    [
      ["最大团", best.join(",")],
      ["可满足", best.length === clauses.length ? "是" : "否"],
    ],
    info,
    undefined,
    best,
    0,
  );
  return t.result(best.length);
}

export const theoryModels: Model[] = [
  {
    id: "approx",
    title: "顶点覆盖 2-近似",
    label: "无向边",
    input: "A-B,B-C,C-D,D-A,B-D",
    run: (a) => vertexCover(a, "", true),
  },
  {
    id: "fpt",
    title: "预算 k 的顶点覆盖分支",
    label: "无向边",
    input: "A-B,B-C,C-D",
    parameterLabel: "覆盖预算 k",
    parameter: "2",
    run: (a, b) => vertexCover(a, b, false),
  },
  {
    id: "dfa",
    title: "DFA 识别末尾 101",
    label: "二进制串",
    input: "01101",
    run: automaton,
  },
  {
    id: "tm",
    title: "图灵机的纸带与步限",
    label: "一元输入串",
    input: "111",
    parameterLabel: "模式,步限，如 加一,20",
    parameter: "加一,20",
    run: machine,
  },
  {
    id: "certificate",
    title: "核验子集和证书",
    label: "候选整数",
    input: "3,7,4,9",
    parameterLabel: "目标:索引列表",
    parameter: "10:0,1",
    run: certificates,
  },
  {
    id: "sat-clique",
    title: "3SAT 到 CLIQUE 的构造",
    label: "三个文字为一组；分号分隔子句",
    input: "1,2,3;-1,4,5;1,-4,6",
    run: clauseClique,
  },
  {
    id: "reduction",
    title: "顶点覆盖与独立集补集归约",
    label: "无向边",
    input: "A-B,B-C,C-D",
    parameterLabel: "候选覆盖顶点",
    parameter: "B,C",
    run: reduction,
  },
];
