import { describe, it, expect } from "vitest";
import {
  answerFor, challengePrograms, data, freeProgram, initMachine, ins, runToHalt, step,
  traceSummary, instrText, RESULT_CELL, type Cell,
} from "../src/grading/cpu";

const filler = (n: number): Cell[] => Array.from({ length: n }, () => data(0));

describe("mini CPU", () => {
  it("free program computes 5 + 3 = 8 into cell 8", () => {
    const m = runToHalt(freeProgram());
    expect(m.mem[RESULT_CELL]).toEqual(data(8));
    expect(m.halted).toBe(true);
    expect(m.error).toBe(null);
  });
  it("4 instructions x 3 phases = 12 steps (the transfer answer)", () => {
    expect(runToHalt(freeProgram()).steps).toBe(12);
  });
  it("phases go fetch, decode, execute, fetch...", () => {
    let m = initMachine(freeProgram());
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) { seen.push(m.phase); m = step(m); }
    expect(seen).toEqual(["fetch", "decode", "execute", "fetch", "decode", "execute"]);
  });
  it("fetch loads IR and increments PC; decode and execute do not move PC", () => {
    let m = initMachine(freeProgram());
    m = step(m);
    expect(m.pc).toBe(1);
    expect(m.ir && instrText(m.ir)).toBe("LOAD 6");
    expect(m.highlight.fetched).toBe(0);
    const pcAfterFetch = m.pc;
    m = step(m); m = step(m);
    expect(m.pc).toBe(pcAfterFetch);
    expect(m.acc).toBe(5);
  });
  it("step does not mutate the previous state", () => {
    const a = initMachine(freeProgram());
    const snapshot = JSON.stringify(a);
    step(step(step(a)));
    expect(JSON.stringify(a)).toBe(snapshot);
  });
  it("a halted machine stays put", () => {
    const m = runToHalt(freeProgram());
    expect(step(m)).toBe(m);
  });
  it("challenge answers come from running the model: 8, 11, 10", () => {
    expect(challengePrograms.map(answerFor)).toEqual([8, 11, 10]);
  });
  it("program 3 is the trap: STORE 7 overwrites the 3 before ADD 7 reads it", () => {
    const p3 = challengePrograms[2]!;
    expect(answerFor(p3)).toBe(10);
    expect(answerFor(p3)).not.toBe(8);
    expect(traceSummary(p3.mem)).toEqual([
      "LOAD 6：ACC 变成 5",
      "STORE 7：第 7 格变成 5",
      "ADD 7：ACC 变成 10",
      "STORE 8：第 8 格变成 10",
    ]);
  });
  it("ADD wraps to 8 bits and says so", () => {
    const mem = [ins("LOAD", 3), ins("ADD", 4), ins("HALT"), data(250), data(10), ...filler(5)];
    const m = runToHalt(mem);
    expect(m.acc).toBe(4); // 260 & 255
    // 溢出提示出现在 ADD 的执行步骤
    let t = initMachine(mem);
    let note = "";
    while (!t.halted) { t = step(t); if (t.note.includes("超过 8 位")) note = t.note; }
    expect(note).toContain("只留下低 8 位");
  });
  it("running into a data cell as an instruction is an error, not a crash", () => {
    const m = runToHalt([ins("LOAD", 2), data(7), data(9), ...filler(5)]);
    expect(m.halted).toBe(true);
    expect(m.error).toContain("第 1 格");
    expect(m.error).toContain("数据");
  });
  it("PC running off the end of memory is an error", () => {
    const m = runToHalt([ins("LOAD", 1), data(1)]);
    expect(m.error).not.toBe(null);
  });
  it("reading an instruction cell as data is an error", () => {
    const m = runToHalt([ins("LOAD", 1), ins("HALT")]);
    expect(m.error).toContain("放的是指令");
  });
  it("an address outside memory is an error", () => {
    const m = runToHalt([ins("LOAD", 99), ins("HALT")]);
    expect(m.error).toContain("不存在");
  });
  it("every program terminates: with no jump instruction PC only moves forward", () => {
    // 内存只有 10 格，PC 每次取指加 1，所以最多 10 条指令之内一定停下（HALT 或出错）
    const mem = [ins("LOAD", 9), ins("ADD", 9), ins("ADD", 9), ins("STORE", 9), ...filler(5), data(1)];
    const m = runToHalt(mem);
    expect(m.halted).toBe(true);
    expect(m.steps < 10 * 3 + 1).toBe(true);
  });
});
