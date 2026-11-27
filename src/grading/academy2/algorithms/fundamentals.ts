import { integer, trace, values, type Model } from "./trace";

export function searching(input: string, parameter: string, binary: boolean) {
  const a = values(input),
    key = integer(parameter);
  if (binary && a.some((v, i) => i > 0 && v < a[i - 1]!))
    throw Error("二分要求输入非递减。");
  const t = trace(
    "元素比较",
    binary
      ? "Θ(log n) 最坏时间，Θ(1) 辅助空间（已排序）"
      : "Θ(n) 最坏时间，Θ(1) 辅助空间",
  );
  let i = 0,
    j = a.length;
  while (i < j) {
    const mid = binary ? Math.floor(i + (j - i) / 2) : i;
    t.step(
      "比较当前元素",
      [
        ["左边界", i],
        ["右开边界", j],
        ["下标", mid],
        ["比较值", a[mid]!],
      ],
      a,
      [mid],
    );
    if (a[mid] === key) return t.result(mid);
    if (!binary || a[mid]! < key) i = mid + 1;
    else j = mid;
  }
  return t.result(-1);
}
export function sorting(input: string, kind: string) {
  const a = values(input);
  const t = trace(
    "键比较",
    kind === "归并"
      ? "Θ(n log n) 时间，Θ(n) 辅助空间"
      : kind === "插入"
        ? "最坏 Θ(n²)，近乎有序可接近 Θ(n)；Θ(1) 辅助空间"
        : "Θ(n²) 全部输入；Θ(1) 辅助空间",
  );
  if (!["插入", "选择", "归并"].includes(kind))
    throw Error("选择插入、选择或归并。");
  if (kind === "插入") {
    for (let i = 1; i < a.length; i++) {
      const value = a[i]!;
      let j = i;
      while (j > 0) {
        t.step(
          "将待插入键与左边键比较",
          [
            ["键", value],
            ["位置", j],
          ],
          a,
          [j - 1, j],
        );
        if (a[j - 1]! <= value) break;
        a[j] = a[j - 1]!;
        j--;
        t.step("右移较大元素", [["空位", j]], a, [j], undefined, 0);
      }
      a[j] = value;
      t.step("填入空位", [["插入位置", j]], a, [j], undefined, 0);
    }
  } else if (kind === "选择") {
    for (let i = 0; i < a.length - 1; i++) {
      let min = i;
      for (let j = i + 1; j < a.length; j++) {
        t.step(
          "搜索未排序部分的最小键",
          [
            ["当前最小下标", min],
            ["候选下标", j],
          ],
          a,
          [min, j],
        );
        if (a[j]! < a[min]!) min = j;
      }
      [a[min], a[i]] = [a[i]!, a[min]!];
      t.step("最小元素归位", [["位置", i]], a, [i, min], undefined, 0);
    }
  } else {
    function sort(lo: number, hi: number) {
      if (hi - lo < 2) return;
      const mid = (lo + hi) >> 1;
      sort(lo, mid);
      sort(mid, hi);
      const left = a.slice(lo, mid),
        right = a.slice(mid, hi),
        merged: number[] = [];
      let i = 0,
        j = 0;
      while (i < left.length && j < right.length) {
        t.step(
          "比较两个有序段的队首",
          [
            ["左键", left[i]!],
            ["右键", right[j]!],
          ],
          a,
          [lo + i, mid + j],
        );
        merged.push(left[i]! <= right[j]! ? left[i++]! : right[j++]!);
      }
      a.splice(lo, hi - lo, ...merged, ...left.slice(i), ...right.slice(j));
      t.step(
        "写回合并区间",
        [
          ["左端", lo],
          ["右开端", hi],
        ],
        a,
        undefined,
        undefined,
        0,
      );
    }
    sort(0, a.length);
  }
  return t.result(a.join(","));
}
type Cell = { value: number; next: Cell | null };
function simulation(input: string, kind: string) {
  const operations = input
    .trim()
    .split(/[,，\s]+/)
    .filter(Boolean);
  if (operations.length > 24) throw Error("最多 24 次操作。");
  const linear = kind === "链表",
    queue = kind === "队列",
    stack = kind === "栈";
  const t = trace(
    linear
      ? "指针移动及结点操作"
      : queue || stack
        ? "容器操作次数"
        : "元素访问及写入次数",
    linear
      ? "按下标定位 Θ(n)，已知前驱后重连 Θ(1)"
      : queue
        ? "固定容量环形队列在两端操作 Θ(1)"
        : stack
          ? "栈末端操作摊还 Θ(1)"
          : "随机下标 Θ(1)；中间插入或移除 Θ(n)",
  );
  const buffer = new Array<number>(24),
    data: number[] = [],
    sentinel: Cell = { value: 0, next: null };
  let last: number | string = "空",
    head = 0,
    size = 0;
  const snapshot = () => {
    if (queue)
      return Array.from(
        { length: size },
        (_, i) => buffer[(head + i) % buffer.length]!,
      );
    if (!linear) return data;
    const current: number[] = [];
    for (let cell = sentinel.next; cell; cell = cell.next)
      current.push(cell.value);
    return current;
  };
  for (const op of operations) {
    const m =
      /^(push|insert|at|pop|front|remove)(?::(-?\d+))?(?::(-?\d+))?$/.exec(op);
    if (!m)
      throw Error(
        "使用 push:值、insert:下标:值、at:下标、remove:下标、pop、front。",
      );
    const action = m[1]!,
      arg = m[2],
      extra = m[3];
    if (
      (action === "insert" && extra === undefined) ||
      (action !== "insert" && extra !== undefined) ||
      (["pop", "front"].includes(action) && arg !== undefined)
    )
      throw Error("操作参数格式不正确。");
    if (queue || stack) {
      if (!["push", "pop", "front"].includes(action))
        throw Error("栈和队列只开放端点操作。");
      if (action === "push") {
        last = integer(arg ?? "");
        if (queue) {
          buffer[(head + size) % buffer.length] = last;
          size++;
        } else data.push(last);
        t.step(
          "加入元素",
          [
            ["大小", queue ? size : data.length],
            ...(queue ? [["首槽", head] as [string, number]] : []),
          ],
          snapshot(),
        );
      } else {
        if (queue) {
          last = size ? buffer[head]! : "空";
          if (size && action === "pop") {
            head = (head + 1) % buffer.length;
            size--;
          }
        } else last = (action === "pop" ? data.pop() : data.at(-1)) ?? "空";
        t.step(
          action === "pop" ? "移除约定端的元素" : "查看约定端",
          [
            ["返回值", last],
            ...(queue ? [["首槽", head] as [string, number]] : []),
          ],
          snapshot(),
        );
      }
      continue;
    }
    if (action === "pop" || action === "front") {
      if (!size) {
        last = "空";
        t.step("容器为空");
        continue;
      }
    }
    const adding = action === "push" || action === "insert",
      removing = action === "pop" || action === "remove";
    const index =
      action === "push"
        ? size
        : action === "pop" || action === "front"
          ? 0
          : integer(arg ?? "", 0, size);
    if (index >= size && !adding) throw Error("索引超出容器范围。");
    if (linear) {
      let previous = sentinel;
      for (let i = 0; i < index; i++) {
        previous = previous.next!;
        t.step("沿 next 指针前进", [["已走步数", i + 1]], snapshot(), [i]);
      }
      if (adding) {
        last = integer((action === "push" ? arg : extra) ?? "");
        previous.next = { value: last, next: previous.next };
        size++;
      } else {
        last = previous.next!.value;
        if (removing) {
          previous.next = previous.next!.next;
          size--;
        }
      }
      t.step(
        "检查或重连当前结点",
        [
          ["位置", index],
          ["返回值", last],
        ],
        snapshot(),
        [index],
      );
    } else {
      const cost = adding || removing ? size - index + 1 : 1;
      if (adding) {
        last = integer((action === "push" ? arg : extra) ?? "");
        data.splice(index, 0, last);
        size++;
      } else {
        last = data[index]!;
        if (removing) {
          data.splice(index, 1);
          size--;
        }
      }
      t.step(
        "执行下标操作",
        [
          ["位置", index],
          ["返回值", last],
        ],
        snapshot(),
        [index],
        undefined,
        cost,
      );
    }
  }
  return t.result(last);
}
function hashing(raw: string, parameter: string) {
  const a = values(raw, 20);
  const m = integer(parameter, 2, 16);
  const buckets = Array.from({ length: m }, () => [] as number[]);
  const t = trace(
    "哈希及相等比较",
    "均匀散列下搜索期望 Θ(1+α)，最坏 Θ(n)；空间 Θ(n+m)",
  );
  let collisions = 0;
  for (const value of a) {
    const j = ((value % m) + m) % m,
      bucket = buckets[j]!;
    const exists = bucket.includes(value);
    if (!exists) {
      if (bucket.length) collisions++;
      bucket.push(value);
    }
    t.step(
      exists ? "重复键保持原位置" : "定位桶并处理冲突",
      [
        ["键", value],
        ["桶", j],
        ["冲突插入", collisions],
      ],
      buckets.map((b) => b.join("|") || "空"),
      [j],
      undefined,
      1 + (exists ? bucket.indexOf(value) + 1 : bucket.length - 1),
    );
  }
  return t.result(collisions);
}
function recursion(input: string, kind: string) {
  const n = integer(input, 0, kind === "斐波那契" ? 10 : 12);
  const t = trace(
    "函数调用",
    "阶乘 Θ(n) 时间和调用栈；朴素 Fibonacci 指数级调用，记忆化 Θ(n)",
  );
  const stack: number[] = [];
  const saved = new Map<number, number>();
  function call(x: number): number {
    stack.push(x);
    t.step(
      "调用",
      [
        ["参数", x],
        ["栈深", stack.length],
      ],
      stack,
    );
    let answer: number;
    if (kind === "阶乘") answer = x === 0 ? 1 : x * call(x - 1);
    else if (kind === "记忆化" && saved.has(x)) answer = saved.get(x)!;
    else answer = x <= 1 ? x : call(x - 1) + call(x - 2);
    saved.set(x, answer);
    t.step(
      "返回",
      [
        ["参数", x],
        ["返回值", answer],
      ],
      stack,
      undefined,
      undefined,
      0,
    );
    stack.pop();
    return answer;
  }
  if (!["阶乘", "斐波那契", "记忆化"].includes(kind))
    throw Error("请输入阶乘、斐波那契或记忆化。");
  return t.result(call(n));
}
function costs(input: string, kind: string) {
  const n = integer(input, 1, 18),
    t = trace("循环体执行次数", "线性 Θ(n)，三角循环 Θ(n²)，折半 Θ(log n)");
  if (kind === "线性")
    for (let i = 0; i < n; i++) t.step("执行线性循环体", [["i", i]]);
  else if (kind === "三角")
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++)
        t.step("执行嵌套循环体", [
          ["i", i],
          ["j", j],
        ]);
  else if (kind === "折半")
    for (let i = n; i > 0; i = Math.floor(i / 2))
      t.step("对规模折半", [["当前规模", i]]);
  else throw Error("请输入线性、三角或折半。");
  return t.result(t.count());
}
function invariant(input: string, parameter: string) {
  const a = values(input, 32),
    k = integer(parameter),
    t = trace("谓词求值", "Θ(n) 时间，Θ(1) 辅助空间");
  let total = 0;
  a.forEach((value, i) => {
    if (value >= k) total++;
    t.step(
      "处理一个元素后更新前缀计数",
      [
        ["阈值", k],
        ["已处理长度", i + 1],
        ["满足数量", total],
      ],
      a,
      [i],
    );
  });
  return t.result(total);
}
export const fundamentals: Model[] = [
  {
    id: "invariant",
    title: "循环不变量与计数",
    label: "数列",
    input: "3,1,5,5,2",
    parameterLabel: "阈值（含）",
    parameter: "3",
    run: invariant,
  },
  {
    id: "cost",
    title: "循环操作计数",
    label: "输入大小 n",
    input: "8",
    parameterLabel: "循环类型：线性 / 三角 / 折半",
    parameter: "三角",
    run: costs,
  },
  {
    id: "linear",
    title: "线性搜索",
    label: "输入列表",
    input: "9,2,6,4",
    parameterLabel: "目标值",
    parameter: "6",
    run: (a, b) => searching(a, b, false),
  },
  {
    id: "binary",
    title: "二分搜索",
    label: "已排序列表",
    input: "1,3,5,7,9,11",
    parameterLabel: "目标值",
    parameter: "7",
    run: (a, b) => searching(a, b, true),
  },
  {
    id: "sort",
    title: "比较三种排序",
    label: "待排序列表",
    input: "6,3,5,3,1",
    parameterLabel: "插入 / 选择 / 归并",
    parameter: "插入",
    run: sorting,
  },
  ...(["数组", "链表", "栈", "队列"] as const).map((kind, i) => ({
    id: ["array", "list", "stack", "queue"][i]!,
    title: kind + "操作",
    label: "操作序列，逗号分隔",
    input: i < 2 ? "push:4,push:7,insert:1:5,at:2" : "push:4,push:7,pop,front",
    run: (raw: string) => simulation(raw, kind),
  })),
  {
    id: "hash",
    title: "分离链式哈希",
    label: "整数键列表",
    input: "1,6,11,4,6",
    parameterLabel: "桶数",
    parameter: "5",
    run: hashing,
  },
  {
    id: "recursive",
    title: "观察递归栈",
    label: "非负整数 n",
    input: "5",
    parameterLabel: "阶乘 / 斐波那契 / 记忆化",
    parameter: "阶乘",
    run: recursion,
  },
];
