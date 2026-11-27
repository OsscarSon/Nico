import type { AlgorithmProgramming } from "./python";

const make = (
  title: string,
  prompt: string,
  signature: string,
  scratch: string,
  library: string,
  example: string,
  cases: AlgorithmProgramming["cases"],
  hint: string,
): AlgorithmProgramming => ({
  title,
  prompt,
  implementation: "def solve(" + signature + "):\n" + scratch,
  library,
  example,
  cases,
  hint,
});
export const additionalPrograms: Record<string, AlgorithmProgramming> = {
  avl: make(
    "AVL 插入的根键",
    "插入互异键并做 AVL 再平衡，返回根键；空表返回 0。使用左右子树高度决定旋转。",
    "keys",
    `    def h(t): return t[3] if t else 0
    def node(k,l,r): return [k,l,r,1+max(h(l),h(r))]
    def left(t):
        k,l,r,_=t
        a,b,c,_=r
        return node(a,node(k,l,b),c)
    def right(t):
        k,l,r,_=t
        a,b,c,_=l
        return node(a,b,node(k,c,r))
    def put(t,v):
        if not t: return node(v,None,None)
        k,l,r,_=t
        if v<k: l=put(l,v)
        else: r=put(r,v)
        if h(l)-h(r)>1:
            if h(l[2])>h(l[1]): l=left(l)
            return right(node(k,l,r))
        if h(r)-h(l)>1:
            if h(r[1])>h(r[2]): r=right(r)
            return left(node(k,l,r))
        return node(k,l,r)
    root=None
    for x in keys: root=put(root,x)
    return root[0] if root else 0`,
    `from typing import NamedTuple
class Node(NamedTuple):
    k:int
    a:object=None
    b:object=None
def solve(keys):
    def height(t):
        return 0 if t is None else 1+max(height(t.a),height(t.b))
    def spin(t,d):
        if d==1:
            s=t.b
            return Node(s.k,Node(t.k,t.a,s.a),s.b)
        s=t.a
        return Node(s.k,s.a,Node(t.k,s.b,t.b))
    def append(t,k):
        if t is None: return Node(k)
        if k<t.k: t=t._replace(a=append(t.a,k))
        else: t=t._replace(b=append(t.b,k))
        if height(t.a)-height(t.b)>1:
            s=t.a
            if height(s.b)>height(s.a): t=t._replace(a=spin(s,1))
            return spin(t,-1)
        if height(t.b)-height(t.a)>1:
            s=t.b
            if height(s.a)>height(s.b): t=t._replace(b=spin(s,-1))
            return spin(t,1)
        return t
    root=None
    for key in keys: root=append(root,key)
    return root.k if root else 0`,
    "[30,10,20]",
    [
      [[[30, 10, 20]], 20],
      [[[10, 30, 20]], 20],
      [[[8, 9, 10, 11, 12]], 9],
      [[[]], 0],
    ],
    "两次旋转的折线形情形先处理孩子，再处理失衡结点。",
  ),
  trie: make(
    "Trie 数字串前缀",
    "word_ids 为正整数，其十进制文本是词。返回以 decimal(prefix[0]) 起始的不重复词数量。",
    "word_ids, prefix",
    `    root={}
    for x in word_ids:
        node=root
        for ch in str(x): node=node.setdefault(ch,{})
        node['end']=True
    node=root
    for ch in str(prefix[0]):
        if ch not in node: return 0
        node=node[ch]
    def count(n):
        return int('end' in n)+sum(count(v) for k,v in n.items() if k!='end')
    return count(node)`,
    `def solve(word_ids,prefix):
    p=str(prefix[0])
    return sum(str(x).startswith(p) for x in set(word_ids))`,
    "[12,121,17,121,20], [12]",
    [
      [[[12, 121, 17, 121, 20], [12]], 2],
      [[[11, 123], [1]], 2],
      [[[20, 23], [1]], 0],
      [[[], [9]], 0],
    ],
    "用结束标记区分包含前缀的路径与实际词。重复词只标一次。",
  ),
  union: make(
    "并查集合并计数",
    "edges 是交错无向端点。n=[顶点数]，顶点编号 0 到 n−1。返回分量数。",
    "edges, n",
    `    parent=list(range(n[0]))
    size=[1]*n[0]
    count=n[0]
    def find(x):
        while x!=parent[x]:
            parent[x]=parent[parent[x]]
            x=parent[x]
        return x
    for u,v in zip(edges[::2],edges[1::2]):
        a,b=find(u),find(v)
        if a==b: continue
        if size[a]<size[b]: a,b=b,a
        parent[b]=a
        size[a]+=size[b]
        count-=1
    return count`,
    `from collections import defaultdict,deque
def solve(edges,n):
    adj=defaultdict(list)
    for a,b in zip(edges[::2],edges[1::2]):
        adj[a].append(b);adj[b].append(a)
    seen=set()
    groups=0
    for v in range(n[0]):
        if v in seen: continue
        groups+=1; q=deque([v]);seen.add(v)
        while q:
            for u in adj[q.popleft()]:
                if u not in seen: seen.add(u);q.append(u)
    return groups`,
    "[0,1,2,3,1,2], [5]",
    [
      [[[0, 1, 2, 3, 1, 2], [5]], 2],
      [[[0, 1, 0, 1], [2]], 1],
      [[[], [0]], 0],
      [[[0, 0], [4]], 4],
    ],
    "只有合并不同根时，全局分量数减少一。",
  ),
  dfs: make(
    "DFS 可达集合",
    "data 每两个数是一条有向边。start 是单元素列表。返回从起点可达的顶点数，包含起点。",
    "data, start",
    `    edges=list(zip(data[::2],data[1::2]))
    seen=set()
    def visit(u):
        if u in seen: return
        seen.add(u)
        for a,b in edges:
            if u==a: visit(b)
    visit(start[0])
    return len(seen)`,
    `from collections import defaultdict
def solve(data,start):
    adj=defaultdict(list)
    for a,b in zip(data[::2],data[1::2]): adj[a].append(b)
    seen=set();pending=list(start)
    while pending:
        u=pending.pop()
        if u in seen: continue
        seen.add(u);pending.extend(adj[u])
    return len(seen)`,
    "[0,1,1,2,2,0,0,3], [0]",
    [
      [[[0, 1, 1, 2, 2, 0, 0, 3], [0]], 4],
      [[[], [5]], 1],
      [[[1, 0, 2, 0], [0]], 1],
      [[[0, 0, 0, 1], [0]], 2],
    ],
    "沿一条分支深入前就标记，循环不要重复进入。",
  ),
  topo: make(
    "判断有向依赖环",
    "data 为交错有向边端点，n 是单元素列表，含顶点数。能拓扑排序返回 1，存在环返回 0。",
    "data, n",
    `    adj=[[] for _ in range(n[0])]
    degree=[0]*n[0]
    for a,b in zip(data[::2],data[1::2]):
        adj[a].append(b);degree[b]+=1
    q=[i for i,d in enumerate(degree) if not d]
    for i in q:
        for b in adj[i]:
            degree[b]-=1
            if not degree[b]: q.append(b)
    return int(len(q)==n[0])`,
    `from graphlib import TopologicalSorter,CycleError
def solve(data,n):
    g=TopologicalSorter({i:[] for i in range(n[0])})
    for a,b in zip(data[::2],data[1::2]): g.add(b,a)
    try: return int(len(tuple(g.static_order()))==n[0])
    except CycleError: return 0`,
    "[0,1,0,2,2,3], [4]",
    [
      [[[0, 1, 0, 2, 2, 3], [4]], 1],
      [[[0, 1, 1, 0], [2]], 0],
      [[[2, 2], [4]], 0],
      [[[], [4]], 1],
    ],
    "Kahn 输出少于顶点总数说明剩余依赖存在环。",
  ),
  bellman: make(
    "有负边的最短路",
    "data 的三元组为有向边 u,v,w，query=[源,终点]。负环影响终点返回 −9999，不可达返回 9999，否则给有限最短距离。",
    "data, query",
    `    s,t=query
    edges=list(zip(data[::3],data[1::3],data[2::3]))
    vertices=set(data[::3]+data[1::3]+query)
    inf=float('inf')
    dist={u:(0 if s==u else inf) for u in vertices}
    for _ in range(len(vertices)-1):
        for a,b,w in edges: dist[b]=min(dist[b],dist[a]+w)
    bad={b for a,b,w in edges if dist[a]+w<dist[b]}
    for _ in vertices:
        for a,b,w in edges:
            if a in bad: bad.add(b)
    return -9999 if t in bad else 9999 if dist[t]==inf else dist[t]`,
    `from itertools import product
def solve(data,query):
    s,t=query
    v=set(data[::3]+data[1::3]+query)
    inf=float('inf')
    d={(a,b):0 if a==b else inf for a,b in product(v,repeat=2)}
    for a,b,w in zip(data[::3],data[1::3],data[2::3]): d[a,b]=min(d[a,b],w)
    for k in v:
        for a,b in product(v,repeat=2):d[a,b]=min(d[a,b],d[a,k]+d[k,b])
    if any(d[s,k]!=inf and d[k,k]<0 and d[k,t]!=inf for k in v): return -9999
    return 9999 if d[s,t]==inf else d[s,t]`,
    "[0,1,5,0,2,2,2,1,-3], [0,1]",
    [
      [
        [
          [0, 1, 5, 0, 2, 2, 2, 1, -3],
          [0, 1],
        ],
        -1,
      ],
      [
        [
          [0, 1, 2, 1, 0, -3, 1, 2, 1],
          [0, 2],
        ],
        -9999,
      ],
      [
        [
          [0, 1, 1, 1, 2, -3, 2, 1, 1, 0, 3, 4],
          [0, 3],
        ],
        4,
      ],
      [[[], [0, 1]], 9999],
    ],
    "额外的可松弛点要沿出边传播，只有影响终点才返回负环哨兵。",
  ),
  mst: make(
    "最小生成森林权重",
    "data 的三元组为无向边 u,v,w。允许负权、断图和平行边，返回各分量最小生成树总权。",
    "data",
    `    edges=sorted(zip(data[2::3],data[::3],data[1::3]))
    parent={x:x for _,a,b in edges for x in (a,b)}
    def root(x):
        while parent[x]!=x: x=parent[x]
        return x
    total=0
    for w,a,b in edges:
        x,y=root(a),root(b)
        if x!=y: parent[x]=y;total+=w
    return total`,
    `from collections import defaultdict
from heapq import heappush,heappop
def solve(data):
    adj=defaultdict(list)
    for a,b,w in zip(data[::3],data[1::3],data[2::3]):
        adj[a].append((w,b));adj[b].append((w,a))
    used=set();total=0
    for s in adj:
        q=[(0,s)]
        while q:
            w,v=heappop(q)
            if v in used: continue
            total+=w;used.add(v)
            for edge in adj[v]: heappush(q,edge)
    return total`,
    "[0,1,1,1,2,2,0,2,9]",
    [
      [[[0, 1, 1, 1, 2, 2, 0, 2, 9]], 3],
      [[[0, 1, 4, 2, 3, -2]], 2],
      [[[0, 1, 8, 0, 1, 3, 1, 1, -50]], 3],
      [[[]], 0],
    ],
    "分量内边会成环，平行边只选需要的一条。",
  ),
  queens: make(
    "N 皇后回溯计数",
    "data=[N]，N 最大 7。返回标准 N 皇后所有合法配置的数量，镜像也计。",
    "data",
    `    n=data[0]; chosen=[]
    def visit(row):
        if row==n: return 1
        count=0
        for col in range(n):
            if any(c==col or abs(c-col)==row-i for i,c in enumerate(chosen)): continue
            chosen.append(col);count+=visit(row+1);chosen.pop()
        return count
    return visit(0)`,
    `from itertools import permutations
def solve(data):
    n=data[0]
    return sum(len({r-c for r,c in enumerate(board)})==n and len({r+c for r,c in enumerate(board)})==n for board in permutations(range(n)))`,
    "[4]",
    [
      [[[4]], 2],
      [[[1]], 1],
      [[[3]], 0],
      [[[5]], 10],
    ],
    "递归返回后撤销列选择。列互异、两种对角线都要检查。",
  ),
  segment: make(
    "线段树的更新与区间和",
    "操作三元组 [0,l,r] 查询半开区间，[1,i,value] 赋值。返回所有查询之和。",
    "data, ops",
    `    n=len(data)
    t=[0]*n+list(data)
    for i in range(n-1,0,-1): t[i]=t[2*i]+t[2*i+1]
    answer=0
    for kind,a,b in zip(ops[::3],ops[1::3],ops[2::3]):
        if kind:
            i=n+a;t[i]=b;i//=2
            while i: t[i]=t[2*i]+t[2*i+1];i//=2
        else:
            l,r=n+a,n+b
            while l<r:
                if l%2: answer+=t[l];l+=1
                if r%2: r-=1;answer+=t[r]
                l//=2;r//=2
    return answer`,
    `def solve(data,ops):
    a=list(data);total=0
    for k,i,x in zip(ops[::3],ops[1::3],ops[2::3]):
        if k: a[i]=x
        else: total+=sum(a[i:x])
    return total`,
    "[2,4,1,5,3], [0,0,3,1,1,7,0,0,3]",
    [
      [
        [
          [2, 4, 1, 5, 3],
          [0, 0, 3, 1, 1, 7, 0, 0, 3],
        ],
        17,
      ],
      [[[4], [0, 0, 1, 1, 0, -1, 0, 0, 1]], 3],
      [
        [
          [3, 7, 2],
          [0, 2, 2],
        ],
        0,
      ],
      [[[], [0, 0, 0]], 0],
    ],
    "半开区间的右端不入和；赋值后更新祖先聚合。",
  ),
  flow: make(
    "最大流与反向残量",
    "data 为有向边 (u,v,非负容量) 交错列表，query=[源,汇]，二点不同。返回最大整数流。",
    "data, query",
    `    from collections import deque
    s,t=query
    vertices=set(data[::3]+data[1::3]+query)
    cap={(a,b):0 for a in vertices for b in vertices}
    for a,b,c in zip(data[::3],data[1::3],data[2::3]): cap[a,b]+=c
    total=0
    while True:
        pred={s:None};q=deque([s])
        while q and t not in pred:
            a=q.popleft()
            for b in vertices:
                if b not in pred and cap[a,b]>0:pred[b]=a;q.append(b)
        if t not in pred: return total
        path=[];v=t
        while v!=s: path.append((pred[v],v));v=pred[v]
        amount=min(cap[a,b] for a,b in path)
        for a,b in path: cap[a,b]-=amount;cap[b,a]+=amount
        total+=amount`,
    `from itertools import product
def solve(data, query):
    s,t=query
    edges=list(zip(data[::3],data[1::3],data[2::3]))
    inner=list(set(data[::3]+data[1::3])-{s,t})
    def cut(bits):
        left={s}|{v for v,b in zip(inner,bits) if b}
        return sum(c for a,b,c in edges if a in left and b not in left)
    return min(map(cut,product((0,1),repeat=len(inner))))`,
    "[0,1,3,0,2,2,1,2,1,1,3,2,2,3,3], [0,3]",
    [
      [
        [
          [0, 1, 3, 0, 2, 2, 1, 2, 1, 1, 3, 2, 2, 3, 3],
          [0, 3],
        ],
        5,
      ],
      [
        [
          [0, 1, 3, 0, 1, 4, 1, 2, 11],
          [0, 2],
        ],
        7,
      ],
      [
        [
          [0, 1, 1, 0, 2, 1, 1, 3, 1, 1, 4, 1, 2, 3, 1, 3, 5, 1, 4, 5, 1],
          [0, 5],
        ],
        2,
      ],
      [[[], [0, 2]], 0],
    ],
    "增广不仅扣正边，也给反向边加同样的残量。",
  ),
  matching: make(
    "二分图最大匹配",
    "data 是交错的左端点与右端点，两个编号空间互相独立。返回能形成的不共享端点的最大匹配大小。",
    "data",
    `    adj={}
    for a,b in zip(data[::2],data[1::2]): adj.setdefault(a,[]).append(b)
    owner={}
    def augment(a,seen):
        for b in adj[a]:
            if b in seen: continue
            seen.add(b)
            if b not in owner or augment(owner[b],seen): owner[b]=a;return True
        return False
    return sum(augment(a,set()) for a in adj)`,
    `from itertools import product
def solve(data):
    adj={}
    for a,b in zip(data[::2],data[1::2]): adj.setdefault(a,set()).add(b)
    candidates=product(*[[None,*b] for b in adj.values()])
    best=0
    for assignment in candidates:
        used=[x for x in assignment if x is not None]
        if len(set(used))==len(used): best=max(best,len(used))
    return best`,
    "[0,0,0,1,1,0]",
    [
      [[[0, 0, 0, 1, 1, 0]], 2],
      [[[0, 0, 1, 0, 2, 0]], 1],
      [[[0, 0, 0, 1, 1, 0, 2, 1, 2, 2]], 3],
      [[[]], 0],
    ],
    "一个右点被占时，沿交替路给原左点找替代，避免重复访问同一右点。",
  ),
  geometry: make(
    "二维凸包极端顶点数",
    "xy 为交错整数坐标，去掉重复点，不计共线边上的中间点。返回凸包的极端顶点数。",
    "xy",
    `    p=sorted(set(zip(xy[::2],xy[1::2])))
    if len(p)<2: return len(p)
    def cross(a,b,c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def half(points):
        h=[]
        for q in points:
            while len(h)>1 and cross(h[-2],h[-1],q)<=0: h.pop()
            h.append(q)
        return h
    return len(half(p))+len(half(reversed(p)))-2`,
    `from itertools import combinations
def solve(xy):
    p=sorted(set(zip(xy[::2],xy[1::2])))
    if len(p)<2: return len(p)
    extreme=set()
    for a,b in combinations(p,2):
        dx,dy=b[0]-a[0],b[1]-a[1]
        signed=[dx*(v[1]-a[1])-dy*(v[0]-a[0]) for v in p]
        if min(signed)<0<max(signed): continue
        on=[v for v,s in zip(p,signed) if s==0]
        key=lambda v:dx*v[0]+dy*v[1]
        extreme.add(min(on,key=key));extreme.add(max(on,key=key))
    return len(extreme)`,
    "[0,0,2,0,2,2,0,2,1,1,1,0]",
    [
      [[[0, 0, 2, 0, 2, 2, 0, 2, 1, 1, 1, 0]], 4],
      [[[0, 0, 1, 1, 2, 2, 3, 3]], 2],
      [[[3, 3, 3, 3]], 1],
      [[[]], 0],
    ],
    "用叉积的符号判断转向。两条链合并时去掉重复端点。",
  ),
};
