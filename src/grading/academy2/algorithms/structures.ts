import { Disjoint, Heap } from "./graphs";
import {
  integer,
  network,
  trace,
  values,
  type Model,
  type TreeFrame,
} from "./trace";

type Node = { key: number; h: number; left?: Node; right?: Node };
const height = (node?: Node) => node?.h ?? 0;
function update(node: Node) {
  node.h = 1 + Math.max(height(node.left), height(node.right));
  return node;
}
function tree(raw: string, find: string, balanced: boolean) {
  const a = values(raw, 18),
    target = integer(find);
  const t = trace(
    "键比较",
    balanced
      ? "AVL 插入和查询 O(log n)，旋转 O(1)"
      : "普通 BST O(h)；最坏 h=Θ(n)",
  );
  let root: Node | undefined;
  const snapshot = (node?: Node, prefix = "根"): string[] =>
    !node
      ? []
      : [
          prefix + ":" + node.key + "(h" + node.h + ")",
          ...snapshot(node.left, "左"),
          ...snapshot(node.right, "右"),
        ];
  function diagram(node?: Node): TreeFrame | undefined {
    return (
      node && {
        key: node.key,
        height: node.h,
        left: diagram(node.left),
        right: diagram(node.right),
      }
    );
  }
  function rotateRight(p: Node) {
    const q = p.left!;
    p.left = q.right;
    q.right = update(p);
    update(q);
    t.step(
      "右旋",
      [
        ["旧根", p.key],
        ["新根", q.key],
      ],
      snapshot(q),
      undefined,
      undefined,
      0,
      { tree: diagram(q) },
    );
    return q;
  }
  function rotateLeft(p: Node) {
    const q = p.right!;
    p.right = q.left;
    q.left = update(p);
    update(q);
    t.step(
      "左旋",
      [
        ["旧根", p.key],
        ["新根", q.key],
      ],
      snapshot(q),
      undefined,
      undefined,
      0,
      { tree: diagram(q) },
    );
    return q;
  }
  function insert(key: number, node?: Node): Node {
    if (!node) return { key, h: 1 };
    t.step(
      "按 BST 规则选择子树",
      [
        ["当前结点", node.key],
        ["新键", key],
      ],
      snapshot(root),
      undefined,
      undefined,
      1,
      { tree: diagram(root) },
    );
    if (key === node.key) return node;
    if (key < node.key) node.left = insert(key, node.left);
    else node.right = insert(key, node.right);
    update(node);
    const delta = height(node.left) - height(node.right);
    if (balanced && delta > 1) {
      if (key > node.left!.key) node.left = rotateLeft(node.left!);
      return rotateRight(node);
    }
    if (balanced && delta < -1) {
      if (key < node.right!.key) node.right = rotateRight(node.right!);
      return rotateLeft(node);
    }
    return node;
  }
  for (const key of a) {
    root = insert(key, root);
    t.step(
      "插入结果",
      [["根高度", root.h]],
      snapshot(root),
      undefined,
      undefined,
      0,
      { tree: diagram(root) },
    );
  }
  let current = root,
    depth = 0;
  while (current) {
    t.step(
      "比较查询键",
      [
        ["候选结点", current.key],
        ["目标", target],
        ["深度", depth],
      ],
      snapshot(root),
      undefined,
      undefined,
      1,
      { tree: diagram(root) },
    );
    if (current.key === target) return t.result(depth);
    current = target < current.key ? current.left : current.right;
    depth++;
  }
  return t.result(-1);
}
function heap(raw: string, parameter: string) {
  const a = values(raw, 24),
    amount = integer(parameter, 0, a.length);
  const t = trace("堆键比较", "push 和 pop 各 O(log n)，顶部 O(1)");
  const q = new Heap<number>((left, right) => {
    t.step(
      "比较堆中的必要次序",
      [
        ["候选", left],
        ["参考", right],
      ],
      q.items,
    );
    return left < right;
  });
  for (const value of a) {
    q.push(value);
    t.step("上浮结束", [["插入键", value]], q.items, undefined, undefined, 0);
  }
  const output: number[] = [];
  for (let i = 0; i < amount; i++) {
    output.push(q.take()!);
    t.step(
      "移除最小键并下沉",
      [["已弹出", output.join(",")]],
      q.items,
      undefined,
      undefined,
      0,
    );
  }
  return t.result(output.join(","));
}
function trie(raw: string, prefix: string) {
  const words = raw
    .toLowerCase()
    .trim()
    .split(/[,，\s]+/);
  if (
    !words.length ||
    words.length > 15 ||
    words.some((s) => !/^[a-z]{1,12}$/.test(s)) ||
    !/^[a-z]{1,12}$/.test(prefix)
  )
    throw Error("输入 1–15 个短英文小写词和一个前缀。");
  type Trie = { next: Map<string, Trie>; word?: string };
  const root: Trie = { next: new Map() };
  const t = trace(
    "字符边访问",
    "建树 O(总字符数)，前缀定位 O(m)，枚举再加输出子树",
  );
  for (const word of words) {
    let node = root,
      path = "";
    for (const letter of word) {
      if (!node.next.has(letter)) node.next.set(letter, { next: new Map() });
      node = node.next.get(letter)!;
      path += letter;
      t.step(
        "沿字符边插入",
        [
          ["路径", path],
          ["当前词", word],
        ],
        [...node.next.keys()],
      );
    }
    node.word = word;
  }
  let node = root;
  for (const letter of prefix) {
    t.step("查询前缀边", [["字符", letter]], [...node.next.keys()]);
    const next = node.next.get(letter);
    if (!next) return t.result("");
    node = next;
  }
  const matches: string[] = [];
  function collect(current: Trie) {
    if (current.word) matches.push(current.word);
    for (const [key, next] of current.next) {
      t.step("枚举后继", [["字符", key]], matches);
      collect(next);
    }
  }
  collect(node);
  return t.result(matches.sort().join(","));
}
function union(raw: string, parameter: string) {
  const g = network(raw, false),
    d = new Disjoint(g.nodes),
    [a, b] = parameter.toUpperCase().split(/[,，\s]+/);
  if (!a || !b || !g.nodes.includes(a) || !g.nodes.includes(b))
    throw Error("输入两个已存在顶点。");
  const t = trace("尝试合并数", "按大小合并与路径压缩：摊还 O(α(n))", g);
  for (const { from, to } of g.edges) {
    const joined = d.connect(from, to);
    t.step(
      joined ? "合并不同根" : "已在同一集合",
      [["端点", from + "," + to]],
      g.nodes.map((v) => v + "→" + d.parent.get(v)),
      undefined,
      [from, to],
    );
  }
  return t.result(d.find(a) === d.find(b) ? "相连" : "不相连");
}
function links(raw: string) {
  const input = values(raw, 22);
  type Link = { value: number; next: Link | null };
  let remaining: Link | null = null;
  for (let i = input.length - 1; i >= 0; i--)
    remaining = { value: input[i]!, next: remaining };
  const list = (node: Link | null) => {
    const buffer: number[] = [];
    while (node) {
      buffer.push(node.value);
      node = node.next;
    }
    return buffer;
  };
  const t = trace("next 指针更新", "原地反转 Θ(n) 时间与 Θ(1) 辅助空间");
  let head: Link | null = null;
  while (remaining) {
    const rest: Link | null = remaining.next;
    remaining.next = head;
    head = remaining;
    remaining = rest;
    t.step(
      "先留住后继，再反向连接",
      [
        ["已反转", list(head).join(",")],
        ["仍待处理", list(remaining).join(",")],
      ],
      list(head),
    );
  }
  return t.result(list(head).join(","));
}
export function ranges(raw: string, operations: string, fenwick: boolean) {
  const a = values(raw, 32, 1),
    n = a.length;
  const ops = operations.trim().split(/[,，\s]+/);
  if (ops.length > 12 || !operations.trim())
    throw Error("请输入 1–12 个 q:左:右 或 u:下标:值。");
  const t = trace(
    "区间结构节点访问",
    fenwick
      ? "Fenwick 更新和前缀和 O(log n)，空间 O(n)"
      : "线段树查询和点更新 O(log n)，空间 O(n)",
  );
  const table = new Array<number>(fenwick ? n + 1 : 2 * n).fill(0);
  const show = () => [...table];
  function bitAdd(index: number, delta: number, animate: boolean) {
    for (let i = index + 1; i <= n; i += i & -i) {
      table[i]! += delta;
      if (animate)
        t.step(
          "更新覆盖此处的 Fenwick 区间",
          [
            ["内部下标", i],
            ["lowbit", i & -i],
            ["增量", delta],
          ],
          show(),
          [i],
        );
    }
  }
  function bitSum(k: number) {
    let total = 0;
    for (let i = k; i > 0; i -= i & -i) {
      total += table[i]!;
      t.step(
        "去掉最后一块获取前缀和",
        [
          ["内部下标", i],
          ["前缀累计", total],
        ],
        show(),
        [i],
      );
    }
    return total;
  }
  if (fenwick) a.forEach((value, index) => bitAdd(index, value, false));
  else {
    a.forEach((value, index) => {
      table[n + index] = value;
    });
    for (let i = n - 1; i > 0; i--)
      table[i] = table[2 * i]! + table[2 * i + 1]!;
  }
  t.step("已完成一次构建", [], show(), undefined, undefined, 0);
  let value = 0;
  for (const op of ops) {
    const m = /^([qu]):(\d+):(-?\d+)$/.exec(op);
    if (!m) throw Error("操作格式为 q:左:右 或 u:索引:新值。");
    const lo = integer(m[2]!, 0, m[1] === "u" ? n - 1 : n);
    if (m[1] === "u") {
      const next = integer(m[3]!);
      if (fenwick) bitAdd(lo, next - a[lo]!, true);
      else {
        let i = n + lo;
        table[i] = next;
        t.step(
          "更新叶子",
          [
            ["位置", lo],
            ["值", next],
          ],
          show(),
          [i],
        );
        for (i >>= 1; i > 0; i >>= 1) {
          table[i] = table[2 * i]! + table[2 * i + 1]!;
          t.step("重新合并左右孩子", [["节点", i]], show(), [i]);
        }
      }
      a[lo] = next;
      continue;
    }
    const hi = integer(m[3]!, lo, n);
    if (fenwick) value = bitSum(hi) - bitSum(lo);
    else {
      value = 0;
      for (let l = n + lo, r = n + hi; l < r; l >>= 1, r >>= 1) {
        if (l & 1) {
          value += table[l]!;
          t.step("纳入左侧完整区块", [["累计", value]], show(), [l++]);
        }
        if (r & 1) {
          value += table[--r]!;
          t.step("纳入右侧完整区块", [["累计", value]], show(), [r]);
        }
      }
    }
    t.step(
      "区间查询结果",
      [
        ["左闭", lo],
        ["右开", hi],
        ["和", value],
      ],
      show(),
      undefined,
      undefined,
      0,
    );
  }
  return t.result(value);
}
export function kmp(text: string, pattern: string) {
  const a = [...text],
    p = [...pattern];
  if (a.length > 100 || p.length === 0 || p.length > 30)
    throw Error("文本最多 100 字符，模式为 1–30 字符。");
  const pi = new Array<number>(p.length).fill(0),
    t = trace("字符比较", "构建前缀表和扫描 Θ(n+m)，辅助空间 Θ(m)");
  function advance(s: string, j: number, phase: string, i: number) {
    for (;;) {
      t.step(
        "比较字符",
        [
          ["阶段", phase],
          ["当前位置", i],
          ["当前可复用长度", j],
          ["字符", s],
        ],
        pi,
        [j],
      );
      if (p[j] === s) return j + 1;
      if (j === 0) return 0;
      j = pi[j - 1]!;
    }
  }
  for (let i = 1; i < p.length; i++)
    pi[i] = advance(p[i]!, pi[i - 1]!, "前缀表", i);
  const hits: number[] = [];
  for (let i = 0, j = 0; i < a.length; i++) {
    j = advance(a[i]!, j, "扫描", i);
    if (j === p.length) {
      hits.push(i - p.length + 1);
      j = pi[j - 1]!;
      t.step(
        "记录匹配并保留可重叠部分",
        [["起点", hits.at(-1)!]],
        a,
        [i],
        undefined,
        0,
      );
    }
  }
  return t.result(hits.join(","));
}
export function suffix(text: string) {
  const a = [...text];
  if (!a.length || a.length > 32) throw Error("请输入 1–32 个字符。");
  let ids = a.map((_, i) => i),
    rank = a.map((x) => x.codePointAt(0)!);
  const t = trace(
    "比较两个二元秩",
    "倍增配比较排序 O(n log² n) 时间，O(n) 数组空间",
  );
  for (let size = 1; size < a.length; size *= 2) {
    const pair = (i: number) => [rank[i]!, rank[i + size] ?? -1] as const;
    ids = [...ids].sort((i, j) => {
      const [x, y] = pair(i),
        [p, q] = pair(j);
      t.step("比较前半与后半的秩", [
        ["倍增长度", size],
        ["候选下标", i],
        ["另一候选", j],
      ]);
      return x - p || y - q;
    });
    const next = new Array<number>(a.length);
    next[ids[0]!] = 0;
    for (let j = 1; j < ids.length; j++) {
      const left = ids[j - 1]!,
        right = ids[j]!,
        x = pair(left),
        y = pair(right);
      next[right] = next[left]! + Number(x[0] !== y[0] || x[1] !== y[1]);
    }
    rank = next;
    t.step(
      "重新编号并保存有序后缀",
      [["已覆盖长度", 2 * size]],
      ids.map((i) => i + ":" + a.slice(i).join("")),
      undefined,
      undefined,
      0,
    );
    if (rank[ids.at(-1)!] === a.length - 1) break;
  }
  return t.result(ids.join(","));
}
export const structureModels: Model[] = [
  {
    id: "reverse",
    title: "重连单链表",
    label: "结点值",
    input: "1,4,7,9",
    run: links,
  },
  {
    id: "bst",
    title: "普通 BST 插入与查询",
    label: "插入序列",
    input: "10,4,12,1,6",
    parameterLabel: "查询键",
    parameter: "6",
    run: (a, b) => tree(a, b, false),
  },
  {
    id: "avl",
    title: "AVL 旋转与查询",
    label: "插入序列",
    input: "30,10,20",
    parameterLabel: "查询键",
    parameter: "20",
    run: (a, b) => tree(a, b, true),
  },
  {
    id: "heap",
    title: "二叉最小堆",
    label: "插入序列",
    input: "9,4,7,1,3",
    parameterLabel: "弹出次数",
    parameter: "3",
    run: heap,
  },
  {
    id: "trie",
    title: "Trie 前缀查询",
    label: "英文词，逗号分隔",
    input: "to,tea,ten,inn",
    parameterLabel: "小写前缀",
    parameter: "te",
    run: trie,
  },
  {
    id: "union",
    title: "Union–Find 集合合并",
    label: "合并操作，如 A-B",
    input: "A-B,B-C,D-E,C-E",
    parameterLabel: "查询端点",
    parameter: "A,D",
    run: union,
  },
  {
    id: "segment",
    title: "迭代线段树",
    label: "整数数组",
    input: "2,4,1,5,3",
    parameterLabel: "q:左:右 或 u:下标:值",
    parameter: "q:0:3,u:1:7,q:0:3",
    run: (a, b) => ranges(a, b, false),
  },
  {
    id: "fenwick",
    title: "Fenwick 前缀差",
    label: "整数数组",
    input: "2,4,1,5,3",
    parameterLabel: "q:左:右 或 u:下标:值",
    parameter: "q:0:3,u:1:7,q:0:3",
    run: (a, b) => ranges(a, b, true),
  },
  {
    id: "suffix",
    title: "倍增后缀数组",
    label: "文本",
    input: "banana",
    run: suffix,
  },
  {
    id: "kmp",
    title: "KMP 前缀函数与搜索",
    label: "文本",
    input: "ababa",
    parameterLabel: "模式（允许重叠）",
    parameter: "aba",
    run: kmp,
  },
];
