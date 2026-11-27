import type { Question } from "../teaching/schema";

type Case = { args: number[][]; expected: number };
type Specs = {
  name: string;
  parameters: string;
  prompt: string;
  hint: string;
  scratch: string;
  library: string;
  sample: string;
  cases: Case[];
  variant?: (n: number) => Case;
};
const entry = (args: number[][], expected: number): Case => ({
  args,
  expected,
});
export const advancedPrograms: Record<string, Specs> = {
  "study-log": {
    name: "valid_duration",
    parameters: "minutes",
    prompt:
      "实现学习时长工具的聚合函数。只接受正整数分钟，忽略零、负数与小数。",
    hint: "对每个值同时检查 value>0 和 value 等于 int(value)。空输入总和为 0。",
    scratch: `def valid_duration(minutes):
    total=0
    for value in minutes:
        if value>0 and value==int(value):
            total+=value
    return total`,
    library: `from functools import reduce
def valid_duration(minutes):
    accepted=filter(lambda x:x>0 and x==int(x), minutes)
    return reduce(lambda a,b:a+b,accepted,0)`,
    sample: "[20,0,12,-1,5]",
    cases: [
      entry([[20, 0, 12, -1, 5]], 37),
      entry([[0, -2, 0.5]], 0),
      entry([[2, 3.5, 4, 5]], 11),
      entry([[]], 0),
    ],
    variant: (n) => entry([[n, -2, n + 0.5, 0, 1]], n + 1),
  },
  precision: {
    name: "accurate_sum",
    parameters: "terms",
    prompt: "求实数和，保留大小数抵消间夹的小分量。",
    hint: "每次累加时估计被舍入掉的分量，将它们用补偿变量累积。",
    scratch: `def accurate_sum(terms):
    total=correction=0.0
    for value in terms:
        value=float(value)
        nxt=total+value
        correction += ((total-nxt)+value) if abs(total)>=abs(value) else ((value-nxt)+total)
        total=nxt
    return total+correction`,
    library: `import math
def accurate_sum(terms):
    return math.fsum(terms)`,
    sample: "[1e16,1,-1e16]",
    cases: [
      entry([[1e16, 1, -1e16]], 1),
      entry([[1e16, -1e16, 1]], 1),
      entry([[2, 3, -4]], 1),
      entry([[]], 0),
    ],
    variant: (n) => entry([[1e16, n, -1e16, -2]], n - 2),
  },
  integrate: {
    name: "simpson_square",
    parameters: "bounds, controls",
    prompt:
      "用复合 Simpson 积分 x²。bounds 为 [a,b]，controls[0] 为正偶数分段。",
    hint: "两端权重 1，中间从 4、2 开始交替，乘 h/3。",
    scratch: `def simpson_square(bounds, controls):
    a,b=bounds
    n=int(controls[0])
    h=(b-a)/n
    y=[(a+h*i)**2 for i in range(n+1)]
    return (y[0]+y[-1]+sum((4 if i%2 else 2)*y[i] for i in range(1,n)))*h/3`,
    library: `from fractions import Fraction
def simpson_square(bounds, controls):
    a,b=map(Fraction,bounds)
    return float((b**3-a**3)/3)`,
    sample: "[0,2], [4]",
    cases: [
      entry([[0, 2], [4]], 8 / 3),
      entry([[-1, 1], [2]], 2 / 3),
      entry([[3, 3], [2]], 0),
      entry([[2, 0], [8]], -8 / 3),
    ],
    variant: (n) => entry([[0, n], [6]], n ** 3 / 3),
  },
  dft: {
    name: "bin_power",
    parameters: "samples, band",
    prompt:
      "返回前向 DFT 指定频格复系数的模平方。band[0] 为 k，本题不除样本数。",
    hint: "分别累加余弦实部和负正弦虚部，再平方相加。",
    scratch: `from math import pi,cos,sin
def bin_power(samples,band):
    angles=[-2*pi*band[0]*j/len(samples) for j in range(len(samples))]
    r=sum(x*cos(t) for x,t in zip(samples,angles))
    i=sum(x*sin(t) for x,t in zip(samples,angles))
    return r*r+i*i`,
    library: `import cmath
def bin_power(samples,band):
    phase = -2j * cmath.pi * band[0] / len(samples)
    return abs(sum(x*cmath.exp(phase*j) for j,x in enumerate(samples)))**2`,
    sample: "[1,0,-1,0], [1]",
    cases: [
      entry([[1, 0, -1, 0], [1]], 4),
      entry([[2, 2, 2, 2], [0]], 64),
      entry([[2, 2, 2, 2], [1]], 0),
      entry([[0], [0]], 0),
    ],
    variant: (n) => entry([[n, 0, -n, 0], [3]], 4 * n * n),
  },
  entropy: {
    name: "entropy_bits",
    parameters: "weights",
    prompt: "计算和为 1 的离散质量函数的二进制熵，忽略零概率项。",
    hint: "每个正概率贡献 −p log₂(p)。",
    scratch: `from math import log
def entropy_bits(weights):
    value=0
    for p in weights:
        if p>0:
            value-=p*log(p)/log(2)
    return value`,
    library: `from math import fsum,log2
def entropy_bits(weights):
    return -fsum(p*log2(p) for p in weights if p)`,
    sample: "[0.5,0.5,0]",
    cases: [
      entry([[0.5, 0.5, 0]], 1),
      entry([[1, 0]], 0),
      entry([[0.25, 0.25, 0.25, 0.25]], 2),
      entry([[0.5, 0.25, 0.25]], 1.5),
    ],
    variant: (n) => {
      const p = 2 ** -n;
      return entry(
        [[p, 1 - p]],
        -p * Math.log2(p) - (1 - p) * Math.log2(1 - p),
      );
    },
  },
  markov: {
    name: "state_one",
    parameters: "parameters, steps",
    prompt:
      "从 parameters 的 [初值 p, 进入率 a, 退出率 b] 出发，返回 steps[0] 步后处于状态 1 的概率。",
    hint: "每步用 (1−p)a+p(1−b)。交替链可以收敛失败但一步公式仍有效。",
    scratch: `def state_one(parameters,steps):
    p,a,b=parameters
    for _ in range(int(steps[0])):
        p=(1-p)*a+p*(1-b)
    return p`,
    library: `from fractions import Fraction
def state_one(parameters,steps):
    p,a,b=map(Fraction,parameters)
    if a+b==0:
        return float(p)
    stationary=a/(a+b)
    return float(stationary+(p-stationary)*(1-a-b)**int(steps[0]))`,
    sample: "[0,0.3,0.2], [2]",
    cases: [
      entry([[0, 0.3, 0.2], [2]], 0.45),
      entry([[0.3, 0, 0], [45]], 0.3),
      entry([[0, 1, 1], [8]], 0),
      entry([[0.25, 1, 1], [3]], 0.75),
    ],
    variant: (n) => entry([[0, 0.5, 0.5], [n]], 0.5),
  },
  cache: {
    name: "lru_hits",
    parameters: "keys, max_entries",
    prompt: "统计 LRU 缓存的命中。键为整数，max_entries[0] ≥ 1。",
    hint: "命中时也要刷新访问顺序，未命中且满时淘汰最旧。",
    scratch: `def lru_hits(keys,max_entries):
    order=[]
    hits=0
    for key in keys:
        if key in order:
            hits+=1
            order.remove(key)
        elif len(order)==max_entries[0]:
            order.pop(0)
        order.append(key)
    return hits`,
    library: `from collections import OrderedDict
def lru_hits(keys,max_entries):
    order=OrderedDict()
    hits=0
    for key in keys:
        if key in order:
            hits+=1
            order.move_to_end(key)
        else:
            if len(order)==max_entries[0]:
                order.popitem(last=False)
            order[key]=True
    return hits`,
    sample: "[1,2,1,3,2], [2]",
    cases: [
      entry([[1, 2, 1, 3, 2], [2]], 1),
      entry([[1, 2, 1], [1]], 0),
      entry([[3, 3, 3], [1]], 2),
      entry([[], [4]], 0),
    ],
    variant: (n) =>
      entry([Array.from({ length: n + 3 }, (_, i) => i % 3), [3]], n),
  },
  reinforce: {
    name: "td_update",
    parameters: "transition, control",
    prompt:
      "transition 为 [Q旧,奖赏,下一价值,是否终止]，control 为 [α,γ]。返回一步 Q-learning 更新。",
    hint: "终止时目标为奖赏，其他情况还需乘折扣加上未来值。",
    scratch: `def td_update(transition, control):
    old,reward,nxt,terminal=transition
    alpha,gamma=control
    target=reward if terminal else reward+gamma*nxt
    return old+alpha*(target-old)`,
    library: `from fractions import Fraction
def td_update(transition, control):
    old,reward,nxt,terminal=map(Fraction,transition)
    alpha,gamma=map(Fraction,control)
    return float((1-alpha)*old+alpha*reward+(0 if terminal else alpha*gamma*nxt))`,
    sample: "[0.3,0,0.8,0], [0.5,0.9]",
    cases: [
      entry(
        [
          [0.3, 0, 0.8, 0],
          [0.5, 0.9],
        ],
        0.51,
      ),
      entry(
        [
          [0.2, 1, 30, 1],
          [0.25, 0.9],
        ],
        0.4,
      ),
      entry(
        [
          [4, 3, 2, 0],
          [1, 0],
        ],
        3,
      ),
      entry(
        [
          [1, -1, 2, 1],
          [0.5, 1],
        ],
        0,
      ),
    ],
    variant: (n) =>
      entry(
        [
          [n, 2, 15, 1],
          [0.5, 0.9],
        ],
        n / 2 + 1,
      ),
  },
};
export function advancedProgram(id: string, n = 0) {
  const spec = advancedPrograms[id];
  if (!spec) return undefined;
  const suffix = "\n\nprint(round(" + spec.name + "(" + spec.sample + "),8))";
  const question: Extract<Question, { type: "program" }> = {
    id: "p4-code-" + id + (n ? "-" + n : ""),
    type: "program",
    level: "transfer",
    functionName: spec.name,
    prompt: spec.prompt,
    hint: spec.hint,
    explanation: "通过浏览器 Python 执行和多组结果核验。",
    starter: "def " + spec.name + "(" + spec.parameters + "):\n    return None",
    tolerance: 1e-6,
    cases:
      n && spec.variant
        ? [...spec.cases, spec.variant(n), spec.variant(n + 1)]
        : spec.cases,
  };
  return {
    pair: [spec.name, spec.scratch + suffix, spec.library + suffix] as const,
    question,
  };
}
