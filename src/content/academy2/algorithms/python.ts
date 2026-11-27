import { verificationCases } from "../../../grading/academy2/algorithms/programCases";
import type { Question } from "../teaching/schema";

type Case = [args: number[][], result: number];
type Exercise = {
  title: string;
  prompt: string;
  implementation: string;
  library: string;
  example: string;
  cases: Case[];
  hint: string;
};
const exercises: Record<string, Exercise> = {
  invariant: {
    title: "阈值计数",
    prompt: "输入 data 和一元素列表 bound。返回大于等于 bound[0] 的元素个数。",
    implementation:
      "def solve(data, bound):\n    count = 0\n    for x in data:\n        if x >= bound[0]:\n            count += 1\n    return count",
    library:
      "def solve(data, bound):\n    return sum(x >= bound[0] for x in data)",
    example: "[3,1,5,5,2], [3]",
    cases: [
      [[[3, 1, 5, 5, 2], [3]], 3],
      [[[], [0]], 0],
      [[[-2, -2, 0], [-2]], 3],
      [[[1], [2]], 0],
    ],
    hint: "每处理一个元素就维护已扫描前缀的计数，边界使用 ≥。",
  },
  linear: {
    title: "从左向右找首个匹配",
    prompt:
      "输入 data 和一元素列表 target。返回首个匹配位置的零基下标，未找到返回 −1。",
    implementation:
      "def solve(data, target):\n    for i, x in enumerate(data):\n        if x == target[0]:\n            return i\n    return -1",
    library:
      "def solve(data, target):\n    try:\n        return data.index(target[0])\n    except ValueError:\n        return -1",
    example: "[9,2,6,4], [6]",
    cases: [
      [[[9, 2, 6, 4], [6]], 2],
      [[[8, 2, 2], [2]], 1],
      [[[], [7]], -1],
      [[[3], [4]], -1],
    ],
    hint: "只在完整扫描仍无匹配后返回 −1。",
  },
  binary: {
    title: "第一个不小于目标的位置",
    prompt:
      "输入有序 data 和一元素列表 target。返回首个 ≥ target[0] 的位置。若不存在，返回 len(data)。",
    implementation:
      "def solve(data, target):\n    left, right = 0, len(data)\n    while left < right:\n        mid = (left + right)//2\n        if data[mid] < target[0]:\n            left = mid + 1\n        else:\n            right = mid\n    return left",
    library:
      "from bisect import bisect_left\n\ndef solve(data, target):\n    return bisect_left(data, target[0])",
    example: "[1,3,3,7], [3]",
    cases: [
      [[[1, 3, 3, 7], [3]], 1],
      [[[], [7]], 0],
      [[[2, 4], [8]], 2],
      [[[-5, -1, 0], [-4]], 1],
    ],
    hint: "维护半开区间。相等时保留左侧候选。",
  },
  sort: {
    title: "排序与秩",
    prompt:
      "返回 data 排序后第 rank[0] 个元素，秩从零开始。测试会使用不同的秩和重复值。请勿修改传进的列表。",
    implementation:
      "def solve(data, rank):\n    a = data[:]\n    for i in range(1, len(a)):\n        key, j = a[i], i - 1\n        while j >= 0 and a[j] > key:\n            a[j+1] = a[j]\n            j -= 1\n        a[j+1] = key\n    return a[rank[0]]",
    library: "def solve(data, rank):\n    return sorted(data)[rank[0]]",
    example: "[6,3,5,3,1], [2]",
    cases: [
      [[[6, 3, 5, 3, 1], [2]], 3],
      [[[-10], [0]], -10],
      [[[3, 2, 1, 0, -2], [4]], 3],
      [[[7, -3, 2, 8], [1]], 2],
    ],
    hint: "插入时先保存待插值，再将严格大于它的值右移。",
  },
  hash: {
    title: "计算不重复键数",
    prompt: "返回 data 中不同整数的数量。手写方案用多个桶，桶内判等。",
    implementation:
      "def solve(data):\n    buckets = [[] for _ in range(5)]\n    for value in data:\n        bucket = buckets[value % len(buckets)]\n        if value not in bucket:\n            bucket.append(value)\n    return sum(map(len, buckets))",
    library: "def solve(data):\n    return len(set(data))",
    example: "[1,6,11,4,6]",
    cases: [
      [[[1, 6, 11, 4, 6]], 4],
      [[[]], 0],
      [[[0, 5, -5, 0]], 3],
      [[[3, 3, 3]], 1],
    ],
    hint: "散列冲突不会使两个不相等的键变成一个。仍需比较键。",
  },
  recursive: {
    title: "递归阶乘",
    prompt: "输入一元素列表 data，计算 data[0]!。0! 定义为 1。",
    implementation:
      "def solve(data):\n    def factorial(n):\n        if n == 0:\n            return 1\n        return n*factorial(n-1)\n    return factorial(data[0])",
    library:
      "from math import factorial\n\ndef solve(data):\n    return factorial(data[0])",
    example: "[5]",
    cases: [
      [[[5]], 120],
      [[[0]], 1],
      [[[1]], 1],
      [[[7]], 5040],
    ],
    hint: "检查 n=0 和递归参数是否确实减小。",
  },
  heap: {
    title: "堆中的第 k 小元素",
    prompt: "返回列表的第 rank[0] 小值，rank[0] 从 1 开始，包含重复值。",
    implementation:
      "def solve(data, rank):\n    heap = []\n    for value in data:\n        heap.append(value)\n        i = len(heap)-1\n        while i and heap[(i-1)//2] > heap[i]:\n            p = (i-1)//2\n            heap[p], heap[i] = heap[i], heap[p]\n            i = p\n    for _ in range(rank[0]-1):\n        tail = heap.pop()\n        heap[0] = tail\n        i = 0\n        while 2*i+1 < len(heap):\n            c = 2*i+1\n            if c+1 < len(heap) and heap[c+1] < heap[c]:\n                c += 1\n            if heap[i] <= heap[c]:\n                break\n            heap[i], heap[c] = heap[c], heap[i]\n            i = c\n    return heap[0]",
    library:
      "from heapq import nsmallest\n\ndef solve(data, rank):\n    return nsmallest(rank[0], data)[-1]",
    example: "[9,4,7,1,3], [3]",
    cases: [
      [[[9, 4, 7, 1, 3], [3]], 4],
      [[[7], [1]], 7],
      [[[-1, -5, -1, 2], [3]], -1],
      [[[5, 3, 4], [3]], 5],
    ],
    hint: "弹出根后把原尾元素放到根，与两个孩子中较小者比较。",
  },
  bfs: {
    title: "最少边数",
    prompt:
      "输入交错存储的有向边 edges，如 [0,1,1,4]；query 为 [起点,终点]。返回最少边数，不可达返回 −1。",
    implementation:
      "def solve(edges, query):\n    adj = {}\n    for i in range(0, len(edges), 2):\n        adj.setdefault(edges[i], []).append(edges[i+1])\n    start, goal = query\n    queue, pos, seen = [(start,0)], 0, {start}\n    while pos < len(queue):\n        u,d = queue[pos]\n        pos += 1\n        if u == goal:\n            return d\n        for v in adj.get(u, []):\n            if v not in seen:\n                seen.add(v)\n                queue.append((v, d+1))\n    return -1",
    library:
      "from collections import defaultdict, deque\n\ndef solve(edges, query):\n    adj = defaultdict(list)\n    for a,b in zip(edges[::2],edges[1::2]):\n        adj[a].append(b)\n    start, goal = query\n    q, seen = deque([(start,0)]), {start}\n    while q:\n        u,d = q.popleft()\n        if u == goal:\n            return d\n        for v in adj[u]:\n            if v not in seen:\n                seen.add(v)\n                q.append((v,d+1))\n    return -1",
    example: "[0,1,1,4,0,2,2,3,3,4], [0,4]",
    cases: [
      [
        [
          [0, 1, 1, 4, 0, 2, 2, 3, 3, 4],
          [0, 4],
        ],
        2,
      ],
      [[[], [0, 0]], 0],
      [
        [
          [0, 1, 1, 0],
          [0, 2],
        ],
        -1,
      ],
      [
        [
          [0, 1, 0, 3, 1, 3],
          [0, 3],
        ],
        1,
      ],
    ],
    hint: "用队列按距离递增处理。在加入队列时登记已发现。",
  },
  dijkstra: {
    title: "非负加权最短路",
    prompt:
      "data 每三个数依次为有向边的起点、终点、非负权。query 含起点、终点。返回距离，不可达返回 −1。",
    implementation:
      "def solve(data, query):\n    s,t = query\n    nodes = set(data[::3]+data[1::3]+query)\n    dist = {s:0}\n    while nodes:\n        u = min(nodes, key=lambda v: dist.get(v,float('inf')))\n        if u not in dist:\n            return -1\n        if u == t:\n            return dist[u]\n        nodes.remove(u)\n        for i in range(0,len(data),3):\n            a,b,w = data[i:i+3]\n            if a == u and dist[u]+w < dist.get(b,float('inf')):\n                dist[b] = dist[u]+w\n    return -1",
    library:
      "from heapq import heappop, heappush\n\ndef solve(data, query):\n    adj, dist = {}, {query[0]:0}\n    for a,b,w in zip(data[::3],data[1::3],data[2::3]):\n        adj.setdefault(a, []).append((b,w))\n    q = [(0,query[0])]\n    while q:\n        d,u = heappop(q)\n        if d != dist[u]:\n            continue\n        if u == query[1]:\n            return d\n        for v,w in adj.get(u, []):\n            if d+w < dist.get(v,float('inf')):\n                dist[v]=d+w\n                heappush(q,(d+w,v))\n    return -1",
    example: "[0,1,9,0,2,2,2,1,3], [0,1]",
    cases: [
      [
        [
          [0, 1, 9, 0, 2, 2, 2, 1, 3],
          [0, 1],
        ],
        5,
      ],
      [[[], [0, 0]], 0],
      [[[], [0, 1]], -1],
      [
        [
          [0, 1, 0, 1, 2, 2, 0, 2, 7],
          [0, 2],
        ],
        2,
      ],
    ],
    hint: "从候选中取暂定距离最小者。允许堆存在过期条目，取出时跳过。",
  },
  prefix: {
    title: "左闭右开区间和",
    prompt:
      "返回 data 从 bounds[0]（含）到 bounds[1]（不含）的和。两个下标可以相同。",
    implementation:
      "def solve(data, bounds):\n    prefix = [0]\n    for x in data:\n        prefix.append(prefix[-1]+x)\n    l,r = bounds\n    return prefix[r]-prefix[l]",
    library:
      "from itertools import accumulate\n\ndef solve(data, bounds):\n    p = list(accumulate(data,initial=0))\n    return p[bounds[1]]-p[bounds[0]]",
    example: "[2,1,5,-2,4], [1,4]",
    cases: [
      [
        [
          [2, 1, 5, -2, 4],
          [1, 4],
        ],
        4,
      ],
      [[[], [0, 0]], 0],
      [
        [
          [100, -5, 3],
          [1, 2],
        ],
        -5,
      ],
      [
        [
          [3, 8, 0],
          [0, 3],
        ],
        11,
      ],
    ],
    hint: "把 prefix[0] 设为 0，可以自然处理左端为零和空区间。",
  },
  kmp: {
    title: "含重叠的模式匹配",
    prompt:
      "data 和 pattern 为整数编码的文本与非空模式。返回出现次数，允许重叠。",
    implementation:
      "def solve(data, pattern):\n    pi = [0]*len(pattern)\n    for i in range(1,len(pattern)):\n        j = pi[i-1]\n        while j and pattern[i] != pattern[j]:\n            j = pi[j-1]\n        pi[i] = j + (pattern[i] == pattern[j])\n    j = total = 0\n    for x in data:\n        while j and x != pattern[j]:\n            j = pi[j-1]\n        if x == pattern[j]:\n            j += 1\n        if j == len(pattern):\n            total += 1\n            j = pi[j-1]\n    return total",
    library:
      "def solve(data, pattern):\n    # list slicing is a baseline with a different cost.\n    m = len(pattern)\n    return sum(data[i:i+m] == pattern for i in range(len(data)-m+1))",
    example: "[1,2,1,2,1], [1,2,1]",
    cases: [
      [
        [
          [1, 2, 1, 2, 1],
          [1, 2, 1],
        ],
        2,
      ],
      [[[], [1]], 0],
      [
        [
          [2, 2, 2, 2],
          [2, 2],
        ],
        3,
      ],
      [
        [
          [9, 8],
          [8, 9, 8],
        ],
        0,
      ],
    ],
    hint: "一次完整匹配后跳到最长真边界。清零会漏掉重叠。",
  },
  certificate: {
    title: "子集和证书核验",
    prompt:
      "data 为整数，positions 为选择的零基下标，target 含一个数。下标互异且合法、所选项和等于目标时返回 1，否则返回 0。",
    implementation:
      "def solve(data, positions, target):\n    seen = set()\n    total = 0\n    for j in positions:\n        if j in seen or not 0 <= j < len(data):\n            return 0\n        seen.add(j)\n        total += data[j]\n    return int(total == target[0])",
    library:
      "from operator import getitem\nfrom itertools import repeat\n\ndef solve(data, positions, target):\n    ok = len(set(positions)) == len(positions) and all(0 <= i < len(data) for i in positions)\n    return int(ok and sum(map(getitem, repeat(data), positions)) == target[0])",
    example: "[3,7,4,9], [0,1], [10]",
    cases: [
      [[[3, 7, 4, 9], [0, 1], [10]], 1],
      [[[3, 7], [0, 0], [6]], 0],
      [[[5], [-1], [5]], 0],
      [[[], [], [0]], 1],
      [[[7], [0], [4]], 0],
    ],
    hint: "先验证互异性及范围。Python 允许负下标，但题目的证书格式拒绝它。",
  },
  dp: {
    title: "0/1 背包",
    prompt:
      "data 由交错的正整重量、非负价值组成。capacity 是单元素列表。每件最多选择一次，返回最优总价值。",
    implementation:
      "def solve(data, capacity):\n    w = capacity[0]\n    dp = [0]*(w+1)\n    for i in range(0,len(data),2):\n        weight,value = data[i:i+2]\n        for c in range(w,weight-1,-1):\n            dp[c] = max(dp[c],dp[c-weight]+value)\n    return dp[w]",
    library:
      "from functools import lru_cache\n\ndef solve(data, capacity):\n    items = list(zip(data[::2],data[1::2]))\n    @lru_cache(None)\n    def best(i,c):\n        if i == len(items):\n            return 0\n        weight,value = items[i]\n        skip = best(i+1,c)\n        return max(skip,best(i+1,c-weight)+value) if c >= weight else skip\n    return best(0,capacity[0])",
    example: "[2,4,3,5,4,6], [5]",
    cases: [
      [[[2, 4, 3, 5, 4, 6], [5]], 9],
      [[[2, 4], [4]], 4],
      [[[], [5]], 0],
      [[[1, 2], [0]], 0],
      [[[2, 3, 3, 4, 4, 8], [5]], 8],
    ],
    hint: "使用一维数组时从大容量往小容量走。单件物品的用例能检测多次使用。",
  },
  window: {
    title: "固定宽度最大窗口和",
    prompt:
      "返回 data 所有长度 width[0] 的连续窗口中最大的和。窗口宽度有效，数据可全为负数。",
    implementation:
      "def solve(data, width):\n    k = width[0]\n    running = best = sum(data[:k])\n    for i in range(k,len(data)):\n        running += data[i]-data[i-k]\n        best = max(best,running)\n    return best",
    library:
      "from itertools import accumulate\n\ndef solve(data, width):\n    k = width[0]\n    p = list(accumulate(data,initial=0))\n    return max(b-a for a,b in zip(p,p[k:]))",
    example: "[-2,3,6,-4,2], [3]",
    cases: [
      [[[-2, 3, 6, -4, 2], [3]], 7],
      [[[-4, -2, -3], [2]], -5],
      [[[2, -7, 9], [1]], 9],
      [[[2, -7, 9], [3]], 4],
    ],
    hint: "最优初值应来自第一个合法窗口。比较窗口时只用完整的 k 项。",
  },
  fenwick: {
    title: "用 Fenwick 混合赋值与求和",
    prompt:
      "data 为整数，ops 中的三元组 [0,l,r] 查询半开区间，[1,i,x] 把索引 i 替换成 x。返回历次查询结果之和。",
    implementation:
      "def solve(data, ops):\n    a = data[:]\n    n = len(a)\n    t = [0]*(n+1)\n    def add(i, delta):\n        i += 1\n        while i <= n:\n            t[i] += delta\n            i += i & -i\n    def prefix(i):\n        answer = 0\n        while i:\n            answer += t[i]\n            i -= i & -i\n        return answer\n    for i,x in enumerate(a):\n        add(i,x)\n    total = 0\n    for p in range(0,len(ops),3):\n        k,l,r = ops[p:p+3]\n        if k == 1:\n            add(l,r-a[l])\n            a[l] = r\n        else:\n            total += prefix(r)-prefix(l)\n    return total",
    library:
      "def solve(data, ops):\n    a = data[:]\n    total = 0\n    for kind,l,r in zip(ops[::3],ops[1::3],ops[2::3]):\n        if kind == 1:\n            a[l] = r\n        else:\n            total += sum(a[l:r])\n    return total",
    example: "[2,4,1,5,3], [0,0,3,1,1,7,0,0,3]",
    cases: [
      [
        [
          [2, 4, 1, 5, 3],
          [0, 0, 3, 1, 1, 7, 0, 0, 3],
        ],
        17,
      ],
      [[[1], [0, 0, 1, 1, 0, -4, 0, 0, 1]], -3],
      [[[], [0, 0, 0]], 0],
      [
        [
          [1, 2, 3],
          [1, 2, 4, 1, 2, 4, 0, 1, 3],
        ],
        6,
      ],
    ],
    hint: "先记旧值，再传播差量。输入查询边界已是前缀计数，无需对右端额外加一。",
  },
  suffix: {
    title: "给后缀排名",
    prompt:
      "data 为字符整数编码。返回按字典序排序后，秩为 rank[0]（从零计）的后缀起点。",
    implementation:
      "def solve(data, rank):\n    n = len(data)\n    index = sorted(range(n), key=lambda i:data[i])\n    enc = {x:i for i,x in enumerate(sorted(set(data)))}\n    group = [enc[x] for x in data]\n    k = 1\n    while k < n:\n        def key(i):\n            return group[i], group[i+k] if i+k < n else -1\n        index.sort(key=key)\n        new_group = [0]*n\n        for a,b in zip(index,index[1:]):\n            new_group[b] = new_group[a]+(key(a)!=key(b))\n        group = new_group\n        k *= 2\n    return index[rank[0]]",
    library:
      "def solve(data, rank):\n    # Literal suffix slices are a quadratic-space oracle for small examples.\n    return sorted(range(len(data)),key=lambda i:data[i:])[rank[0]]",
    example: "[2,1,3,1,3,1], [0]",
    cases: [
      [[[2, 1, 3, 1, 3, 1], [0]], 5],
      [[[2, 1, 3, 1, 3, 1], [3]], 0],
      [[[4, 4, 4], [1]], 1],
      [[[7], [0]], 0],
    ],
    hint: "秩必须保序压缩。越界的第二秩要比任何有效秩小。",
  },
  dfa: {
    title: "用确定有限自动机识别 101 后缀",
    prompt: "data 为零或一组成的列表，恰以 101 结束时返回 1，否则返回 0。",
    implementation:
      "def solve(data):\n    table = ((0,1),(2,1),(0,3),(2,1))\n    state = 0\n    for bit in data:\n        state = table[state][bit]\n    return int(state == 3)",
    library: "def solve(data):\n    return int(data[-3:] == [1,0,1])",
    example: "[0,1,1,0,1]",
    cases: [
      [[[0, 1, 1, 0, 1]], 1],
      [[[1, 0, 1, 0]], 0],
      [[[]], 0],
      [[[1]], 0],
      [[[1, 0, 1, 0, 1]], 1],
    ],
    hint: "必须读到输入结尾才判断。接受态之后还有定义好的转移。",
  },
};
const parameters = (entry: Exercise) => entry.implementation.split("\n", 1)[0]!;
export function algorithmCode(model: string, seed?: number) {
  const entry = exercises[model];
  if (!entry) return undefined;
  const call = "\n\nprint(solve(" + entry.example + "))";
  const question: Question = {
    id:
      (seed === undefined ? "program-" : "program-verify-") +
      model +
      (seed === undefined ? "" : "-" + seed),
    type: "program",
    level: "transfer",
    prompt: entry.prompt,
    explanation: "你的实现通过了示例和边界用例。",
    hint: entry.hint,
    functionName: "solve",
    starter:
      parameters(entry) +
      "\n    # Write your implementation here.\n    return None",
    cases: [
      ...entry.cases.map(([args, expected]) => ({ args, expected })),
      ...(seed === undefined
        ? []
        : [
            ...verificationCases(model, seed),
            ...verificationCases(model, seed + 9749),
          ]),
    ],
    tolerance: 0,
  };
  return {
    title: entry.title,
    scratch: entry.implementation + call,
    library: entry.library + call,
    question,
  };
}
export const algorithmProgramModels = Object.keys(exercises);
