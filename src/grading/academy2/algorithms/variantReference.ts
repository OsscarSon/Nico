import {
  network,
  endpoints,
  pairs,
  values,
  type Network,
  type Scalar,
} from "./trace";

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const numbered = (n: number) => Array.from({ length: n }, (_, i) => i);
function shortest(
  g: Network,
  from: string,
  to: string,
  weighted: boolean,
): Scalar {
  // Enumerate simple paths for the small, cycle-free weighted fixtures.
  function visit(u: string, seen: Set<string>, cost: number): number {
    if (u === to) return cost;
    return Math.min(
      Infinity,
      ...g.edges
        .filter((e) => e.from === u && !seen.has(e.to))
        .map((e) =>
          visit(
            e.to,
            new Set([...seen, e.to]),
            cost + (weighted ? e.weight : 1),
          ),
        ),
    );
  }
  const best = visit(from, new Set([from]), 0);
  return Number.isFinite(best) ? best : "不可达";
}
function minTree(g: Network) {
  const { edges, nodes } = g;
  let best = Infinity;
  for (const mask of numbered(2 ** edges.length)) {
    const subset = edges.filter((_, i) => mask & (1 << i));
    if (subset.length !== nodes.length - 1) continue;
    const reached = new Set([nodes[0]]);
    for (const _ of nodes) {
      void _;
      for (const { from, to } of subset) {
        if (reached.has(from)) reached.add(to);
        if (reached.has(to)) reached.add(from);
      }
    }
    if (reached.size === nodes.length)
      best = Math.min(best, sum(subset.map((e) => e.weight)));
  }
  return best;
}
function minCut(g: Network, source: string, sink: string) {
  const other = g.nodes.filter((v) => v !== source && v !== sink);
  return Math.min(
    ...numbered(2 ** other.length).map((mask) => {
      const left = new Set([
        source,
        ...other.filter((_, i) => mask & (1 << i)),
      ]);
      return sum(
        g.edges
          .filter((edge) => left.has(edge.from) && !left.has(edge.to))
          .map((edge) => edge.weight),
      );
    }),
  );
}

export function independentVariantResult(
  id: string,
  input: string,
  parameter: string,
): Scalar {
  switch (id) {
    case "invariant":
      return values(input).filter((x) => x >= Number(parameter)).length;
    case "cost": {
      const n = Number(input);
      return parameter === "线性"
        ? n
        : parameter === "三角"
          ? (n * (n + 1)) / 2
          : Math.floor(Math.log2(n)) + 1;
    }
    case "linear":
    case "binary":
      return values(input).indexOf(Number(parameter));
    case "sort":
    case "random":
      return values(input)
        .sort((a, b) => a - b)
        .join(",");
    case "hash": {
      const k = Number(parameter),
        keys = [...new Set(values(input))];
      return keys.length - new Set(keys.map((key) => ((key % k) + k) % k)).size;
    }
    case "recursive": {
      const n = Number(input);
      if (parameter === "阶乘")
        return numbered(n).reduce((p, i) => p * (i + 1), 1);
      let a = 0,
        b = 1;
      for (let i = 0; i < n; i++) [a, b] = [b, a + b];
      return a;
    }
    case "bfs":
    case "dijkstra":
    case "bellman":
      return shortest(network(input), ...endpoints(parameter), id !== "bfs");
    case "mst":
      return minTree(network(input, false));
    case "heap":
      return values(input)
        .sort((a, b) => a - b)
        .slice(0, Number(parameter))
        .join(",");
    case "prefix": {
      const [l, r] = values(parameter);
      return sum(values(input).slice(l, r));
    }
    case "segment":
    case "fenwick": {
      const a = values(input);
      let answer = 0;
      for (const item of parameter.split(",")) {
        const [kind, left, right] = item.split(":"),
          l = Number(left),
          r = Number(right);
        if (kind === "u") a[l] = r;
        else answer = sum(a.slice(l, r));
      }
      return answer;
    }
    case "window": {
      const data = values(input),
        k = Number(parameter);
      return Math.max(
        ...numbered(data.length - k + 1).map((i) => sum(data.slice(i, i + k))),
      );
    }
    case "greedy": {
      const data = pairs(input);
      return Math.max(
        ...numbered(2 ** data.length).map((mask) => {
          const selected = data
            .filter((_, i) => mask & (1 << i))
            .sort((a, b) => a[0] - b[0]);
          return selected.every(([l], i) => !i || l >= selected[i - 1]![1])
            ? selected.length
            : 0;
        }),
      );
    }
    case "dp": {
      const data = pairs(input);
      return Math.max(
        ...numbered(2 ** data.length).map((mask) => {
          const selected = data.filter((_, i) => mask & (1 << i));
          return sum(selected.map(([w]) => w)) <= Number(parameter)
            ? sum(selected.map(([, v]) => v))
            : 0;
        }),
      );
    }
    case "kmp":
      return [...input]
        .flatMap((_, i) => (input.startsWith(parameter, i) ? [i] : []))
        .join(",");
    case "flow":
      return minCut(network(input), ...endpoints(parameter));
    case "dfa":
      return input.endsWith("101") ? "接受" : "拒绝";
    case "certificate": {
      const [target, indices] = parameter.split(":"),
        arr = values(input),
        chosen = values(indices ?? "");
      return new Set(chosen).size === chosen.length &&
        chosen.every((i) => i >= 0 && i < arr.length) &&
        sum(chosen.map((i) => arr[i]!)) === Number(target)
        ? "有效"
        : "无效";
    }
    default:
      throw Error("该变式无独立参考算法 " + id);
  }
}
