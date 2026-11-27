import {
  arcs,
  endpoints,
  network,
  trace,
  type Edge,
  type Frame,
  type Model,
} from "./trace";

export class Heap<T> {
  readonly items: T[] = [];
  constructor(private readonly earlier: (a: T, b: T) => boolean) {}
  push(item: T) {
    const a = this.items;
    let i = a.length;
    a.push(item);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.earlier(a[i]!, a[p]!)) break;
      [a[i], a[p]] = [a[p]!, a[i]!];
      i = p;
    }
  }
  take(): T | undefined {
    const a = this.items,
      first = a[0],
      last = a.pop();
    if (!a.length) return first;
    a[0] = last!;
    for (let i = 0; ;) {
      let smallest = i;
      for (const j of [i * 2 + 1, i * 2 + 2])
        if (j < a.length && this.earlier(a[j]!, a[smallest]!)) smallest = j;
      if (smallest === i) break;
      [a[i], a[smallest]] = [a[smallest]!, a[i]!];
      i = smallest;
    }
    return first;
  }
}
export class Disjoint {
  readonly parent = new Map<string, string>();
  private readonly size = new Map<string, number>();
  constructor(nodes: string[]) {
    for (const id of nodes) {
      this.parent.set(id, id);
      this.size.set(id, 1);
    }
  }
  find(v: string): string {
    const p = this.parent.get(v);
    if (p === undefined) throw Error("顶点未注册。");
    if (p !== v) this.parent.set(v, this.find(p));
    return this.parent.get(v)!;
  }
  connect(a: string, b: string) {
    a = this.find(a);
    b = this.find(b);
    if (a === b) return false;
    if (this.size.get(a)! < this.size.get(b)!) [a, b] = [b, a];
    this.parent.set(b, a);
    this.size.set(a, this.size.get(a)! + this.size.get(b)!);
    return true;
  }
}
export function route(parent: Map<string, string>, start: string, end: string) {
  const seen = new Set<string>(),
    result: string[] = [];
  let current: string | undefined = end;
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    result.unshift(current);
    if (current === start) return result;
    current = parent.get(current);
  }
  return [];
}
function adjacency(edges: Edge[]) {
  const neighbors = new Map<string, Edge[]>();
  for (const edge of edges) {
    const list = neighbors.get(edge.from) ?? [];
    list.push(edge);
    neighbors.set(edge.from, list);
  }
  return (node: string) => neighbors.get(node) ?? [];
}
export function traversal(raw: string, parameter: string, depth: boolean) {
  const directed = raw.includes(">") || !raw.includes("-");
  if (directed && /[A-Za-z]-[A-Za-z]/.test(raw))
    throw Error("同一个遍历实验请使用全有向边或全无向边。");
  const g = network(raw, directed),
    [start, end] = endpoints(parameter);
  if (!g.nodes.includes(start) || !g.nodes.includes(end))
    throw Error("源与目标必须在图中。");
  const t = trace("边检查", "邻接表 Θ(V+E) 时间，Θ(V) 辅助空间", g);
  const adj = adjacency(arcs(g)),
    seen = new Set<string>(),
    parent = new Map<string, string>(),
    order: string[] = [];
  if (depth) {
    function visit(v: string) {
      seen.add(v);
      order.push(v);
      t.step(
        "进入结点并标记",
        [["当前", v]],
        order,
        undefined,
        route(parent, start, v),
        0,
      );
      for (const edge of adj(v)) {
        t.step(
          "检查出边",
          [["边", v + " → " + edge.to]],
          order,
          undefined,
          route(parent, start, v),
        );
        if (!seen.has(edge.to)) {
          parent.set(edge.to, v);
          visit(edge.to);
        }
      }
      t.step("递归返回", [["结点", v]], order, undefined, undefined, 0);
    }
    visit(start);
  } else {
    const q = [start];
    seen.add(start);
    for (let i = 0; i < q.length; i++) {
      const v = q[i]!;
      order.push(v);
      t.step(
        "从队首扩展",
        [["队首", v]],
        q.slice(i),
        undefined,
        route(parent, start, v),
        0,
      );
      for (const edge of adj(v)) {
        t.step(
          "检查出边",
          [["边", v + " → " + edge.to]],
          q.slice(i + 1),
          undefined,
          route(parent, start, v),
        );
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          parent.set(edge.to, v);
          q.push(edge.to);
        }
      }
    }
  }
  const path = route(parent, start, end);
  t.step(
    "取出目标路径",
    [
      ["访问顺序", order.join(" → ")],
      ["路径长度", path.length ? path.length - 1 : "不可达"],
    ],
    order,
    undefined,
    path,
    0,
  );
  return t.result(
    path.length
      ? depth
        ? order.join(",")
        : path.length - 1
      : depth
        ? order.join(",")
        : "不可达",
  );
}
export function topology(raw: string) {
  const g = network(raw),
    inDegree = new Map(g.nodes.map((node) => [node, 0])),
    adj = adjacency(g.edges);
  const t = trace("出边移除", "Kahn：Θ(V+E) 时间，Θ(V) 辅助空间", g);
  for (const edge of g.edges) inDegree.set(edge.to, inDegree.get(edge.to)! + 1);
  const q = g.nodes.filter((v) => inDegree.get(v) === 0),
    order: string[] = [];
  for (let i = 0; i < q.length; i++) {
    const v = q[i]!;
    order.push(v);
    t.step("选择当前零入度结点", [["结点", v]], order, undefined, undefined, 0);
    for (const { to } of adj(v)) {
      const next = inDegree.get(to)! - 1;
      inDegree.set(to, next);
      if (next === 0) q.push(to);
      t.step(
        "移除此结点出边",
        [
          ["目标", to],
          ["剩余入度", next],
        ],
        order,
      );
    }
  }
  return t.result(order.length === g.nodes.length ? order.join(",") : "有环");
}
export function shortest(raw: string, parameter: string, negative: boolean) {
  const g = network(raw),
    [start, end] = endpoints(parameter);
  if (!g.nodes.includes(start) || !g.nodes.includes(end))
    throw Error("源与目标必须在图中。");
  if (!negative && g.edges.some((e) => e.weight < 0))
    throw Error("Dijkstra 要求非负边。请改用 Bellman–Ford。");
  const distance = new Map(
      g.nodes.map((node) => [node, node === start ? 0 : Infinity]),
    ),
    parent = new Map<string, string>();
  const show = () =>
    g.nodes.map(
      (v) =>
        v + ":" + (Number.isFinite(distance.get(v)) ? distance.get(v) : "∞"),
    );
  const t = trace(
    "尝试松弛边",
    negative
      ? "最坏 Θ(VE)，辅助空间 Θ(V)"
      : "懒删除二叉堆 O((V+E) log(E+1))；允许多条平行边",
    g,
  );
  const adj = adjacency(g.edges);
  function relax({ from, to, weight }: Edge, tag: string) {
    const next = distance.get(from)! + weight,
      old = distance.get(to)!;
    if (next < old) {
      distance.set(to, next);
      parent.set(to, from);
    }
    t.step(
      next < old ? "更新更短距离" : "保留旧距离",
      [
        ["边", from + " → " + to],
        ["权重", weight],
        ["阶段", tag],
      ],
      show(),
      undefined,
      route(parent, start, to),
    );
    return next < old;
  }
  if (negative) {
    for (let pass = 1; pass < g.nodes.length; pass++) {
      let changed = false;
      for (const edge of g.edges)
        if (Number.isFinite(distance.get(edge.from)))
          changed = relax(edge, String(pass)) || changed;
      if (!changed) break;
    }
    const impacted = new Set<string>();
    for (const { from, to, weight } of g.edges)
      if (distance.get(from)! + weight < distance.get(to)!) impacted.add(to);
    const q = [...impacted];
    for (let i = 0; i < q.length; i++)
      for (const e of adj(q[i]!))
        if (!impacted.has(e.to)) {
          impacted.add(e.to);
          q.push(e.to);
        }
    if (impacted.size)
      t.step(
        "标记源可达且受负环影响的结点",
        [["受影响", q.join(",")]],
        show(),
        undefined,
        q,
        0,
      );
    if (impacted.has(end)) return t.result("负环影响");
  } else {
    const q = new Heap<{ node: string; d: number }>((a, b) => a.d < b.d);
    q.push({ node: start, d: 0 });
    while (q.items.length) {
      const { node, d } = q.take()!;
      if (d !== distance.get(node)) continue;
      t.step(
        "取当前距离最小的结点",
        [
          ["结点", node],
          ["候选距离", d],
        ],
        show(),
        undefined,
        route(parent, start, node),
        0,
      );
      for (const edge of adj(node))
        if (relax(edge, "堆"))
          q.push({ node: edge.to, d: distance.get(edge.to)! });
    }
  }
  const path = route(parent, start, end);
  t.step(
    "目标路径",
    [["路径", path.join(" → ") || "不可达"]],
    show(),
    undefined,
    path,
    0,
  );
  return t.result(
    Number.isFinite(distance.get(end)) ? distance.get(end)! : "不可达",
  );
}
export function minimumTree(raw: string) {
  const g = network(raw, false),
    d = new Disjoint(g.nodes),
    t = trace(
      "候选边检查",
      "按权排序 O(E log E)，并查集近线性；输出生成森林",
      g,
    );
  const chosen: string[] = [];
  let weight = 0;
  for (const e of [...g.edges].sort((a, b) => a.weight - b.weight)) {
    const used = d.connect(e.from, e.to);
    if (used) {
      chosen.push(e.from + "-" + e.to);
      weight += e.weight;
    }
    t.step(
      used ? "连接两个分量" : "同一分量内会成环",
      [
        ["边", e.from + "-" + e.to],
        ["权重", e.weight],
        ["累计", weight],
      ],
      chosen,
      undefined,
      [e.from, e.to],
    );
  }
  t.step(
    "森林结束",
    [["分量数", g.nodes.length - chosen.length]],
    chosen,
    undefined,
    undefined,
    0,
  );
  return t.result(weight);
}
export function maxFlow(raw: string, parameter: string) {
  const g = network(raw),
    [s, z] = endpoints(parameter);
  if (s === z || !g.nodes.includes(s) || !g.nodes.includes(z))
    throw Error("源、汇须为两个不同的现有顶点。");
  if (g.edges.some((e) => e.weight < 0)) throw Error("容量必须非负。");
  const cap = new Map(g.nodes.map((v) => [v, new Map<string, number>()]));
  for (const { from, to, weight } of g.edges)
    cap.get(from)!.set(to, (cap.get(from)!.get(to) ?? 0) + weight);
  const neighborPairs = new Map(g.nodes.map((v) => [v, new Set<string>()]));
  for (const { from, to } of g.edges) {
    neighborPairs.get(from)!.add(to);
    neighborPairs.get(to)!.add(from);
  }
  const t = trace("残量边检查", "Edmonds–Karp O(VE²) 时间；保留正反向残量", g);
  let value = 0;
  for (;;) {
    const q = [s],
      seen = new Set(q),
      parent = new Map<string, string>();
    for (let i = 0; i < q.length && !seen.has(z); i++) {
      const from = q[i]!;
      for (const to of neighborPairs.get(from)!) {
        const c = cap.get(from)!.get(to) ?? 0;
        t.step(
          "寻找可通行残量边",
          [
            ["残量边", from + " → " + to],
            ["残量", c],
          ],
          q,
          undefined,
          [from, to],
        );
        if (c > 0 && !seen.has(to)) {
          seen.add(to);
          parent.set(to, from);
          q.push(to);
        }
      }
    }
    if (!seen.has(z)) {
      const cut = g.edges
        .filter((e) => seen.has(e.from) && !seen.has(e.to))
        .reduce((a, e) => a + e.weight, 0);
      t.step(
        "残量图不可达，取得割",
        [
          ["割容量", cut],
          ["累计流量", value],
        ],
        [...seen],
        undefined,
        undefined,
        0,
      );
      break;
    }
    const path = route(parent, s, z);
    const delta = Math.min(
      ...path.slice(1).map((to, i) => cap.get(path[i]!)!.get(to)!),
    );
    path.slice(1).forEach((to, i) => {
      const from = path[i]!,
        a = cap.get(from)!,
        b = cap.get(to)!;
      a.set(to, a.get(to)! - delta);
      b.set(from, (b.get(from) ?? 0) + delta);
    });
    value += delta;
    t.step(
      "沿增广路更新正反向残量",
      [
        ["瓶颈", delta],
        ["累计流量", value],
      ],
      undefined,
      undefined,
      path,
      0,
    );
  }
  return t.result(value);
}
export function matching(raw: string) {
  const g = network(raw),
    left = [...new Set(g.edges.map((e) => e.from))],
    right = new Set(g.edges.map((e) => e.to));
  if (left.some((v) => right.has(v)))
    throw Error("左右两侧顶点必须不同。每条边从左到右。");
  const adj = adjacency(g.edges),
    chosen = new Map<string, string>(),
    t = trace(
      "候选配对检查",
      "逐左点增广的 DFS O(|L|E)；不是 Hopcroft–Karp",
      g,
    );
  function extend(v: string, seen: Set<string>, path: string[]): boolean {
    for (const { to } of adj(v)) {
      t.step(
        "检查交替路上的候选右点",
        [["边", v + " → " + to]],
        [...chosen].map(([r, l]) => l + "-" + r),
        undefined,
        [...path, v, to],
      );
      if (seen.has(to)) continue;
      seen.add(to);
      const partner = chosen.get(to);
      if (partner === undefined || extend(partner, seen, [...path, v, to])) {
        chosen.set(to, v);
        return true;
      }
    }
    return false;
  }
  for (const v of left) {
    const success = extend(v, new Set(), []);
    t.step(
      success ? "翻转交替路，配对增加一组" : "无增广路",
      [
        ["左点", v],
        ["当前匹配数", chosen.size],
      ],
      [...chosen].map(([r, l]) => l + "-" + r),
      undefined,
      undefined,
      0,
    );
  }
  return t.result(chosen.size);
}
function graphRepresentation(raw: string, parameter: string) {
  if (parameter !== "有向" && parameter !== "无向")
    throw Error("请选择有向或无向。");
  const directed = parameter === "有向",
    g = network(raw, directed),
    t = trace("邻接项写入", "邻接表 Θ(V+E)，邻接矩阵 Θ(V²) 空间", g);
  const lists = new Map(g.nodes.map((v) => [v, [] as string[]]));
  for (const { from, to } of arcs(g)) {
    lists.get(from)!.push(to);
    t.step(
      "将边写进邻接表",
      [
        ["from", from],
        ["to", to],
      ],
      [...lists].map(([k, v]) => k + ":" + v.join(",")),
    );
  }
  const matrix = g.nodes.map((from) =>
    [
      from,
      ...g.nodes.map((to) => (lists.get(from)!.includes(to) ? "1" : "0")),
    ].join(" "),
  );
  t.step(
    "对照布尔邻接矩阵（列序与顶点相同）",
    [["列标签", g.nodes.join(",")]],
    matrix,
    undefined,
    undefined,
    0,
  );
  return t.result(t.count());
}
const defaultGraph = "A>B:2,A>C:5,B>C:1,B>D:5,C>D:3";
export const graphModels: Model[] = [
  {
    id: "representation",
    title: "图的邻接表示",
    label: "边，格式 A>B",
    input: defaultGraph,
    parameterLabel: "有向 / 无向",
    parameter: "有向",
    run: graphRepresentation,
  },
  {
    id: "bfs",
    title: "BFS 分层遍历",
    label: "边（有向 A>B 或无向 A-B）",
    input: defaultGraph,
    parameterLabel: "起点,终点",
    parameter: "A,D",
    run: (a, b) => traversal(a, b, false),
  },
  {
    id: "dfs",
    title: "DFS 进入与回溯",
    label: "边（有向 A>B 或无向 A-B）",
    input: defaultGraph,
    parameterLabel: "起点,终点",
    parameter: "A,D",
    run: (a, b) => traversal(a, b, true),
  },
  {
    id: "topo",
    title: "Kahn 拓扑排序",
    label: "有向边，格式 A>B",
    input: "A>B,A>C,C>D,B>D",
    run: topology,
  },
  {
    id: "dijkstra",
    title: "Dijkstra 非负最短路",
    label: "加权有向边，格式 A>B:2",
    input: defaultGraph,
    parameterLabel: "起点,终点",
    parameter: "A,D",
    run: (a, b) => shortest(a, b, false),
  },
  {
    id: "bellman",
    title: "Bellman–Ford 与负环",
    label: "加权有向边，格式 A>B:-2",
    input: "A>B:5,A>C:2,C>B:-1,B>D:4",
    parameterLabel: "起点,终点",
    parameter: "A,D",
    run: (a, b) => shortest(a, b, true),
  },
  {
    id: "mst",
    title: "Kruskal 最小生成森林",
    label: "无向加权边，格式 A-B:4",
    input: "A-B:1,B-C:2,A-C:5,C-D:3,B-D:9",
    run: minimumTree,
  },
  {
    id: "flow",
    title: "Edmonds–Karp 最大流",
    label: "有向容量，格式 A>B:3",
    input: "S>A:3,S>B:2,A>B:1,A>T:2,B>T:3",
    parameterLabel: "源,汇",
    parameter: "S,T",
    run: maxFlow,
  },
  {
    id: "matching",
    title: "二分图交替路与匹配",
    label: "左点到右点，格式 A>X",
    input: "A>X,A>Y,B>X,C>Y,C>Z",
    run: matching,
  },
];
export type { Frame };
