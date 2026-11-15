import { evalGate, type Bit, type GateId } from "./gates";

/** 半加器里允许选的门（NOT 只有一个输入，不能用来加两个数）。 */
export type AdderGate = Extract<GateId, "and" | "or" | "xor">;
export const adderGates: AdderGate[] = ["and", "or", "xor"];

export type AdderOut = { sum: Bit; carry: Bit };

/** 正确答案：两个 1 位数相加，得到「和」和「进位」。 */
export function expectedAdd(a: Bit, b: Bit): AdderOut {
  const total = a + b;
  return { sum: (total % 2) as Bit, carry: total >= 2 ? 1 : 0 };
}

export function circuitOutput(sumGate: AdderGate, carryGate: AdderGate, a: Bit, b: Bit): AdderOut {
  return { sum: evalGate(sumGate, a, b), carry: evalGate(carryGate, a, b) };
}

/** 把结果写成二进制：先进位，再和。例如 1 + 1 → "10"。 */
export const asBinary = (o: AdderOut): string => `${o.carry}${o.sum}`;

export type CaseResult = { a: Bit; b: Bit; expected: AdderOut; actual: AdderOut; pass: boolean };

const CASES: [Bit, Bit][] = [[0, 0], [0, 1], [1, 0], [1, 1]];

export function runTests(sumGate: AdderGate, carryGate: AdderGate): CaseResult[] {
  return CASES.map(([a, b]) => {
    const expected = expectedAdd(a, b);
    const actual = circuitOutput(sumGate, carryGate, a, b);
    return { a, b, expected, actual, pass: expected.sum === actual.sum && expected.carry === actual.carry };
  });
}

/** 反馈：指出第一个不对的输入，并说明是「和」还是「进位」这一位出了问题。 */
export function testFeedback(results: CaseResult[]): { ok: boolean; message: string } {
  const failing = results.filter((r) => !r.pass);
  if (failing.length === 0)
    return { ok: true, message: "四种输入全部正确：这个电路能做 1 位加法。「和」用 XOR，「进位」用 AND。" };
  const first = failing[0] as CaseResult;
  const wrong: string[] = [];
  if (first.expected.sum !== first.actual.sum) wrong.push("和");
  if (first.expected.carry !== first.actual.carry) wrong.push("进位");
  return {
    ok: false,
    message:
      `有 ${failing.length} 种输入不对。先看 A=${first.a}，B=${first.b}：` +
      `${first.a} + ${first.b} 应该得到 ${asBinary(first.expected)}（进位 ${first.expected.carry}，和 ${first.expected.sum}），` +
      `你的电路得到 ${asBinary(first.actual)}（进位 ${first.actual.carry}，和 ${first.actual.sum}），` +
      `「${wrong.join("」和「")}」这一位不对。`,
  };
}
