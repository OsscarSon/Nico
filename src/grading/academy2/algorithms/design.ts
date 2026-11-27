import { integer, pairs, trace, values, type Model } from "./trace";

function recurrence(raw: string) {
  const n = integer(raw, 1, 16);
  if (n & (n - 1)) throw Error("为比较层成本，n 取 1、2、4、8 或 16。");
  const t = trace("工作单位", "T(n)=2T(n/2)+n，T(1)=1，因此 Θ(n log n)");
  function full(size: number, level: number): number {
    if (size === 1) {
      t.step("叶结点成本 1", [["深度", level]]);
      return 1;
    }
    t.step(
      "分出两个同规模子问题",
      [
        ["规模", size],
        ["深度", level],
      ],
      undefined,
      undefined,
      undefined,
      size,
    );
    return size + full(size / 2, level + 1) + full(size / 2, level + 1);
  }
  return t.result(full(n, 0));
}
export function schedule(raw: string) {
  const jobs = pairs(raw, 22);
  if (jobs.some(([a, b]) => a >= b))
    throw Error("活动必须满足开始严格早于结束。");
  const sorted = jobs
    .map(([a, b], i) => ({ a, b, i }))
    .sort((x, y) => x.b - y.b);
  const t = trace("候选活动检查", "排序 O(n log n)，线性贪心扫描；半开区间");
  let end = -Infinity;
  const accepted: string[] = [];
  for (const { a, b, i } of sorted) {
    const use = a >= end;
    if (use) {
      accepted.push("活动 " + (i + 1));
      end = b;
    }
    t.step(
      use ? "选择最早结束的兼容活动" : "与已选活动冲突",
      [
        ["开始", a],
        ["结束", b],
      ],
      accepted,
    );
  }
  return t.result(accepted.length);
}
function queens(raw: string) {
  const n = integer(raw, 1, 7),
    t = trace(
      "合法候选访问",
      "搜索树结点 O(n!)，每个结点枚举 n 列，时间 O(n·n!)，辅助空间 O(n)",
    );
  const board: number[] = [];
  let count = 0;
  const used = new Set<number>(),
    diag = new Set<number>(),
    anti = new Set<number>();
  function explore(row: number) {
    if (row === n) {
      count++;
      t.step(
        "记录一个完整解",
        [["解计数", count]],
        board,
        undefined,
        undefined,
        0,
      );
      return;
    }
    for (let col = 0; col < n; col++) {
      if (used.has(col) || diag.has(row - col) || anti.has(row + col)) continue;
      used.add(col);
      diag.add(row - col);
      anti.add(row + col);
      board.push(col);
      t.step(
        "放置不冲突皇后",
        [
          ["行", row],
          ["列", col],
        ],
        board,
      );
      explore(row + 1);
      board.pop();
      used.delete(col);
      diag.delete(row - col);
      anti.delete(row + col);
      t.step(
        "撤销，继续下一候选",
        [["回到行", row]],
        board,
        undefined,
        undefined,
        0,
      );
    }
  }
  explore(0);
  return t.result(count);
}
export function knapsack(raw: string, parameter: string) {
  const items = pairs(raw, 18),
    capacity = integer(parameter, 0, 30);
  if (items.some(([w, v]) => w < 1 || v < 0))
    throw Error("重量为正，价值非负。");
  const t = trace(
    "状态更新",
    "0/1 背包 Θ(nW) 时间、Θ(W) 空间；W 是数值大小，伪多项式",
  );
  const dp = new Array<number>(capacity + 1).fill(0);
  for (const [w, v] of items) {
    for (let c = capacity; c >= w; c--) {
      dp[c] = Math.max(dp[c]!, dp[c - w]! + v);
      t.step(
        "从大到小用该物品更新容量",
        [
          ["重量", w],
          ["价值", v],
          ["容量", c],
        ],
        dp,
        [c],
      );
    }
  }
  return t.result(dp[capacity]!);
}
function windowSum(raw: string, parameter: string) {
  const a = values(raw, 32, 1),
    k = integer(parameter, 1, a.length),
    t = trace("加入或移除一个值", "固定宽度 Θ(n) 时间、Θ(1) 额外空间");
  let total = 0,
    best = -Infinity;
  for (let i = 0; i < a.length; i++) {
    total += a[i]!;
    t.step("纳入右端", [["当前和", total]], a, [i]);
    if (i >= k) {
      total -= a[i - k]!;
      t.step("减去刚滑出的值", [["当前和", total]], a, [i - k, i]);
    }
    if (i >= k - 1) {
      best = Math.max(best, total);
      t.step(
        "更新完整窗口最大和",
        [["最大和", best]],
        a,
        undefined,
        undefined,
        0,
      );
    }
  }
  return t.result(best);
}
function pointers(raw: string, parameter: string) {
  const a = values(raw, 32),
    target = integer(parameter, -2000, 2000);
  if (a.some((v, i) => i > 0 && a[i - 1]! > v))
    throw Error("此双指针版本需要非递减输入。");
  const t = trace("考查一对", "有序输入 Θ(n) 时间、Θ(1) 空间");
  for (let i = 0, j = a.length - 1; i < j;) {
    const sum = a[i]! + a[j]!;
    t.step(
      "根据和排除一整组配对",
      [
        ["左", i],
        ["右", j],
        ["当前和", sum],
      ],
      a,
      [i, j],
    );
    if (sum === target) return t.result(i + "," + j);
    if (sum < target) i++;
    else j--;
  }
  return t.result("无解");
}
function prefix(raw: string, parameter: string) {
  const a = values(raw),
    limits = values(parameter, 2, 2),
    l = limits[0]!,
    r = limits[1]!;
  if (l < 0 || l > r || r > a.length) throw Error("须满足 0≤l≤r≤n。");
  const t = trace("前缀写入", "预处理 Θ(n) 时间和空间；静态查询 Θ(1)"),
    p = [0];
  a.forEach((value) => {
    p.push(p.at(-1)! + value);
    t.step("累加到下一前缀", [["加入", value]], p, [p.length - 1]);
  });
  return t.result(p[r]! - p[l]!);
}
function amortized(raw: string) {
  const n = integer(raw, 0, 32),
    t = trace(
      "单元素写入",
      "容量翻倍的 n 次追加总写入 Θ(n)，单次最坏 Θ(n)，摊还 Θ(1)",
    );
  const installed: number[] = [];
  let capacity = 0;
  for (let length = 0; length < n; length++) {
    if (length === capacity) {
      capacity = Math.max(1, 2 * capacity);
      t.step(
        "搬移旧元素到新缓冲区",
        [
          ["新容量", capacity],
          ["旧元素数", length],
        ],
        installed,
        undefined,
        undefined,
        length,
      );
    }
    installed.push(length);
    t.step(
      "写入新元素",
      [
        ["容量", capacity],
        ["势能 2·size−capacity", 2 * (length + 1) - capacity],
      ],
      installed,
    );
  }
  return t.result(t.count());
}
export function hull(raw: string) {
  const points = pairs(raw, 24),
    t = trace("方向检查", "单调链 O(n log n) 排序，扫描 O(n)；只保留极端点");
  const unique = [
    ...new Map(points.map((p) => [p.join(","), p])).values(),
  ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  t.step(
    "按坐标排序并去重",
    [["不同点的数量", unique.length]],
    unique.map((p) => p.join(",")),
    undefined,
    undefined,
    0,
    { plot: { points: unique, chain: [] } },
  );
  if (unique.length < 2) return t.result(unique.length);
  function half(order: typeof unique) {
    const out: typeof unique = [];
    for (const p of order) {
      while (out.length > 1) {
        const a = out[out.length - 2]!,
          b = out.at(-1)!;
        const cross =
          (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
        t.step(
          cross <= 0 ? "非严格左转，弹出中点" : "保留左转",
          [
            ["叉积", cross],
            ["新点", p.join(",")],
          ],
          out.map((q) => q.join(",")),
          undefined,
          undefined,
          1,
          { plot: { points: unique, chain: [...out, p] } },
        );
        if (cross > 0) break;
        out.pop();
        t.step(
          "当前凸链缩短",
          [],
          out.map((q) => q.join(",")),
          undefined,
          undefined,
          0,
          { plot: { points: unique, chain: [...out] } },
        );
      }
      out.push(p);
      t.step(
        "加入当前极端点",
        [["坐标", p.join(",")]],
        out.map((q) => q.join(",")),
        undefined,
        undefined,
        0,
        { plot: { points: unique, chain: [...out] } },
      );
    }
    return out;
  }
  const boundary = [
    ...half(unique).slice(0, -1),
    ...half([...unique].reverse()).slice(0, -1),
  ];
  t.step(
    "拼接上下凸链",
    [["边界点", boundary.length]],
    boundary.map((q) => q.join(",")),
    undefined,
    undefined,
    0,
    { plot: { points: unique, chain: boundary, close: true } },
  );
  return t.result(boundary.length);
}
function quicksort(raw: string, parameter: string) {
  const a = values(raw, 32),
    seed = integer(parameter, 0, 100000);
  const t = trace(
    "参与分区的键",
    "随机独立枢轴，期望 O(n log n)，最坏 Θ(n²)；本实现保留分区数组",
  );
  let state = seed >>> 0;
  function sort(part: number[]): number[] {
    if (part.length < 2) return part;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const pivot = part[Math.floor((state / 4294967296) * part.length)]!;
    const low: number[] = [],
      equal: number[] = [],
      high: number[] = [];
    for (const v of part) {
      (v < pivot ? low : v === pivot ? equal : high).push(v);
      t.step(
        "按随机枢轴分到三组",
        [
          ["枢轴", pivot],
          ["元素", v],
          ["三组长度", low.length + "/" + equal.length + "/" + high.length],
        ],
        part,
      );
    }
    return [...sort(low), ...equal, ...sort(high)];
  }
  return t.result(sort(a).join(","));
}
function paging(raw: string, parameter: string) {
  const a = values(raw),
    cap = integer(parameter, 1, 8),
    t = trace("页请求", "LRU 依赖历史，Belady 需要未来；计数是缺页次数");
  const lru = new Map<number, number>(),
    off = new Set<number>();
  let faults = 0,
    opt = 0;
  a.forEach((page, i) => {
    if (!lru.has(page)) {
      faults++;
      if (lru.size === cap) lru.delete(lru.keys().next().value!);
    }
    lru.delete(page);
    lru.set(page, i);
    if (!off.has(page)) {
      opt++;
      if (off.size === cap) {
        let victim: number | undefined,
          farthest = -1;
        for (const x of off) {
          const j = a.indexOf(x, i + 1),
            next = j < 0 ? Infinity : j;
          if (next > farthest) {
            victim = x;
            farthest = next;
          }
        }
        off.delete(victim!);
      }
      off.add(page);
    }
    t.step(
      "LRU 与知道未来的策略处理同一请求",
      [
        ["页", page],
        ["LRU 缺页", faults],
        ["离线最优缺页", opt],
      ],
      [...lru.keys()],
    );
  });
  return t.result(faults);
}
export const designModels: Model[] = [
  {
    id: "recurrence",
    title: "分治递归树成本",
    label: "2 的幂，n≤16",
    input: "8",
    run: recurrence,
  },
  {
    id: "greedy",
    title: "最早结束区间调度",
    label: "开始,结束；活动之间用分号",
    input: "0,3;1,2;2,4;3,5;4,6",
    run: schedule,
  },
  {
    id: "queens",
    title: "N 皇后回溯",
    label: "棋盘大小（1–7）",
    input: "4",
    run: queens,
  },
  {
    id: "dp",
    title: "0/1 背包表",
    label: "重量,价值；物品之间用分号",
    input: "2,4;3,5;4,6",
    parameterLabel: "容量",
    parameter: "5",
    run: knapsack,
  },
  {
    id: "window",
    title: "固定窗口最大和",
    label: "整数数组",
    input: "-2,3,6,-4,2",
    parameterLabel: "窗口宽度",
    parameter: "3",
    run: windowSum,
  },
  {
    id: "pointers",
    title: "有序两数之和",
    label: "升序列表",
    input: "1,3,4,7,10",
    parameterLabel: "目标和",
    parameter: "11",
    run: pointers,
  },
  {
    id: "prefix",
    title: "静态前缀和",
    label: "整数数组",
    input: "2,1,5,-2,4",
    parameterLabel: "左闭右开：l,r",
    parameter: "1,4",
    run: prefix,
  },
  {
    id: "amortized",
    title: "动态数组追加的摊还成本",
    label: "追加次数",
    input: "9",
    run: amortized,
  },
  {
    id: "geometry",
    title: "点集凸包",
    label: "x,y；点之间用分号",
    input: "0,0;2,0;2,2;0,2;1,1;1,0",
    run: hull,
  },
  {
    id: "random",
    title: "可复现随机快速排序",
    label: "整数数组",
    input: "8,2,7,2,1,5",
    parameterLabel: "随机种子",
    parameter: "23",
    run: quicksort,
  },
  {
    id: "online",
    title: "LRU 与离线最优分页",
    label: "页号序列",
    input: "1,2,3,1,2,4,1,2,3,4",
    parameterLabel: "缓存页数",
    parameter: "3",
    run: paging,
  },
];
