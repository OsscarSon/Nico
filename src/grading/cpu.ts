/**
 * 迷你 CPU 模型（教学用）。思路参考经典的教学模型 Little Man Computer：
 * 内存是一排编号的格子，CPU 反复做「取指 → 译码 → 执行」。
 * 指令为了好读，直接写成文字；寄存器只有 PC、IR、ACC。
 */
export type Op = "LOAD" | "ADD" | "STORE" | "HALT";
export type Instr = { op: Op; arg?: number };
export type Cell = { kind: "instr"; op: Op; arg?: number } | { kind: "data"; value: number };
export type Phase = "fetch" | "decode" | "execute";

export const WORD_MAX = 255; // 8 位：和 A01 一样，最大 255

export type Highlight = { fetched?: number; read?: number; write?: number };

export type Machine = {
  mem: Cell[];
  pc: number;
  ir: Instr | null;
  acc: number;
  /** 下一次 step 要做的阶段 */
  phase: Phase;
  halted: boolean;
  error: string | null;
  steps: number;
  note: string;
  highlight: Highlight;
};

export const ins = (op: Op, arg?: number): Cell => (arg === undefined ? { kind: "instr", op } : { kind: "instr", op, arg });
export const data = (value: number): Cell => ({ kind: "data", value });

export const instrText = (i: Instr): string => (i.arg === undefined ? i.op : `${i.op} ${i.arg}`);
export const cellText = (c: Cell): string => (c.kind === "instr" ? instrText(c) : String(c.value));
export const phaseName: Record<Phase, string> = { fetch: "取指", decode: "译码", execute: "执行" };

export function initMachine(mem: Cell[]): Machine {
  return {
    mem: mem.map((c) => ({ ...c })),
    pc: 0, ir: null, acc: 0, phase: "fetch", halted: false, error: null, steps: 0,
    note: "准备好了：PC 指向第 0 格。点「下一步」开始取指。", highlight: {},
  };
}

const meaning = (i: Instr): string => {
  switch (i.op) {
    case "LOAD": return `把第 ${i.arg} 格里的数拿到 ACC。`;
    case "ADD": return `把第 ${i.arg} 格里的数加到 ACC 上。`;
    case "STORE": return `把 ACC 里的数放进第 ${i.arg} 格。`;
    case "HALT": return "停止。";
  }
};

const fail = (m: Machine, message: string): Machine => ({
  ...m, halted: true, error: message, note: message, steps: m.steps + 1, highlight: {},
});

/** 走一个阶段。返回新状态，不修改旧状态。 */
export function step(m: Machine): Machine {
  if (m.halted) return m;

  if (m.phase === "fetch") {
    const cell = m.mem[m.pc];
    if (!cell) return fail(m, `出错：PC 是 ${m.pc}，超出了内存范围。`);
    if (cell.kind === "data")
      return fail(m, `出错：PC 指到第 ${m.pc} 格，那里放的是数据 ${cell.value}，不是指令。CPU 没法把数据当指令执行。`);
    const ir: Instr = cell.arg === undefined ? { op: cell.op } : { op: cell.op, arg: cell.arg };
    return {
      ...m, ir, pc: m.pc + 1, phase: "decode", steps: m.steps + 1, highlight: { fetched: m.pc },
      note: `取指：PC 指向第 ${m.pc} 格，把那里的指令「${instrText(ir)}」放进 IR，然后 PC 加 1，变成 ${m.pc + 1}。`,
    };
  }

  const ir = m.ir as Instr;
  if (m.phase === "decode")
    return {
      ...m, phase: "execute", steps: m.steps + 1, highlight: {},
      note: `译码：IR 里是「${instrText(ir)}」，意思是${meaning(ir)}`,
    };

  // execute
  const addr = ir.arg;
  if (ir.op === "HALT")
    return { ...m, halted: true, steps: m.steps + 1, highlight: {}, note: "执行：HALT，CPU 停止。" };

  if (addr === undefined || addr < 0 || addr >= m.mem.length)
    return fail(m, `出错：「${instrText(ir)}」指向的第 ${addr} 格不存在。`);

  if (ir.op === "STORE") {
    const mem = m.mem.slice();
    mem[addr] = data(m.acc);
    return {
      ...m, mem, phase: "fetch", steps: m.steps + 1, highlight: { write: addr },
      note: `执行：把 ACC 里的 ${m.acc} 写进第 ${addr} 格。`,
    };
  }

  const cell = m.mem[addr] as Cell;
  if (cell.kind === "instr")
    return fail(m, `出错：第 ${addr} 格放的是指令，不是数据，没法拿来计算。`);

  if (ir.op === "LOAD")
    return {
      ...m, acc: cell.value, phase: "fetch", steps: m.steps + 1, highlight: { read: addr },
      note: `执行：读第 ${addr} 格得到 ${cell.value}，放进 ACC。`,
    };

  // ADD：8 位，超过 255 只留低 8 位（和 A01 的 8 个开关一样装不下）
  const raw = m.acc + cell.value;
  const acc = raw & WORD_MAX;
  return {
    ...m, acc, phase: "fetch", steps: m.steps + 1, highlight: { read: addr },
    note:
      raw > WORD_MAX
        ? `执行：读第 ${addr} 格得到 ${cell.value}，ACC ${m.acc} + ${cell.value} = ${raw}，超过 8 位能装的 255，只留下低 8 位，ACC 变成 ${acc}。`
        : `执行：读第 ${addr} 格得到 ${cell.value}，ACC ${m.acc} + ${cell.value} = ${acc}。`,
  };
}

