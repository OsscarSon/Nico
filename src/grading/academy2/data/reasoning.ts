export function temperature(logits: number[], heat: number) {
  if (
    logits.length < 2 ||
    logits.length > 16 ||
    logits.some((v) => !Number.isFinite(v)) ||
    !(heat > 0 && heat <= 10)
  )
    throw Error("输入 2–16 个有限 logits，温度须在 (0,10]。");
  const peak = Math.max(...logits),
    scaled = logits.map((value) => Math.exp((value - peak) / heat)),
    total = scaled.reduce((a, b) => a + b, 0);
  return scaled.map((value) => value / total);
}
function tokens(s: string) {
  const words = s.toLowerCase().match(/[a-z0-9]+|\p{Script=Han}/gu) ?? [];
  const entries = new Map<string, number>();
  words.forEach((word) => entries.set(word, (entries.get(word) ?? 0) + 1));
  return entries;
}
export type Document = { id: string; text: string };
export const documents: Document[] = [
  {
    id: "library",
    text: "The library opens at nine. Books can be borrowed for fourteen days. 图书馆上午九点开放，借期十四天。",
  },
  {
    id: "lab",
    text: "The computer lab requires a reservation. 打开电脑实验室前先预约。",
  },
  {
    id: "bus",
    text: "The shuttle bus stops at the north gate. 校车在北门停靠。",
  },
];
export function retrieve(query: string, docs: Document[], threshold = 0.13) {
  const q = tokens(query),
    magnitude = (vector: Map<string, number>) => Math.hypot(...vector.values());
  const norm = magnitude(q);
  const matches = docs
    .map((doc) => {
      const d = tokens(doc.text),
        den = norm * magnitude(d);
      const score = den
        ? [...q].reduce(
            (sum, [word, count]) => sum + count * (d.get(word) ?? 0),
            0,
          ) / den
        : 0;
      return { ...doc, score };
    })
    .sort((a, b) => b.score - a.score);
  const hit = matches[0] && matches[0].score >= threshold ? matches[0] : null;
  return { hit, matches };
}
export const retrievalCases = [
  { query: "library opens", expected: "library" },
  { query: "computer lab reservation", expected: "lab" },
  { query: "校车北门", expected: "bus" },
  { query: "mars volcano diameter", expected: null },
] as const;
export function evaluateAssistant(docs: Document[], threshold: number) {
  const table = retrievalCases.map((test) => {
    const { hit } = retrieve(test.query, docs, threshold),
      id = hit?.id ?? null;
    return {
      ...test,
      actual: id,
      score: hit?.score ?? null,
      passed: id === test.expected,
    };
  });
  return { table, passed: table.filter((row) => row.passed).length };
}

export type Rule = { when: string[]; then: string };
export function infer(facts: string[], rules: Rule[]) {
  const known = new Set(facts),
    applied: { rule: number; result: string }[] = [];
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const [i, rule] of rules.entries())
      if (!known.has(rule.then) && rule.when.every((fact) => known.has(fact))) {
        known.add(rule.then);
        applied.push({ rule: i + 1, result: rule.then });
        expanded = true;
      }
  }
  return { known: [...known], applied };
}
export const resourceRules: Rule[] = [
  { when: ["reservation", "trained"], then: "eligible" },
  { when: ["eligible", "room-open"], then: "can-use-lab" },
  { when: ["can-use-lab", "project"], then: "can-record" },
];

type Coord = readonly [number, number];
export function astar(
  size: number,
  start: Coord,
  goal: Coord,
  blocked: Coord[],
  heuristic = true,
) {
  const key = (pair: Coord) => pair.join(","),
    blockedKeys = new Set(blocked.map(key));
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    size > 20 ||
    [start, goal, ...blocked].some((p) =>
      p.some((x) => !Number.isInteger(x) || x < 0 || x >= size),
    ) ||
    blockedKeys.has(key(start)) ||
    blockedKeys.has(key(goal))
  )
    throw Error("检查网格坐标及障碍位置。");
  const h = ([x, y]: Coord) =>
    heuristic ? Math.abs(x - goal[0]) + Math.abs(y - goal[1]) : 0;
  const frontier = [{ pos: start, g: 0 }],
    dist = new Map([[key(start), 0]]),
    before = new Map<string, Coord>(),
    visited: Coord[] = [];
  while (frontier.length) {
    frontier.sort((a, b) => a.g + h(a.pos) - b.g - h(b.pos));
    const { pos, g } = frontier.shift()!;
    const id = key(pos);
    if (dist.get(id) !== g) continue;
    visited.push(pos);
    if (id === key(goal)) {
      const path: Coord[] = [pos];
      while (before.has(key(path[0]!)))
        path.unshift(before.get(key(path[0]!))!);
      return { visited, path, length: g };
    }
    const [x, y] = pos;
    for (const step of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as Coord[]) {
      const k = key(step);
      if (
        step.some((v) => v < 0 || v >= size) ||
        blockedKeys.has(k) ||
        g + 1 >= (dist.get(k) ?? Infinity)
      )
        continue;
      dist.set(k, g + 1);
      before.set(k, pos);
      frontier.push({ pos: step, g: g + 1 });
    }
  }
  return { visited, path: [], length: null };
}
export function minimax(leaves: number[]) {
  if (
    leaves.length < 2 ||
    leaves.length > 32 ||
    leaves.length & (leaves.length - 1) ||
    leaves.some((x) => !Number.isFinite(x))
  )
    throw Error("输入 2、4、8、16 或 32 个有限叶节点效用。");
  let count = 0;
  const lines: { level: number; action: string; value: number }[] = [];
  function visit(
    l: number,
    r: number,
    max: boolean,
    alpha: number,
    beta: number,
    depth: number,
  ): number {
    if (r - l === 1) {
      count++;
      return leaves[l]!;
    }
    const cut = (l + r) >> 1,
      a = visit(l, cut, !max, alpha, beta, depth + 1);
    const pruned = max ? a >= beta : a <= alpha;
    const b = pruned
      ? a
      : visit(
          cut,
          r,
          !max,
          max ? Math.max(alpha, a) : alpha,
          max ? beta : Math.min(beta, a),
          depth + 1,
        );
    const value = max ? Math.max(a, b) : Math.min(a, b);
    lines.push({
      level: depth,
      action: (max ? "MAX" : "MIN") + (pruned ? " 剪枝" : ""),
      value,
    });
    return value;
  }
  const value = visit(0, leaves.length, true, -Infinity, Infinity, 0);
  return { value, count, lines };
}
