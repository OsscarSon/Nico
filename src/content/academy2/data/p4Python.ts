import type { Program } from "./python";

// Test inputs exercise real computations. The library column takes a different
// path so errors in an implementation can be diagnosed by running both.
export const p4DataPrograms: Record<string, Program> = {
  "clean-fill": {
    functionName: "fill_total",
    signature: "values, missing",
    prompt: "用有效观测的中位数填补 missing[0]，再求和。全列缺测时返回 0。",
    hint: "中位数只用有效值。偶数个有效值时平均两个中间值。",
    hand: `def fill_total(values, missing):
    valid = sorted(x for x in values if x != missing[0])
    n = len(valid)
    if not n:
        return 0
    median = (valid[(n-1)//2]+valid[n//2])/2
    return sum(valid)+(len(values)-n)*median`,
    library: `import numpy as np
def fill_total(values, missing):
    a = np.asarray(values)
    known = a[a != missing[0]]
    return float(known.sum() + (len(a)-len(known))*np.median(known)) if len(known) else 0`,
    packages: ["numpy"],
    sample: "[1,2,8,-99], [-99]",
    cases: [
      [[[1, 2, 8, -99], [-99]], 13],
      [[[2, 7, -1, -1], [-1]], 18],
      [[[-1, -1], [-1]], 0],
      [[[0, 0, 4, -1], [-1]], 4],
    ],
  },
  "sql-window-code": {
    functionName: "window_sum",
    signature: "values, groups, position",
    prompt: "返回 position[0] 这行所属组按原行号排序、从组首到当前行的累计和。",
    hint: "仅累加当前位置及之前属于同组的观测。SQL 要先算窗口，再在外层过滤目标行。",
    hand: `def window_sum(values, groups, position):
    row = position[0]
    running = 0
    for i in range(row + 1):
        if groups[i] == groups[row]:
            running += values[i]
    return running`,
    library: `import sqlite3
from contextlib import closing
def window_sum(values, groups, position):
    with closing(sqlite3.connect(':memory:')) as db:
        db.execute('CREATE TABLE events(r INT, x REAL, g INT)')
        db.executemany('INSERT INTO events VALUES(?,?,?)', ((r,x,g) for r,(x,g) in enumerate(zip(values,groups))))
        return db.execute('SELECT running FROM (SELECT r, SUM(x) OVER (PARTITION BY g ORDER BY r ROWS UNBOUNDED PRECEDING) AS running FROM events) WHERE r=?', position).fetchone()[0]`,
    sample: "[2,5,3,8], [0,1,0,1], [2]",
    cases: [
      [[[2, 5, 3, 8], [0, 1, 0, 1], [2]], 5],
      [[[2, 5, 3, 8], [0, 1, 0, 1], [3]], 13],
      [[[-1, 5, 1], [1, 1, 1], [0]], -1],
      [[[1, 1, 1], [2, 3, 2], [2]], 2],
    ],
  },
  "pca-projection": {
    functionName: "component",
    signature: "point, mean_axis",
    prompt:
      "返回二维点先按前两个数中心化，再投影到后两个数定义的单位主轴上的有符号坐标。",
    hint: "先按对应维度减均值，再求点积。主轴的方向由输入固定。",
    hand: `def component(point, mean_axis):
    return (point[0]-mean_axis[0])*mean_axis[2]+(point[1]-mean_axis[1])*mean_axis[3]`,
    library: `import numpy as np
def component(point, mean_axis):
    return float(np.dot(np.array(point)-mean_axis[:2],mean_axis[2:]))`,
    packages: ["numpy"],
    sample: "[5,1], [1,2,0.6,0.8]",
    cases: [
      [
        [
          [5, 1],
          [1, 2, 0.6, 0.8],
        ],
        1.6,
      ],
      [
        [
          [2, 2],
          [2, 2, 1, 0],
        ],
        0,
      ],
      [
        [
          [3, 5],
          [2, 8, 0, 1],
        ],
        -3,
      ],
      [
        [
          [1, 2],
          [2, 1, 0, -1],
        ],
        -1,
      ],
    ],
  },
  "lloyd-assignment": {
    functionName: "nearest_center",
    signature: "point, centers",
    prompt:
      "centers 以 x1,y1,x2,y2 的顺序存放两个中心。按平方欧氏距离返回中心索引，等距返回 0。",
    hint: "分别计算两个维度之差的平方，把平方和较小的中心选出。",
    hand: `def nearest_center(point, centers):
    left = sum((a-b)**2 for a,b in zip(point,centers[:2]))
    right = sum((a-b)**2 for a,b in zip(point,centers[2:]))
    return int(right < left)`,
    library: `import numpy as np
def nearest_center(point, centers):
    diff = np.reshape(centers,(2,2))-np.asarray(point)
    return int(np.argmin(np.sum(diff**2,axis=1)))`,
    packages: ["numpy"],
    sample: "[3,4], [0,0,3,3]",
    cases: [
      [
        [
          [3, 4],
          [0, 0, 3, 3],
        ],
        1,
      ],
      [
        [
          [1, 1],
          [2, 2, 0, 0],
        ],
        0,
      ],
      [
        [
          [8, 8],
          [8, 8, 1, 1],
        ],
        0,
      ],
      [
        [
          [-2, -3],
          [-4, -4, -2, -4],
        ],
        1,
      ],
    ],
  },
  "tree-gain": {
    functionName: "gini_gain",
    signature: "left, right",
    prompt:
      "给定两个非空子节点的二元标签。计算父节点 Gini 减去按样本数加权的子节点 Gini。",
    hint: "用 G=1-p²-(1-p)²。小分支不能和大分支等权。",
    hand: `def gini_gain(left, right):
    def impurity(values):
        p = sum(values) / len(values)
        return 2*p*(1-p)
    n = len(left)+len(right)
    return impurity(left+right)-(len(left)*impurity(left)+len(right)*impurity(right))/n`,
    library: `import numpy as np
def gini_gain(left, right):
    def impurity(values):
        p = np.bincount(values,minlength=2)/len(values)
        return 1-float(p@p)
    total = len(left)+len(right)
    return impurity(left+right)-(len(left)*impurity(left)+len(right)*impurity(right))/total`,
    packages: ["numpy"],
    sample: "[0,0,0], [1]",
    cases: [
      [[[0, 0, 0], [1]], 0.375],
      [
        [
          [0, 1],
          [0, 1],
        ],
        0,
      ],
      [[[0], [1]], 0.5],
      [
        [
          [0, 0],
          [0, 1],
        ],
        0.125,
      ],
    ],
  },
  "logit-bce": {
    functionName: "binary_logit_loss",
    signature: "logit, label",
    prompt:
      "从 logit[0] 和 label[0] 计算稳定的二元交叉熵。输入可能大至正负 1000。",
    hint: "softplus(z)=max(z,0)+log1p(exp(-abs(z)))。",
    hand: `from math import exp,log1p
def binary_logit_loss(logit, label):
    z = logit[0]
    return max(z,0)-label[0]*z+log1p(exp(-abs(z)))`,
    library: `import numpy as np
def binary_logit_loss(logit,label):
    z=logit[0]
    return float(np.logaddexp(0,-z if label[0] else z))`,
    packages: ["numpy"],
    sample: "[1000], [0]",
    cases: [
      [[[1000], [0]], 1000],
      [[[-1000], [1]], 1000],
      [[[0], [1]], Math.log(2)],
      [[[1000], [1]], 0],
    ],
  },
  "backprop-gradient": {
    functionName: "first_weight_gradient",
    signature: "x, parameters",
    prompt:
      "单隐藏 tanh 单元。parameters 为 [w,b,v,c,y]。对输出 sigmoid 的二元交叉熵求输入权重 w 的梯度。",
    hint: "先前向计算 h 和 p。反向依次乘 (p-y)、v、(1-h²) 和 x[0]。",
    hand: `import math
def first_weight_gradient(x, parameters):
    w,b,v,c,y=parameters
    h=math.tanh(w*x[0]+b)
    p=1/(1+math.exp(-(v*h+c)))
    return (p-y)*v*(1-h*h)*x[0]`,
    library: `import numpy as np
def first_weight_gradient(x, parameters):
    w,b,v,c,y=parameters
    def objective(weight):
        z=v*np.tanh(weight*x[0]+b)+c
        return np.logaddexp(0,z)-y*z
    e=1e-5
    return float((objective(w+e)-objective(w-e))/(2*e))`,
    packages: ["numpy"],
    tolerance: 1e-5,
    sample: "[2], [0,0,0.4,0,1]",
    cases: [
      [[[2], [0, 0, 0.4, 0, 1]], -0.4],
      [[[0], [1, 1, 2, 3, 1]], 0],
      [[[2], [0.3, 0, 0, 0, 1]], 0],
      [[[-3], [0, 0, -2, 0, 0]], 3],
    ],
  },
};

export const additionalCodeByTopic: Record<string, string> = {
  "k-d683a0df3d7a": "clean-fill",
  "k-2ba5eb019fed": "sql-window-code",
  "k-373f23ff9e76": "pca-projection",
  "k-15b0d9a0d324": "lloyd-assignment",
  "k-d13adf6dc366": "tree-gain",
  "k-bd44074776c9": "logit-bce",
  "k-092fc4770111": "backprop-gradient",
};