export function runToHalt(mem: Cell[], maxSteps = 300): Machine {
  let m = initMachine(mem);
  while (!m.halted && m.steps < maxSteps) m = step(m);
  return m;
}

/** 每条指令执行后的变化，用来在答对后讲解"为什么是这个结果"。 */
export function traceSummary(mem: Cell[]): string[] {
  let m = initMachine(mem);
  const lines: string[] = [];
  while (!m.halted && m.steps < 300) {
    const before = m;
    m = step(m);
    if (before.phase === "execute" && before.ir && before.ir.op !== "HALT") {
      const t = instrText(before.ir);
      lines.push(
        before.ir.op === "STORE"
          ? `${t}：第 ${before.ir.arg} 格变成 ${m.acc}`
          : `${t}：ACC 变成 ${m.acc}`,
      );
    }
  }
  return lines;
}

/** 内存共 10 格：0–5 放指令，6–9 放数据。 */
const blank = (): Cell[] => [data(0), data(0), data(0), data(0), data(0), data(0), data(0), data(0), data(0), data(0)];
const program = (instrs: Cell[], datas: Record<number, number>): Cell[] => {
  const mem = blank();
  instrs.forEach((c, i) => { mem[i] = c; });
  for (const [a, v] of Object.entries(datas)) mem[Number(a)] = data(v);
  return mem;
};

/** 自由练习：6 号 + 7 号，结果放进 8 号。 */
export const freeProgram = (): Cell[] =>
  program([ins("LOAD", 6), ins("ADD", 7), ins("STORE", 8), ins("HALT")], { 6: 5, 7: 3 });

export const RESULT_CELL = 8;

export type ChallengeProgram = { id: string; title: string; mem: Cell[] };
export const challengePrograms: ChallengeProgram[] = [
  { id: "p1", title: "程序 1", mem: freeProgram() },
  {
    id: "p2", title: "程序 2",
    mem: program([ins("LOAD", 6), ins("ADD", 7), ins("ADD", 7), ins("STORE", 8), ins("HALT")], { 6: 5, 7: 3 }),
  },
  {
    // 陷阱：STORE 7 会把第 7 格的 3 覆盖成 5，后面的 ADD 7 加的就是 5
    id: "p3", title: "程序 3",
    mem: program([ins("LOAD", 6), ins("STORE", 7), ins("ADD", 7), ins("STORE", 8), ins("HALT")], { 6: 5, 7: 3 }),
  },
];

/** 正确答案由模型实际运行得出，不手写。 */
export const answerFor = (p: ChallengeProgram): number => {
  const cell = runToHalt(p.mem).mem[RESULT_CELL];
  return cell?.kind === "data" ? cell.value : NaN;
};
