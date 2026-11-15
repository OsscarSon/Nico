export type GateId = "and" | "or" | "not" | "xor";
export type Bit = 0 | 1;

export const gateInfo: Record<GateId, { name: string; arity: 1 | 2; rule: string }> = {
  and: { name: "AND", arity: 2, rule: "两个输入都是 1，输出才是 1。" },
  or: { name: "OR", arity: 2, rule: "只要有一个输入是 1，输出就是 1（两个都是 1 也是 1）。" },
  not: { name: "NOT", arity: 1, rule: "把输入反过来：0 变 1，1 变 0。" },
  xor: { name: "XOR", arity: 2, rule: "两个输入不一样时输出 1，一样时输出 0。" },
};

export const allGates: GateId[] = ["and", "or", "not", "xor"];

export function evalGate(g: GateId, a: Bit, b: Bit = 0): Bit {
  switch (g) {
    case "and": return a === 1 && b === 1 ? 1 : 0;
    case "or": return a === 1 || b === 1 ? 1 : 0;
    case "not": return a === 1 ? 0 : 1;
    case "xor": return a !== b ? 1 : 0;
  }
}

/** 一个门的所有输入组合，按二进制顺序（00、01、10、11）。 */
export function inputRows(g: GateId): Bit[][] {
  return gateInfo[g].arity === 1
    ? [[0], [1]]
    : [[0, 0], [0, 1], [1, 0], [1, 1]];
}

export const rowKey = (inputs: Bit[]): string => inputs.join("");

export function truthTable(g: GateId): { inputs: Bit[]; out: Bit }[] {
  return inputRows(g).map((inputs) => ({
    inputs,
    out: evalGate(g, inputs[0] as Bit, (inputs[1] ?? 0) as Bit),
  }));
}

const describeInputs = (inputs: Bit[]): string =>
  inputs.length === 1 ? `A=${inputs[0]}` : `A=${inputs[0]}，B=${inputs[1]}`;

/**
 * 猜"神秘门"的反馈。答错时指出一条和猜测矛盾的、学习者自己观察到的那一行，
 * 让他知道错在哪里，而不是只说"不对"。
 */
export function identifyFeedback(
  truth: GateId,
  guess: GateId,
  observed: Iterable<string>,
): { ok: boolean; message: string } {
  const g = gateInfo[guess];
  if (guess === truth) return { ok: true, message: `对了，这是 ${g.name}。${g.rule}` };

  const t = gateInfo[truth];
  if (g.arity !== t.arity) {
    return {
      ok: false,
      message:
        t.arity === 1
          ? `不是 ${g.name}：这个神秘门只有一个输入，而 ${g.name} 有两个输入。`
          : `不是 ${g.name}：这个神秘门有两个输入，而 ${g.name} 只有一个输入。`,
    };
  }
  const seen = new Set(observed);
  const row = truthTable(truth).find(
    (r) =>
      seen.has(rowKey(r.inputs)) &&
      evalGate(guess, r.inputs[0] as Bit, (r.inputs[1] ?? 0) as Bit) !== r.out,
  );
  if (!row)
    return { ok: false, message: `还不能确定。再多试几种输入，看看有没有和 ${g.name} 对不上的地方。` };
  const expected = evalGate(guess, row.inputs[0] as Bit, (row.inputs[1] ?? 0) as Bit);
  return {
    ok: false,
    message: `不是 ${g.name}：${g.name} 在 ${describeInputs(row.inputs)} 时应该输出 ${expected}，但你看到的是 ${row.out}。`,
  };
}
