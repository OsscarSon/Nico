import { useState } from "react";
import { compareOutputs } from "../../../grading/academy2/p15/python";
import TeachingPython from "./TeachingPython";

const examples: Record<string, [string, string, string]> = {
  "fs-variance": [
    "样本方差",
    "data = [2,4,6,8]\nmean = sum(data) / len(data)\nprint(round(sum((x - mean)**2 for x in data) / (len(data)-1), 6))",
    "from statistics import variance\ndata = [2,4,6,8]\nprint(round(variance(data), 6))",
  ],
  "fs-mean": [
    "算术均值",
    "data = [1,3,8]\nprint(sum(data) / len(data))",
    "from statistics import mean\ndata = [1,3,8]\nprint(mean(data))",
  ],
  "im-number-theory": [
    "最大公因数",
    "a,b = 35,12\nwhile b:\n    a,b = b,a%b\nprint(a)",
    "from math import gcd\nprint(gcd(35,12))",
  ],
  "im-counting": [
    "组合数",
    "n,k = 7,3\nf = lambda m: 1 if m == 0 else m*f(m-1)\nprint(f(n)//(f(k)*f(n-k)))",
    "from math import comb\nprint(comb(7,3))",
  ],
  "fm-dot": [
    "向量点积",
    "u,v = [1,2,3],[4,5,6]\nprint(sum(x*y for x,y in zip(u,v)))",
    "import operator\nprint(sum(map(operator.mul, [1,2,3], [4,5,6])))",
  ],
  "is-regression": [
    "简单回归斜率",
    "x,y=[0,1,2],[1,3,4]\nx0=sum(x)/len(x)\ny0=sum(y)/len(y)\nprint(sum((a-x0)*(b-y0) for a,b in zip(x,y))/sum((a-x0)**2 for a in x))",
    "from statistics import linear_regression\nprint(linear_regression([0,1,2],[1,3,4]).slope)",
  ],
};
export default function CodeComparison({ id }: { id: string }) {
  const [outputs, setOutputs] = useState<(string | null)[]>([null, null]);
  const [open, setOpen] = useState(false);
  const model = examples[id];
  if (!model) return null;
  const mark = (i: number, value: string | null) =>
    setOutputs((old) => old.map((text, j) => (i === j ? value : text)));
  const equal = outputs[0] != null && outputs[1] != null && compareOutputs(outputs[0], outputs[1]);
  return (
    <details
      className="a2-panel"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpen(true);
      }}
    >
      <summary>双栏运行对照 · {model[0]}</summary>
      <p>两栏使用同一组初始数据。修改时请同步改两边输入，分别执行后检查输出。</p>
      {open && (
        <div className="a2-two-col">
          {(["From Scratch", "Real-world Library"] as const).map((title, i) => (
            <div key={title}>
              <h3>{title}</h3>
              <TeachingPython
                initial={model[i + 1]!}
                onChangeCode={() => mark(i, null)}
                onResult={(run) =>
                  mark(
                    i,
                    run.error || run.loadError || run.timedOut || run.stopped || run.truncated
                      ? null
                      : run.stdout.trim() || null,
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
      <p role="status">
        {outputs.every((x) => x !== null)
          ? equal
            ? "两次真实运行结果一致。"
            : "两次真实运行结果不同，请核对输入和格式。"
          : "两栏均成功运行后比较标准输出。单个数字允许浮点舍入误差。"}
      </p>
    </details>
  );
}
