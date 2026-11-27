/** Generate small cases and compute answers independently of the reference exercise code. */
export function verificationCases(
  model: string,
  seed: number,
): { args: number[][]; expected: number }[] {
  let state = seed >>> 0;
  function integer(max: number) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * max);
  }
  const size = 4 + integer(5),
    data = Array.from({ length: size }, () => integer(19) - 9);
  const value = data[integer(size)]!,
    sorted = [...data].sort((a, b) => a - b),
    rank = integer(size),
    a = integer(8) + 1,
    b = integer(8) + 1;
  switch (model) {
    case "invariant":
      return [
        {
          args: [data, [value]],
          expected: data.filter((x) => x >= value).length,
        },
      ];
    case "linear":
      return [{ args: [data, [value]], expected: data.indexOf(value) }];
    case "binary":
      return [
        {
          args: [sorted, [value]],
          expected: sorted.filter((x) => x < value).length,
        },
      ];
    case "sort":
      return [{ args: [data, [rank]], expected: sorted[rank]! }];
    case "hash":
      return [{ args: [data], expected: new Set(data).size }];
    case "recursive":
      return [
        {
          args: [[a]],
          expected: Array.from({ length: a }, (_, i) => i + 1).reduce(
            (product, x) => product * x,
            1,
          ),
        },
      ];
    case "heap":
      return [{ args: [data, [rank + 1]], expected: sorted[rank]! }];
    case "bfs":
      return [
        {
          args: [
            [0, 1, 1, 2, 2, 3, 0, 4, 4, 3],
            [0, seed % 2 ? 3 : 5],
          ],
          expected: seed % 2 ? 2 : -1,
        },
      ];
    case "dijkstra":
      return [
        {
          args: [
            [0, 1, a + b + 1, 0, 2, a, 2, 1, b],
            [0, 1],
          ],
          expected: a + b,
        },
      ];
    case "prefix":
      return [
        {
          args: [data, [1, size - 1]],
          expected: data.slice(1, -1).reduce((total, x) => total + x, 0),
        },
      ];
    case "kmp":
      return [
        {
          args: [
            Array<number>(size).fill(value),
            Array<number>(rank + 1).fill(value),
          ],
          expected: size - rank,
        },
      ];
    case "certificate":
      return [
        {
          args: [data, [rank], [(seed % 2 ? 0 : 1) + data[rank]!]],
          expected: seed % 2 ? 1 : 0,
        },
      ];
    case "dp": {
      const items = [
          [2, a],
          [3, b],
          [4, a + b - 1],
        ],
        capacity = 2 + rank;
      const options = Array.from({ length: 8 }, (_, mask) =>
        items.filter((_, i) => Boolean(mask & (1 << i))),
      ).filter(
        (choice) =>
          choice.reduce((weight, item) => weight + item[0]!, 0) <= capacity,
      );
      return [
        {
          args: [items.flat(), [capacity]],
          expected: Math.max(
            ...options.map((choice) =>
              choice.reduce((total, item) => total + item[1]!, 0),
            ),
          ),
        },
      ];
    }
    case "window": {
      const w = rank + 1,
        windows = data
          .slice(w - 1)
          .map((_, i) =>
            data.slice(i, i + w).reduce((total, x) => total + x, 0),
          );
      return [{ args: [data, [w]], expected: Math.max(...windows) }];
    }
    case "segment":
    case "fenwick": {
      const updated = [...data];
      updated[rank] = value;
      return [
        {
          args: [data, [0, rank, size, 1, rank, value, 0, 0, size]],
          expected: [...data.slice(rank), ...updated].reduce(
            (total, x) => total + x,
            0,
          ),
        },
      ];
    }
    case "suffix": {
      const order = data
        .map((_, i) => i)
        .sort((i, j) => {
          for (; i < size && j < size; i++, j++)
            if (data[i] !== data[j]) return data[i]! - data[j]!;
          return j - i;
        });
      return [{ args: [data, [rank]], expected: order[rank]! }];
    }
    case "dfa": {
      const bits = data.map((x) => (x < 0 ? 0 : 1));
      return [
        { args: [bits], expected: Number(bits.slice(-3).join("") === "101") },
      ];
    }
    case "avl":
      return [{ args: [[a, a + b + 5, a + b]], expected: a + b }];
    case "trie": {
      const words = [a, 10 * a + (b % 10), 100 * a, 10 * a + (b % 10), 910 + a];
      return [
        {
          args: [words, [a]],
          expected: [...new Set(words)].filter((x) =>
            String(x).startsWith(String(a)),
          ).length,
        },
      ];
    }
    case "union":
      return [{ args: [[0, 1, 1, 2, 2, 0], [size]], expected: size - 2 }];
    case "dfs":
      return [
        {
          args: [[0, 1, 1, 2, 2, 0, 2, 3], [seed % 2 ? 0 : 3]],
          expected: seed % 2 ? 4 : 1,
        },
      ];
    case "topo":
      return [
        {
          args: [[0, 1, 1, 2, 2, seed % 2 ? 3 : 0], [size]],
          expected: seed % 2 ? 1 : 0,
        },
      ];
    case "bellman":
      return [
        {
          args: [
            [0, 1, a + b + 1, 0, 2, a, 2, 1, -b],
            [0, 1],
          ],
          expected: a - b,
        },
      ];
    case "mst":
      return [
        {
          args: [[0, 1, a, 1, 2, b, 0, 2, a + b + 1, 4, 5, -2]],
          expected: a + b - 2,
        },
      ];
    case "queens": {
      const n = (seed % 4) + 4;
      return [{ args: [[n]], expected: [2, 10, 4, 40][n - 4]! }];
    }
    case "flow":
      return [
        {
          args: [
            [0, 1, a, 0, 2, b, 1, 2, 1, 1, 3, a + 1, 2, 3, b + 1],
            [0, 3],
          ],
          expected: a + b,
        },
      ];
    case "matching":
      return [
        {
          args: [
            seed % 2 ? [0, 0, 0, 1, 1, 0, 2, 1, 2, 2] : [0, 1, 1, 1, 2, 1],
          ],
          expected: seed % 2 ? 3 : 1,
        },
      ];
    case "geometry":
      return [
        {
          args: [[0, 0, 2 * a, 0, 2 * a, 2 * b, 0, 2 * b, a, b, 0, b]],
          expected: 4,
        },
      ];
    default:
      return [];
  }
}
