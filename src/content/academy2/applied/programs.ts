import type { ProgramSpec } from "../advanced/programs";

type Fixture = [args: number[][], expected: number];
const entry = ([args, expected]: Fixture) => ({ args, expected });
export function program(
  name: string,
  parameters: string,
  prompt: string,
  hint: string,
  scratch: string[],
  library: string[],
  fixtures: Fixture[],
  variant: (n: number) => Fixture,
): ProgramSpec {
  const wrap = (lines: string[]) =>
    [
      ...lines.filter(
        (line) => line.startsWith("from ") || line.startsWith("import "),
      ),
      "def " + name + "(" + parameters + "):",
      ...lines
        .filter(
          (line) => !line.startsWith("from ") && !line.startsWith("import "),
        )
        .map((line) => "    " + line),
    ].join("\n");
  return {
    name,
    parameters,
    prompt,
    hint,
    scratch: wrap(scratch),
    library: wrap(library),
    sample: fixtures[0]![0].map((row) => JSON.stringify(row)).join(", "),
    cases: fixtures.map(entry),
    variant: (n) => entry(variant(n)),
  };
}

export const additionalPrograms: Record<string, ProgramSpec> = {
  "game-collision": program(
    "intersection_area",
    "a, b",
    "矩形是 [x,y,宽,高]，返回两个轴对齐矩形的重叠面积。接触边不算正面积。",
    "用较小右端减较大左端，两个方向分别截到零。",
    [
      "x,y,w,h=a",
      "z,t,u,v=b",
      "return max(0,min(x+w,z+u)-max(x,z))*max(0,min(y+h,t+v)-max(y,t))",
    ],
    [
      "from math import prod",
      "return prod(max(0,min(a[i]+a[i+2],b[i]+b[i+2])-max(a[i],b[i])) for i in range(2))",
    ],
    [
      [
        [
          [0, 0, 4, 3],
          [2, 1, 4, 4],
        ],
        4,
      ],
      [
        [
          [0, 0, 2, 2],
          [2, 0, 3, 5],
        ],
        0,
      ],
      [
        [
          [-4, -2, 10, 6],
          [-1, 0, 1, 2],
        ],
        2,
      ],
      [
        [
          [0, 0, 1, 10],
          [0.5, 0.5, 3, 3],
        ],
        1.5,
      ],
    ],
    (n) => [
      [
        [0, 0, n + 2, 3],
        [n, 0, 4, 4],
      ],
      6,
    ],
  ),
  "game-loop": program(
    "simulation_steps",
    "frames, timing",
    "求固定步长下可推进的步数。frames 是非负的每帧耗时，timing[0] 为正步长。",
    "保留余量，每帧消费能完整推进的步长。",
    [
      "step=timing[0]",
      "balance=total=0",
      "for elapsed in frames:",
      "    balance+=elapsed",
      "    while balance>=step:",
      "        balance-=step",
      "        total+=1",
      "return total",
    ],
    ["from math import floor", "return floor(sum(frames)/timing[0])"],
    [
      [[[35, 15], [20]], 2],
      [[[1, 1, 1, 1], [3]], 1],
      [[[], [20]], 0],
      [[[21, 19], [20]], 2],
    ],
    (n) => [[[n * 4 + 1, 7], [4]], n + 2],
  ),
  "game-movement": program(
    "horizontal_movement",
    "direction, motion",
    "direction=[x,y]、motion=[速度,时间]。先归一化方向，返回水平位移。零方向返回 0。",
    "归一化前判断平方和是否为零。",
    [
      "x,y=direction",
      "speed,seconds=motion",
      "size=(x*x+y*y)**.5",
      "return x/size*speed*seconds if size else 0",
    ],
    [
      "from math import hypot,prod",
      "return prod(motion)*direction[0]/hypot(*direction) if any(direction) else 0",
    ],
    [
      [
        [
          [3, 4],
          [10, 0.2],
        ],
        1.2,
      ],
      [
        [
          [0, 0],
          [99, 1],
        ],
        0,
      ],
      [
        [
          [-3, 4],
          [5, 3],
        ],
        -9,
      ],
      [
        [
          [0, -1],
          [1, 5],
        ],
        0,
      ],
    ],
    (n) => [
      [
        [3 * n, 4 * n],
        [5, n],
      ],
      3 * n,
    ],
  ),
  "arduino-board": program(
    "adc_code",
    "sample, board",
    "sample[0] 是输入电压，board=[正基准电压,整数位宽]。返回理想单极性 ADC 的整数码，超过两端时饱和。",
    "先将电压比乘码数。最大合法码比总数少 1。",
    [
      "v=sample[0]",
      "ref,bits=board",
      "levels=1 << int(bits)",
      "if v<=0: return 0",
      "if v>=ref: return levels-1",
      "return int(v*levels/ref)",
    ],
    [
      "from math import floor",
      "ref,bits=board",
      "levels=2**int(bits)",
      "return max(0,min(levels-1,floor(sample[0]/ref*levels)))",
    ],
    [
      [[[2.5], [5, 10]], 512],
      [[[5], [5, 10]], 1023],
      [[[-1], [3, 12]], 0],
      [[[0.25], [3, 4]], 1],
    ],
    (n) => [[[n], [16, 8]], 16 * n],
  ),
  "office-automation": program(
    "first_seen_total",
    "keys, values, policy",
    "keys 和 values 等长，policy[0] 为最低接受值。对每个 ID 只计第一条有效记录。",
    "先过滤无效，再检查已处理 ID。",
    [
      "accepted={}",
      "for key,value in zip(keys,values):",
      "    if value>=policy[0] and key not in accepted:",
      "        accepted[key]=value",
      "return sum(accepted.values())",
    ],
    [
      "from itertools import groupby",
      "from operator import itemgetter",
      "usable=sorted(((k,v) for k,v in zip(keys,values) if v>=policy[0]),key=itemgetter(0))",
      "return sum(next(group)[1] for _,group in groupby(usable,itemgetter(0)))",
    ],
    [
      [[[1, 1, 2], [5, 6, 10], [1]], 15],
      [[[1, 1, 2], [0, 6, 1], [3]], 6],
      [[[], [], [0]], 0],
      [[[1, 2, 1], [0, 0, 9], [0]], 0],
    ],
    (n) => [[[1, 1, 2], [n, n + 1, 3], [n]], n + (n <= 3 ? 3 : 0)],
  ),
  "signal-sampling": program(
    "alias_frequency",
    "signal, sample",
    "返回非负频率 signal[0] 在正采样率 sample[0] 下的折叠频率。",
    "比较频率对采样率的余数和余数的镜像。",
    [
      "f,rate=signal[0],sample[0]",
      "folded=f%rate",
      "return folded if folded<=rate/2 else rate-folded",
    ],
    [
      "from math import remainder",
      "return abs(remainder(signal[0],sample[0]))",
    ],
    [
      [[[7], [10]], 3],
      [[[0], [10]], 0],
      [[[100], [12]], 4],
      [[[5], [10]], 5],
    ],
    (n) => [[[20 + n], [10]], Math.min(n % 10, 10 - (n % 10))],
  ),
  "robot-control": program(
    "bounded_pid",
    "state, gains, constraints",
    "state=[当前误差,旧误差,已累计积分]，gains=[Kp,Ki,Kd]，constraints=[正周期,非负上限]。求一次 PID 限幅输出。",
    "微分项除以周期，三个量求和后对称截断。",
    [
      "now,last,total=state",
      "kp,ki,kd=gains",
      "dt,limit=constraints",
      "raw=kp*now+ki*total+kd*(now-last)/dt",
      "if raw>limit: return limit",
      "if raw<-limit: return -limit",
      "return raw",
    ],
    [
      "from math import fsum",
      "dt,cap=constraints",
      "terms=[state[0],state[2],(state[0]-state[1])/dt]",
      "return sorted([-cap,fsum(x*g for x,g in zip(terms,gains)),cap])[1]",
    ],
    [
      [
        [
          [2, 1, 1.5],
          [2, 1, 0.25],
          [0.5, 5],
        ],
        5,
      ],
      [
        [
          [-2, -1, -1.5],
          [2, 1, 0.25],
          [0.5, 5],
        ],
        -5,
      ],
      [
        [
          [1, 1, 10],
          [0.25, 0, 9],
          [1, 5],
        ],
        0.25,
      ],
      [
        [
          [1, 2, 5],
          [1, 1, 1],
          [0.25, 8],
        ],
        2,
      ],
    ],
    (n) => [
      [
        [n, n - 1, 0],
        [1, 1, 0.5],
        [0.5, 5],
      ],
      Math.min(n + 1, 5),
    ],
  ),
  "robot-pose": program(
    "turn_angle",
    "wheels, chassis",
    "wheels=[左轮线速度,右轮线速度]，chassis=[正轮间距,秒数]。返回带符号转角，以弧度计。",
    "两轮位移差除轮距。",
    [
      "left,right=wheels",
      "width,duration=chassis",
      "return (right-left)*duration/width",
    ],
    [
      "from fractions import Fraction",
      "left,right=map(Fraction,wheels)",
      "width,duration=map(Fraction,chassis)",
      "return float(right*duration/width-left*duration/width)",
    ],
    [
      [
        [
          [0.4, 0.6],
          [0.5, 2],
        ],
        0.8,
      ],
      [
        [
          [2, 2],
          [0.2, 5],
        ],
        0,
      ],
      [
        [
          [1, -1],
          [2, 3],
        ],
        -3,
      ],
      [
        [
          [1, 2],
          [0.1, 0],
        ],
        0,
      ],
    ],
    (n) => [
      [
        [2 * n, 3 * n],
        [2, 0.5],
      ],
      n / 4,
    ],
  ),
  "robot-slam": program(
    "estimate_landmark",
    "readings, origin",
    "readings=[里程计相对位移,起点观测的距离,终点观测的距离]。固定 origin[0]，最小化三个同权残差平方和，返回地标坐标。",
    "分别对第二姿态和地标求导，联立线性方程。",
    [
      "displacement,first,second=readings",
      "delta=first-displacement-second",
      "return origin[0]+first-delta/3",
    ],
    [
      "from fractions import Fraction",
      "a,b,c=map(Fraction,readings)",
      "return float(Fraction(origin[0])+(a+2*b+c)/3)",
    ],
    [
      [[[3, 7, 2], [0]], 19 / 3],
      [[[4, 9, 2], [2]], 10],
      [[[3, 4, 1], [10]], 14],
      [[[-2, 3, 5], [-9]], -6],
    ],
    (n) => [[[n, n + 2, 2], [1]], n + 3],
  ),
  "robot-filter": program(
    "posterior_variance",
    "prior, measurement",
    "输入 prior[0]、measurement[0] 为两个正方差。返回直接观测的标量后验方差。",
    "计算增益，再用 (1−K)P。",
    ["p,r=prior[0],measurement[0]", "return (1-p/(p+r))*p"],
    [
      "from fractions import Fraction",
      "p,r=map(Fraction,(prior[0],measurement[0]))",
      "return float(1/(1/p+1/r))",
    ],
    [
      [[[2], [1]], 2 / 3],
      [[[4], [4]], 2],
      [[[2], [6]], 1.5],
      [[[1e-4], [1e4]], 1 / (1e4 + 1e-4)],
    ],
    (n) => [[[n], [n]], n / 2],
  ),
  "finance-npv": program(
    "present_value",
    "cash, policy",
    "cash 为从 t=0 开始等间隔的现金流，policy[0] 为每期折现率。返回净现值。",
    "指数从零开始，也可从末尾做递推折现。",
    [
      "total=0",
      "for amount in reversed(cash):",
      "    total=amount+total/(1+policy[0])",
      "return total",
    ],
    [
      "from math import fsum",
      "return fsum(c/(1+policy[0])**t for t,c in enumerate(cash))",
    ],
    [
      [[[-100, 0, 144], [0.2]], 0],
      [[[-100, 121], [0.1]], 10],
      [[[4], [0.1]], 4],
      [[[-1, 2, 3], [0]], 4],
    ],
    (n) => [[[-n, n * 2], [1]], 0],
  ),
  "sequence-align": program(
    "edit_cost",
    "a, b",
    "两个数组是抽象符号序列。一次插入、删除或替换的成本均为 1，求最小成本。",
    "求任意两个前缀到彼此的最小成本。",
    [
      "previous=list(range(len(b)+1))",
      "for i,x in enumerate(a,1):",
      "    row=[i]",
      "    for j,y in enumerate(b,1):",
      "        row.append(min(row[-1]+1,previous[j]+1,previous[j-1]+(x!=y)))",
      "    previous=row",
      "return previous[-1]",
    ],
    [
      "from functools import lru_cache",
      "@lru_cache(None)",
      "def cost(i,j):",
      "    if i==len(a): return len(b)-j",
      "    if j==len(b): return len(a)-i",
      "    return min(1+cost(i+1,j),1+cost(i,j+1),(a[i]!=b[j])+cost(i+1,j+1))",
      "return cost(0,0)",
    ],
    [
      [
        [
          [1, 2, 3],
          [1, 0, 2, 3],
        ],
        1,
      ],
      [[[], [1, 2]], 2],
      [
        [
          [1, 2],
          [2, 1],
        ],
        2,
      ],
      [
        [
          [1, 1],
          [1, 1],
        ],
        0,
      ],
    ],
    (n) => [
      [Array.from({ length: n }, () => 0), Array.from({ length: n }, () => 1)],
      n,
    ],
  ),
  "quantum-phase": program(
    "zero_probability",
    "angles, options",
    "angles[0] 为角度。先做 H 和相位门，options[0] 为 1 时再加 H，否则直接测量。返回测 0 的概率。",
    "先合成复振幅，再算模平方。",
    [
      "from math import radians,cos",
      "return (1+cos(radians(angles[0])))/2 if options[0] else .5",
    ],
    [
      "from cmath import exp,pi",
      "phase=exp(1j*angles[0]*pi/180)",
      "return abs((1+phase)/2)**2 if options[0] else .5",
    ],
    [
      [[[180], [1]], 0],
      [[[90], [0]], 0.5],
      [[[120], [1]], 0.25],
      [[[360], [1]], 1],
    ],
    (n) => [[[90 * n], [1]], [1, 0.5, 0, 0.5][n % 4]!],
  ),
  factorizations: program(
    "pivot_determinant",
    "a, b, c",
    "a、b、c 为 3×3 矩阵的行。用主元消元求行列式。奇异矩阵返回 0。",
    "交换行会翻转符号。消元后乘对角线。",
    [
      "rows=[a[:],b[:],c[:]]",
      "sign=1",
      "for i in range(3):",
      "    k=max(range(i,3),key=lambda j:abs(rows[j][i]))",
      "    if rows[k][i]==0: return 0",
      "    if k!=i:",
      "        rows[i],rows[k]=rows[k],rows[i]",
      "        sign=-sign",
      "    for j in range(i+1,3):",
      "        ratio=rows[j][i]/rows[i][i]",
      "        for m in range(i+1,3): rows[j][m]-=ratio*rows[i][m]",
      "return sign*rows[0][0]*rows[1][1]*rows[2][2]",
    ],
    [
      "from itertools import permutations",
      "from math import prod,fsum",
      "rows=[a,b,c]",
      "return fsum((-1)**sum(p[i]>p[j] for i in range(3) for j in range(i+1,3))*prod(rows[i][p[i]] for i in range(3)) for p in permutations(range(3)))",
    ],
    [
      [
        [
          [0, 2, 1],
          [1, 3, 4],
          [2, 0, 5],
        ],
        0,
      ],
      [
        [
          [0, 1, 0],
          [4, 0, 0],
          [0, 0, 2],
        ],
        -8,
      ],
      [
        [
          [1, 2, 3],
          [1, 2, 3],
          [0, 1, 2],
        ],
        0,
      ],
      [
        [
          [-1, 2, 0],
          [0, 3, 1],
          [0, 0, 2],
        ],
        -6,
      ],
    ],
    (n) => [
      [
        [0, 2, 3],
        [n, 0, -1],
        [0, 0, 4],
      ],
      -8 * n,
    ],
  ),
  attention: program(
    "soft_attention",
    "logits, values",
    "对非空 logits 做稳定 Softmax，返回等长 values 的加权和。",
    "先整体减最大 logit，避免指数溢出。",
    [
      "from math import exp",
      "high=max(logits)",
      "weights=[exp(x-high) for x in logits]",
      "return sum(w*v for w,v in zip(weights,values))/sum(weights)",
    ],
    [
      "from math import exp,fsum,log",
      "high=max(logits)",
      "shifted=[x-high for x in logits]",
      "logsum=log(fsum(exp(x) for x in shifted))",
      "return fsum(exp(x-logsum)*v for x,v in zip(shifted,values))",
    ],
    [
      [
        [
          [1000, 1000],
          [3, 5],
        ],
        4,
      ],
      [[[5000], [7]], 7],
      [
        [
          [1000, -1000],
          [9, 20],
        ],
        9,
      ],
      [
        [
          [0, Math.log(3)],
          [2, 6],
        ],
        5,
      ],
    ],
    (n) => [
      [
        [1000, 1000, 1000],
        [n, n + 1, n + 2],
      ],
      n + 1,
    ],
  ),
  fairness: program(
    "tpr_gap",
    "group_a, group_b",
    "每组为 [真阳数,真实正类数] 且有正例。求真阳率 A−B。",
    "分母用实际正类数。",
    ["return group_a[0]/group_a[1]-group_b[0]/group_b[1]"],
    [
      "from fractions import Fraction",
      "return float(Fraction(*group_a)-Fraction(*group_b))",
    ],
    [
      [
        [
          [4, 8],
          [3, 5],
        ],
        -0.1,
      ],
      [
        [
          [0, 10],
          [12, 12],
        ],
        -1,
      ],
      [
        [
          [3, 3],
          [0, 2],
        ],
        1,
      ],
      [
        [
          [3, 6],
          [5, 10],
        ],
        0,
      ],
    ],
    (n) => [
      [
        [n, 2 * n],
        [n, 4 * n],
      ],
      0.25,
    ],
  ),
};
