import type { Question } from "../teaching/schema";
import type { TeachingPackage } from "../../../runtime/notebookPython";

type Program = {
  functionName: string;
  signature: string;
  hint: string;
  prompt: string;
  hand: string;
  library: string;
  packages?: TeachingPackage[];
  sample: string;
  cases: [number[][], number][];
  tolerance?: number;
};
const programs: Record<string, Program> = {
  csv: {
    functionName: "valid_sum",
    signature: "data, sentinel",
    prompt:
      "值列表中等于 sentinel[0] 的是本题专用缺测编码。返回所有有效值之和。",
    hint: "先把数据字典指定的缺失编码与有效零分开。",
    hand: "def valid_sum(data, sentinel):\n    total=0\n    for value in data:\n        if value != sentinel[0]:\n            total+=value\n    return total",
    library:
      "import csv, io\ndef valid_sum(data, sentinel):\n    source=io.StringIO('value\\n'+'\\n'.join(map(str,data)))\n    parsed=(int(row['value']) for row in csv.DictReader(source))\n    return sum(x for x in parsed if x!=sentinel[0])",
    sample: "[0,2,-99,5], [-99]",
    cases: [
      [[[0, 2, -99, 5], [-99]], 7],
      [[[0, 0, -5], [-5]], 0],
      [[[-3, -2], [-3]], -2],
      [[[], [0]], 0],
    ],
  },
  group: {
    functionName: "group_mean",
    signature: "values, labels, group",
    prompt:
      "按对齐的数值和类别列表，返回 labels 等于 group[0] 的 values 平均。若组为空，返回 0（仅本题约定）。",
    hint: "先筛选匹配标签，再按有效组大小除。",
    hand: "def group_mean(values, labels, group):\n    count=total=0\n    for value,label in zip(values,labels):\n        if label==group[0]:\n            total+=value\n            count+=1\n    return total/count if count else 0",
    library:
      "import pandas as pd\ndef group_mean(values, labels, group):\n    frame=pd.DataFrame({'v':values,'g':labels})\n    means=frame.groupby('g')['v'].mean()\n    return float(means.get(group[0],0))",
    packages: ["pandas"],
    sample: "[0,2,10,7], [1,1,2,2], [2]",
    cases: [
      [[[0, 2, 10, 7], [1, 1, 2, 2], [2]], 8.5],
      [[[4, 7], [0, 1], [2]], 0],
      [[[-2, 0, 2], [9, 9, 9], [9]], 0],
      [[[], [], [1]], 0],
    ],
  },
  missing: {
    functionName: "missing_median",
    signature: "values, sentinel",
    prompt: "有效观测数至少为 1。返回排除 sentinel[0] 后的中位数。",
    hint: "先排除缺测，再排序找中间位置。",
    hand: "def missing_median(values, sentinel):\n    x=sorted(v for v in values if v!=sentinel[0])\n    n=len(x)\n    return (x[(n-1)//2]+x[n//2])/2",
    library:
      "from statistics import median\ndef missing_median(values, sentinel):\n    return median(v for v in values if v!=sentinel[0])",
    sample: "[4,-99,9], [-99]",
    cases: [
      [[[4, -99, 9], [-99]], 6.5],
      [[[1, 1, 1], [-1]], 1],
      [[[-9, 4, -9], [-9]], 4],
      [[[2, 1, 9, 3], [-10]], 2.5],
    ],
  },
  standard: {
    functionName: "z_score",
    signature: "values, target",
    prompt:
      "基于 values 计算样本均值及样本标准差，返回 target[0] 的 z 值。标准差为 0 时返回 0。",
    hint: "样本标准差用 n−1 作分母。",
    hand: "from math import sqrt\ndef z_score(values, target):\n    avg=sum(values)/len(values)\n    dev=sqrt(sum((v-avg)**2 for v in values)/(len(values)-1))\n    return (target[0]-avg)/dev if dev else 0",
    library:
      "import numpy as np\ndef z_score(values, target):\n    a=np.asarray(values,dtype=float)\n    sd=float(a.std(ddof=1))\n    return (target[0]-float(a.mean()))/sd if sd else 0",
    packages: ["numpy"],
    sample: "[2,4,6], [8]",
    cases: [
      [[[2, 4, 6], [8]], 2],
      [[[1, 1, 1], [7]], 0],
      [[[0, 4, 8], [0]], -1],
      [[[5, 7, 9], [7]], 0],
    ],
  },
  dot: {
    functionName: "cosine",
    signature: "a, b",
    prompt: "计算 a 与 b 的余弦相似度。零向量返回 0 是本实验的检索约定。",
    hint: "先计算内积和两个二范数。",
    hand: "from math import sqrt\ndef cosine(a, b):\n    norm=sqrt(sum(v*v for v in a))*sqrt(sum(v*v for v in b))\n    return sum(x*y for x,y in zip(a,b))/norm if norm else 0",
    library:
      "import numpy as np\nfrom numpy.linalg import norm\ndef cosine(a, b):\n    denom=norm(a)*norm(b)\n    return float(np.dot(a,b)/denom) if denom else 0",
    packages: ["numpy"],
    sample: "[1,1], [2,2]",
    cases: [
      [
        [
          [1, 1],
          [2, 2],
        ],
        1,
      ],
      [
        [
          [1, 0],
          [-2, 0],
        ],
        -1,
      ],
      [
        [
          [0, 0],
          [4, 2],
        ],
        0,
      ],
      [
        [
          [1, 0],
          [0, 1],
        ],
        0,
      ],
    ],
  },
  softmax: {
    functionName: "first_probability",
    signature: "logits, heat",
    prompt: "使用 heat[0]>0 的温度和稳定 softmax，返回首个候选的概率。",
    hint: "先用全向量的最大值平移，防止指数溢出。",
    hand: "from math import exp\ndef first_probability(logits, heat):\n    m=max(logits)\n    vals=[exp((x-m)/heat[0]) for x in logits]\n    return vals[0]/sum(vals)",
    library:
      "import numpy as np\ndef first_probability(logits, heat):\n    a=np.asarray(logits,dtype=float)\n    p=np.exp((a-a.max())/heat[0])\n    return float(p[0]/p.sum())",
    packages: ["numpy"],
    sample: "[1000,1000,1000], [1]",
    cases: [
      [[[1000, 1000, 1000], [1]], 1 / 3],
      [[[0, 0], [0.5]], 0.5],
      [[[0, 1], [1]], 1 / (1 + Math.E)],
      [[[2, 0], [2]], Math.E / (1 + Math.E)],
    ],
  },
  linear: {
    functionName: "predict_line",
    signature: "x, y, query",
    prompt:
      "对拟合样本 x 与 y 求含截距的一维最小二乘直线，返回 query[0] 的预测。x 含至少两个不同值。",
    hint: "中心化后斜率为 Sxy/Sxx，再恢复截距。",
    hand: "def predict_line(x, y, query):\n    a,b=sum(x)/len(x),sum(y)/len(y)\n    w=sum((i-a)*(j-b) for i,j in zip(x,y))/sum((i-a)**2 for i in x)\n    return b+w*(query[0]-a)",
    library:
      "import numpy as np\nfrom sklearn.linear_model import LinearRegression\ndef predict_line(x, y, query):\n    model=LinearRegression().fit(np.array(x).reshape(-1,1),y)\n    return float(model.predict([[query[0]]])[0])",
    packages: ["scikit-learn"],
    sample: "[0,1,2], [1,3,5], [3]",
    cases: [
      [[[0, 1, 2], [1, 3, 5], [3]], 7],
      [[[1, 3], [9, 1], [2]], 5],
      [[[1, 2, 3], [7, 7, 7], [4]], 7],
      [[[0, 1, 2], [0, 3, 1], [1]], 4 / 3],
    ],
  },
  logistic: {
    functionName: "logistic_gradient",
    signature: "values, labels, weights",
    prompt:
      "二元逻辑模型 w=weights[0]、b=weights[1]。返回平均 BCE 对 w 的梯度，忽略正则。",
    hint: "logit 的梯度为 p−y，再通过 x 传到权重。",
    hand: "from math import exp\ndef logistic_gradient(values, labels, weights):\n    w,b=weights\n    return sum((1/(1+exp(-(w*x+b)))-y)*x for x,y in zip(values,labels))/len(values)",
    library:
      "import numpy as np\ndef logistic_gradient(values, labels, weights):\n    x=np.asarray(values,dtype=float)\n    y=np.asarray(labels,dtype=float)\n    w,b=weights\n    def loss(z):\n        logits=z*x+b\n        return np.mean(np.logaddexp(0,logits)-y*logits)\n    h=1e-5\n    return float((loss(w+h)-loss(w-h))/(2*h))",
    packages: ["numpy"],
    sample: "[2], [1], [0,0]",
    cases: [
      [[[2], [1], [0, 0]], -1],
      [
        [
          [1, 3],
          [0, 1],
          [0, 0],
        ],
        -0.5,
      ],
      [[[0], [1], [0, 2]], 0],
      [[[1], [0], [1, 0]], 1 / (1 + Math.exp(-1))],
    ],
  },
  knn: {
    functionName: "knn_mean",
    signature: "values, labels, parameters",
    prompt:
      "一维训练值与标签已对齐，parameters=[查询,k]。返回 k 个最近点标签的平均，同距离依输入先后。",
    hint: "排序键只用距离，Python 稳定排序会保留同距次序。",
    hand: "def knn_mean(values, labels, parameters):\n    query,k=parameters\n    inds=sorted(range(len(values)),key=lambda i:abs(values[i]-query))[:k]\n    return sum(labels[i] for i in inds)/k",
    library:
      "from heapq import nsmallest\nfrom statistics import mean\ndef knn_mean(values, labels, parameters):\n    query,k=parameters\n    ix=nsmallest(k,range(len(values)),key=lambda j:(abs(values[j]-query),j))\n    return mean(labels[i] for i in ix)",
    sample: "[0,2,4,8], [0,1,1,0], [3,3]",
    cases: [
      [
        [
          [0, 2, 4, 8],
          [0, 1, 1, 0],
          [3, 3],
        ],
        2 / 3,
      ],
      [
        [
          [0, 2],
          [4, 9],
          [1, 1],
        ],
        4,
      ],
      [
        [
          [-2, 3],
          [7, 1],
          [0, 2],
        ],
        4,
      ],
      [[[1], [8], [4, 1]], 8],
    ],
  },
  classification: {
    functionName: "f1_score",
    signature: "truth, prediction",
    prompt:
      "两个对齐的二元列表记录真实与预测。返回正类 F1，分母为 0 时返回 0（本题约定）。",
    hint: "用 2TP/(2TP+FP+FN)；真负不进分母。",
    hand: "def f1_score(truth, prediction):\n    tp=fp=fn=0\n    for a,b in zip(truth,prediction):\n        if a==b==1: tp+=1\n        elif b==1: fp+=1\n        elif a==1: fn+=1\n    d=2*tp+fp+fn\n    return 2*tp/d if d else 0",
    library:
      "from sklearn.metrics import f1_score as sklearn_f1\ndef f1_score(truth, prediction):\n    return float(sklearn_f1(truth,prediction,zero_division=0))",
    packages: ["scikit-learn"],
    sample: "[1,1,0,0], [1,0,0,1]",
    cases: [
      [
        [
          [1, 1, 0, 0],
          [1, 0, 0, 1],
        ],
        0.5,
      ],
      [
        [
          [0, 0],
          [0, 0],
        ],
        0,
      ],
      [
        [
          [1, 0],
          [1, 0],
        ],
        1,
      ],
      [
        [
          [1, 0, 0],
          [1, 1, 1],
        ],
        0.5,
      ],
    ],
  },
  cluster: {
    functionName: "inertia",
    signature: "x, centers",
    prompt:
      "一维值 x 与已知质心。给每个点分配最近质心，返回全部最短平方距离之和。",
    hint: "按点求最小距离平方再加总，不能对所有点只取一次最小。",
    hand: "def inertia(x, centers):\n    return sum(min((a-b)**2 for b in centers) for a in x)",
    library:
      "import numpy as np\ndef inertia(x, centers):\n    a=np.asarray(x,dtype=float)[:,None]\n    b=np.asarray(centers,dtype=float)[None,:]\n    return float(np.square(a-b).min(axis=1).sum())",
    packages: ["numpy"],
    sample: "[0,2,8,10], [1,9]",
    cases: [
      [
        [
          [0, 2, 8, 10],
          [1, 9],
        ],
        4,
      ],
      [
        [
          [1, 2],
          [1, 2],
        ],
        0,
      ],
      [[[], [1]], 0],
      [[[-3, 2], [0]], 13],
    ],
  },
  neural: {
    functionName: "first_gradient",
    signature: "input_and_hidden, output_and_target",
    prompt:
      "input_and_hidden=[x,h]，output_and_target=[输出权重 w2,预测 p,标签 y]。返回单隐藏单元 tanh 的第一层权重梯度。",
    hint: "输出误差 p−y，乘输出权重、tanh 导数和输入。",
    hand: "def first_gradient(input_and_hidden, output_and_target):\n    x,h=input_and_hidden\n    w2,p,y=output_and_target\n    return (p-y)*w2*(1-h*h)*x",
    library:
      "import numpy as np\ndef first_gradient(input_and_hidden, output_and_target):\n    x,h=input_and_hidden\n    w2,p,y=output_and_target\n    if h in (-1,1) or x==0: return 0.0\n    z=np.arctanh(h)\n    b=np.log(p/(1-p))-w2*h\n    def logloss(dw):\n        logit=b+w2*np.tanh(z+dw*x)\n        return np.logaddexp(0,logit)-y*logit\n    return float((logloss(1e-5)-logloss(-1e-5))/(2e-5))",
    packages: ["numpy"],
    sample: "[3,.5], [2,.75,1]",
    cases: [
      [
        [
          [3, 0.5],
          [2, 0.75, 1],
        ],
        -1.125,
      ],
      [
        [
          [4, 0],
          [1, 0.8, 1],
        ],
        -0.8,
      ],
      [
        [
          [0, 0.2],
          [2, 0.5, 0],
        ],
        0,
      ],
      [
        [
          [2, 1],
          [2, 0.75, 0],
        ],
        0,
      ],
    ],
  },
};
export function codeLesson(id: string) {
  const item = programs[id];
  if (!item) return undefined;
  const call =
    "\n\nprint(round(" + item.functionName + "(" + item.sample + "), 8))";
  const question: Extract<Question, { type: "program" }> = {
    id: "p3-code-" + id,
    type: "program",
    level: "transfer",
    prompt: item.prompt,
    hint: item.hint,
    explanation: "真实执行结果符合所有测试向量。",
    functionName: item.functionName,
    starter:
      "def " +
      item.functionName +
      "(" +
      item.signature +
      "):\n    # 写出实现\n    return None",
    cases: item.cases.map(([args, expected]) => ({ args, expected })),
    tolerance: item.tolerance ?? 1e-6,
  };
  return {
    scratch: item.hand + call,
    library: item.library + call,
    packages: item.packages,
    question,
  };
}
export const p3CodeKeys = Object.keys(programs);
