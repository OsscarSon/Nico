import { program } from "../applied/programs";
export const qaPrograms = {
  ode: program(
    "rk4_decay",
    "initial, configuration",
    "initial[0]=初值，configuration=[衰减率 a,步长 h]。用一次经典 RK4 前进 y′=−a y。",
    "在中点使用两次预测斜率。末斜率使用完整一步预测。",
    [
      "a,h=configuration",
      "y=initial[0]",
      "k1=-a*y",
      "k2=-a*(y+h*k1/2)",
      "k3=-a*(y+h*k2/2)",
      "k4=-a*(y+h*k3)",
      "return y+h*(k1+2*k2+2*k3+k4)/6",
    ],
    [
      "from fractions import Fraction",
      "from math import factorial",
      "x=-Fraction(configuration[0])*Fraction(configuration[1])",
      "return float(Fraction(initial[0])*sum(x**j/factorial(j) for j in range(5)))",
    ],
    [
      [[[1], [1, 1]], 0.375],
      [[[3], [2, 0.5]], 1.125],
      [[[9], [0, 0.2]], 9],
      [[[-2], [1, 0]], -2],
    ],
    (n) => [[[n], [2, 0.25]], (233 / 384) * n],
  ),
  power: program(
    "fair_right_tail",
    "counts",
    "counts=[n,k] 是非负整数投掷数和拒绝界，n≤2000。求公平硬币至少 k 次正面的概率。",
    "可用数学整数计数后统一乘 2⁻ⁿ，不从浮点 P(X=0) 启动。",
    [
      "n,k=map(int,counts)",
      "if k<=0: return 1",
      "if k>n: return 0",
      "mass=1",
      "hits=0",
      "for i in range(n+1):",
      "    if i>=k: hits+=mass",
      "    mass=mass*(n-i)//(i+1)",
      "return hits/(1<<n)",
    ],
    [
      "from math import comb",
      "n,k=map(int,counts)",
      "return sum(comb(n,i) for i in range(max(0,k),n+1))/2**n",
    ],
    [
      [[[4, 3]], 5 / 16],
      [[[4, 4]], 1 / 16],
      [[[7, 8]], 0],
      [[[1999, 1000]], 0.5],
    ],
    (n) => [[[2 * n + 1, n + 1]], 0.5],
  ),
  markov: program(
    "two_state_forecast",
    "row, count",
    "row=[初始进入 B 的概率, A→B 概率, B→A 概率]。count[0] 是步数。求末端 P(B)。",
    "下一步 = (1−p)×a+p×(1−b)。注意 a+b=0 的退化情况。",
    [
      "p,a,b=row",
      "for _ in range(int(count[0])):",
      "    p=(1-p)*a+p*(1-b)",
      "return p",
    ],
    [
      "from fractions import Fraction",
      "p,a,b=map(Fraction,row)",
      "n=int(count[0])",
      "if a+b==0: return float(p)",
      "stationary=a/(a+b)",
      "return float(stationary+(p-stationary)*(1-a-b)**n)",
    ],
    [
      [[[1, 0.2, 0.3], [2]], 0.55],
      [[[0, 1, 1], [3]], 1],
      [[[0.2, 0, 0], [12]], 0.2],
      [[[0.75, 0.1, 0.4], [0]], 0.75],
    ],
    (n) => [[[1, 0.25, 0.25], [n]], 0.5 + 0.5 * 0.5 ** n],
  ),
  bayes: program(
    "posterior_predictive",
    "prior, data",
    "prior=[alpha,beta] 都为正；data=[成功数,失败数]。求下一次成功的后验预测概率。",
    "先更新两个共轭参数。预测平均成功率，不用众数代替。",
    ["a,b=prior", "s,f=data", "return (a+s)/(a+b+s+f)"],
    [
      "from fractions import Fraction",
      "a,b=map(Fraction,prior)",
      "s,f=map(Fraction,data)",
      "odds=(a+s)/(b+f)",
      "return float(1/(1+1/odds))",
    ],
    [
      [
        [
          [2, 3],
          [4, 1],
        ],
        0.6,
      ],
      [
        [
          [1, 1],
          [0, 4],
        ],
        1 / 6,
      ],
      [
        [
          [10, 2],
          [0, 0],
        ],
        5 / 6,
      ],
      [
        [
          [0.5, 0.5],
          [1, 1],
        ],
        0.5,
      ],
    ],
    (n) => [
      [
        [n, 2 * n],
        [n, 0],
      ],
      0.5,
    ],
  ),
  quorum: program(
    "vote_shortfall",
    "cluster",
    "cluster=[固定总节点数,可达节点数(含自己),其中拒绝候选人的数]，输入有效。返回离多数还差多少票，至少为 0。",
    "多数由固定总规模计算，不能只用可达规模。",
    [
      "n,reachable,refuse=map(int,cluster)",
      "return max(0,n//2+1-(reachable-refuse))",
    ],
    [
      "import math",
      "n,reachable,refuse=map(int,cluster)",
      "return max(0,math.ceil((n+1)/2)+refuse-reachable)",
    ],
    [
      [[[5, 3, 0]], 0],
      [[[5, 2, 0]], 1],
      [[[7, 5, 2]], 1],
      [[[8, 8, 0]], 0],
    ],
    (n) => [[[2 * n + 1, n, 0]], 1],
  ),
  convolution: program(
    "conv_patch_scalar",
    "image, kernel, offsets",
    "image 是一维数据、kernel 非空，offsets[0] 是有效起点。返回一个不翻转卷积核的有效互相关输出。",
    "取与核等长的数据窗口，按顺序相乘求和。",
    [
      "start=int(offsets[0])",
      "total=0",
      "for i,weight in enumerate(kernel):",
      "    total+=weight*image[start+i]",
      "return total",
    ],
    [
      "from math import fsum",
      "index=int(offsets[0])",
      "return fsum(a*b for a,b in zip(image[index:index+len(kernel)],kernel))",
    ],
    [
      [[[2, 1, 4, 3], [1, -2], [1]], -7],
      [[[4, 2], [1, 1], [0]], 6],
      [[[0, 0], [2], [1]], 0],
      [[[-1, -2, 3], [0.5], [2]], 1.5],
    ],
    (n) => [[[5, n, 8], [2, -1], [1]], 2 * n - 8],
  ),
  streaming: program(
    "closed_window_count",
    "times, cutoffs",
    "times 是非负整数事件时间。cutoffs=[正窗宽,水位]。计数那些所属窗口结束时间不晚于水位的事件。",
    "窗口为 [开端,结束)，用整除找到开端。含等于水位。",
    [
      "width,watermark=cutoffs",
      "return sum((t//width+1)*width<=watermark for t in times)",
    ],
    [
      "from math import floor",
      "width,watermark=cutoffs",
      "limit=floor(watermark/width)*width",
      "return len([t for t in times if t<limit])",
    ],
    [
      [
        [
          [0, 9, 10, 19, 20],
          [10, 20],
        ],
        4,
      ],
      [
        [
          [0, 9, 10],
          [10, 9],
        ],
        0,
      ],
      [
        [
          [0, 9, 10],
          [10, 10],
        ],
        2,
      ],
      [[[], [5, 999]], 0],
    ],
    (n) => {
      const w = n + 2;
      return [
        [
          [0, w, w + 1, 2 * w],
          [w, 2 * w],
        ],
        3,
      ];
    },
  ),
};
