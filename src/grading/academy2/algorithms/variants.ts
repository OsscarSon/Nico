import type { Question } from "../../../content/academy2/teaching/schema";
import { modelById } from "./index";
import type { Scalar } from "./trace";

type Challenge = {
  input: string;
  parameter: string;
  objective: string;
  format?: string;
};
const array = (values: number[]) => values.join(",");
function problem(id: string, seed: number): Challenge {
  let state = seed >>> 0;
  const pick = (count: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * count);
  };
  const a = Array.from({ length: 5 + pick(3) }, () => pick(19) - 7);
  const n = a.length,
    left = pick(n - 2),
    right = left + 2 + pick(n - left - 1);
  const w = 1 + pick(7),
    v = 1 + pick(8),
    index = pick(n),
    target = a[index]!;
  const graph = `A>B:${w + v + 2},A>C:${w},C>B:${v},B>D:2,C>D:${v + 5}`;
  switch (id) {
    case "invariant":
      return {
        input: array(a),
        parameter: String(target),
        objective: "数出大于等于阈值的元素",
      };
    case "cost":
      return {
        input: String(n + pick(9)),
        parameter: seed % 2 ? "三角" : "折半",
        objective: "给出循环体的总执行次数",
      };
    case "linear":
      return {
        input: array(a),
        parameter: String(seed % 3 ? target : 999),
        objective: "给出首个匹配的零基下标，未找到写 −1",
      };
    case "binary":
      return {
        input: array([...new Set(a)].sort((a, b) => a - b)),
        parameter: String(seed % 3 ? target : 999),
        objective: "给出目标的零基下标，未找到写 −1",
      };
    case "sort":
      return {
        input: array(a),
        parameter: seed % 2 ? "选择" : "归并",
        objective: "写出升序结果",
        format: "使用逗号分隔",
      };
    case "hash":
      return {
        input: array(a),
        parameter: String(2 + pick(5)),
        objective: "给出插入不同键时落入非空桶的次数",
      };
    case "recursive":
      return {
        input: String(1 + pick(7)),
        parameter: seed % 2 ? "阶乘" : "斐波那契",
        objective: "计算递归的返回值",
      };
    case "bfs":
      return {
        input: seed % 2 ? "A>B,A>C,B>D,D>F,C>F" : "A>B,B>C,C>D,D>F",
        parameter: seed % 3 ? "A,F" : "A,D",
        objective: "给出到目标的最少边数",
      };
    case "dijkstra":
      return {
        input: graph,
        parameter: seed % 2 ? "A,D" : "A,B",
        objective: "求指定端点之间的最短距离",
      };
    case "bellman":
      return {
        input: `A>B:9,A>C:${w},C>B:${-v},B>D:${v + 2}`,
        parameter: seed % 2 ? "A,D" : "A,B",
        objective: "求指定端点之间的最短距离，可以是负数",
      };
    case "mst":
      return {
        input: `A-B:${w},B-C:${v},C-D:2,A-D:${w + v + 3}`,
        parameter: "",
        objective: "给出最小生成树总权重",
      };
    case "heap":
      return {
        input: array(a),
        parameter: String(1 + pick(4)),
        objective: "按弹出顺序写出最小堆弹出的值",
        format: "使用逗号分隔",
      };
    case "prefix":
      return {
        input: array(a),
        parameter: `${left},${right}`,
        objective: "给出左闭右开区间的和",
      };
    case "fenwick":
    case "segment":
      return {
        input: array(a),
        parameter: `u:${left}:${v},q:${left}:${right}`,
        objective: "先替换元素，再计算所给左闭右开区间和",
      };
    case "window":
      return {
        input: array(a),
        parameter: String(2 + pick(n - 1)),
        objective: "求固定宽度的最大窗口和",
      };
    case "greedy":
      return {
        input: `0,${w};${w},${w + v};1,${w + 2};${w + v},${w + v + 2}`,
        parameter: "",
        objective: "求最多能选几个区间。两个区间可以端点相接",
      };
    case "dp":
      return {
        input: `2,${w};3,${v};4,${w + v}`,
        parameter: String(2 + pick(8)),
        objective: "每件物品至多选择一次，求不超容量的最大价值",
      };
    case "kmp":
      return {
        input: "a".repeat(2 + pick(5)) + "b" + "a".repeat(2 + pick(5)),
        parameter: "a".repeat(2 + pick(3)),
        objective: "写出模式的所有零基匹配下标，允许重叠。若没有匹配，写「无」",
        format: "使用逗号分隔",
      };
    case "flow":
      return {
        input: `S>A:${w},S>B:${v},A>T:${w + 1},B>T:${v + 1},A>B:1`,
        parameter: "S,T",
        objective: "求最大流量",
      };
    case "dfa":
      return {
        input: `${pick(2)}${pick(2)}${pick(2)}${pick(2)}${seed % 3 === 0 ? "101" : "00"}`,
        parameter: "",
        objective: "该串是否被识别后缀 101 的 DFA 接受？写「接受」或「拒绝」",
      };
    case "certificate":
      return {
        input: array(a),
        parameter: `${seed % 2 ? a[0]! + a[2]! : 999}:0,2`,
        objective:
          "核验给定目标和所选下标是否构成有效子集和证书，写「有效」或「无效」",
      };
    default: {
      const m = modelById(id)!;
      return {
        input: m.input,
        parameter: m.parameter ?? "",
        objective: "写出该输入的最终结果",
        format: "按例题约定写出数值、逗号分隔列表或状态名称",
      };
    }
  }
}

const featured = new Set([
  "invariant",
  "cost",
  "linear",
  "binary",
  "sort",
  "hash",
  "recursive",
  "bfs",
  "dijkstra",
  "bellman",
  "mst",
  "heap",
  "prefix",
  "fenwick",
  "segment",
  "window",
  "greedy",
  "dp",
  "kmp",
  "flow",
  "dfa",
  "certificate",
]);

function answerText(value: Scalar): string[] {
  return value === ""
    ? ["无"]
    : String(value).includes(",")
      ? [String(value), String(value).replaceAll(",", "，")]
      : [String(value)];
}
export function algorithmVariant(
  id: string,
  seed: number,
  verification = false,
): Question | undefined {
  if (!featured.has(id)) return undefined;
  const challenge = problem(id, seed),
    model = modelById(id)!;
  const outcome = model.run(challenge.input, challenge.parameter).answer;
  const base = {
    id: (verification ? "verify-" : "variant-") + id + "-" + seed,
    level: verification ? ("transfer" as const) : ("application" as const),
    prompt:
      challenge.objective +
      "。" +
      model.label +
      "为「" +
      challenge.input +
      "」。" +
      (model.parameterLabel ? "参数为「" + challenge.parameter + "」。" : "") +
      (challenge.format ?? ""),
    hint: "先识别题目约定的边界、下标和输出，再找相应的不变量。",
    explanation: "核验通过。对照定义重新说明结果时，留意输入条件和输出约定。",
  };
  return typeof outcome === "number"
    ? { ...base, type: "number", answer: outcome, tolerance: 0 }
    : { ...base, type: "text", answer: answerText(outcome) };
}
