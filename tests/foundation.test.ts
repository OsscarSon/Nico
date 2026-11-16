import { describe, it, expect } from "vitest";
import { initialMemory, memoryStep, memoryGoals, type MemoryAction } from "../src/grading/memory";
import { initialOs, osStep, osGoals, type OsAction } from "../src/grading/os";
import { initialTerminal, terminalStep, terminalGoals, resolvePath, tokenize } from "../src/grading/terminal";
import { lessons, nextAvailableAfter } from "../src/content";
import { lessonSchema } from "../src/content/schema";
import { gradeChoice, gradeNumber } from "../src/grading/quiz";

const memoryRun = (actions: MemoryAction[]) => actions.reduce(memoryStep, initialMemory());
const osRun = (actions: OsAction[]) => actions.reduce(osStep, initialOs());
const terminalRun = (lines: string[]) => lines.reduce(terminalStep, initialTerminal());
describe("A06 memory model", () => {
  it("requires opening a document before edits, save or reads", () => {
    for (const action of ["edit", "save", "read"] as const) {
      const s = memoryStep(initialMemory(), action);
      expect(s.ram).toBeNull(); expect(s.disk).toBe("原稿"); expect(s.note).toContain("先打开");
    }
  });
  it("unsaved changes are lost after power loss, saved data survives", () => {
    expect(memoryRun(["open", "edit", "restart", "open"]).ram).toBe("原稿");
    expect(memoryRun(["open", "edit", "save", "restart", "open"]).ram).toBe("修改稿");
  });
  it("reads miss then hit; writes invalidate cached copies", () => {
    const s = memoryRun(["open", "read", "read"]);
    expect(s.hits).toBe(1); expect(s.cache).toBe("原稿");
    const edited = memoryStep(s, "edit");
    expect(edited.cache).toBeNull(); expect(edited.disk).toBe("原稿");
    const read = memoryStep(edited, "read");
    expect(read.cache).toBe("修改稿"); expect(read.hits).toBe(1);
    expect(memoryStep(read, "restart").cache).toBeNull();
  });
  it("challenge cannot pass by saving or restarting alone", () => {
    for (const s of [initialMemory(), memoryRun(["open", "edit", "save"]), memoryRun(["restart", "open", "read", "read"])]) expect(memoryGoals(s).every(g => g.ok)).toBe(false);
    expect(memoryGoals(memoryRun(["open", "edit", "save", "restart", "open", "read", "read"])).every(g => g.ok)).toBe(true);
  });
  it("preserves prior snapshots", () => { const s = initialMemory(); const before = structuredClone(s); memoryStep(s, "open"); expect(s).toEqual(before); });
});
describe("A07 operating system model", () => {
  it("only one process owns the CPU, and only that process advances", () => {
    const s = osRun([{ type: "dispatch", pid: "browser" }, { type: "tick" }, { type: "dispatch", pid: "editor" }, { type: "tick" }]);
    expect(s.processes).toEqual({ browser: "ready", editor: "running" }); expect(s.work).toEqual({ browser: 1, editor: 1 });
    expect(osStep(initialOs(), { type: "tick" }).work).toEqual({ browser: 0, editor: 0 });
  });
  it("waiting cannot be scheduled until I/O completes; wake returns to ready", () => {
    const s = osRun([{ type: "dispatch", pid: "browser" }, { type: "wait", pid: "browser" }, { type: "dispatch", pid: "editor" }]);
    expect(osStep(s, { type: "dispatch", pid: "browser" }).processes).toEqual(s.processes);
    const awake = osStep(s, { type: "wake", pid: "browser" });
    expect(awake.processes).toEqual({ browser: "ready", editor: "running" });
  });
  it("rejects invalid I/O transitions and stopped process dispatch", () => {
    expect(osStep(initialOs(), { type: "wait", pid: "browser" }).processes.browser).toBe("ready");
    expect(osRun([{ type: "stop", pid: "editor" }, { type: "dispatch", pid: "editor" }]).processes.editor).toBe("stopped");
    expect(osStep(initialOs(), { type: "wake", pid: "browser" }).processes.browser).toBe("ready");
  });
  it("writing needs a running editor; read-only denial never changes the file", () => {
    expect(osStep(initialOs(), { type: "write", file: "notes" }).notes).toBe("原文");
    const s = osRun([{ type: "dispatch", pid: "editor" }, { type: "write", file: "system" }, { type: "write", file: "notes" }]);
    expect(s.system).toBe("受保护配置"); expect(s.denied).toBe(1); expect(s.notes).toBe("新笔记");
  });
  it("checks all challenge goals from actual state", () => {
    expect(osGoals(initialOs()).some(g => g.ok)).toBe(false);
    const s = osRun([{ type: "dispatch", pid: "browser" }, { type: "wait", pid: "browser" }, { type: "dispatch", pid: "editor" }, { type: "tick" }, { type: "write", file: "notes" }, { type: "write", file: "system" }]);
    expect(osGoals(s).every(g => g.ok)).toBe(true);
    expect(osGoals(osStep(s, { type: "wake", pid: "browser" })).every(g => g.ok)).toBe(false);
  });
  it("does not mutate old process or work objects", () => { const s = initialOs(); const before = structuredClone(s); osStep(s, { type: "dispatch", pid: "editor" }); expect(s).toEqual(before); });
});
describe("A08 virtual terminal", () => {
  it.each([
    ["/home/nico", "projects/./demo/..", "/home/nico/projects"],
    ["/home/nico/projects", "../README.txt", "/home/nico/README.txt"],
    ["/home/nico", "/../../home/nico", "/home/nico"],
  ])("resolves %s + %s", (cwd, path, expected) => expect(resolvePath(cwd, path)).toBe(expected));
  it("supports quoted names without invoking shell expansion", () => {
    expect(tokenize('cp "my notes.txt" \'new notes.txt\'')).toEqual(["cp", "my notes.txt", "new notes.txt"]);
    expect(terminalRun(['mkdir "my notes"', 'cd "my notes"', "pwd"]).cwd).toBe("/home/nico/my notes");
  });
  it.each(["mkdir bad; pwd", "ls | cat", "cat < README.txt", "touch > out", "$(pwd)", "`pwd`", "cd \"unclosed"]) ("rejects unsupported syntax: %s", line => {
    const s = initialTerminal(); const next = terminalStep(s, line); expect(next.error).toBe(true); expect(next.nodes).toEqual(s.nodes); expect(next.cwd).toBe(s.cwd);
  });
  it.each(["rm README.txt", "sudo ls", "__proto__", "constructor", "cat missing", "cd README.txt", "mkdir", "cp README.txt", 'touch ""', "mkdir /etc", "touch ../../escape", "touch /home/nico2/file", "touch missing/file", "cat README.txt extra"]) ("diagnoses invalid commands without mutating files: %s", line => {
    const s = initialTerminal(); const next = terminalStep(s, line); expect(next.error).toBe(true); expect(next.nodes).toEqual(s.nodes); expect(next.cwd).toBe(s.cwd);
  });
  it("lists, creates and reads files; touch preserves existing content", () => {
    const s = terminalRun(["ls", "mkdir docs", "touch docs/empty.txt", "cat docs/empty.txt"]);
    expect(s.output).toBe("（空文件）"); expect(s.error).toBe(false);
    expect(terminalRun(["touch README.txt", "cat README.txt"]).output).toContain("欢迎来到");
    expect(terminalStep(initialTerminal(), "ls").output).toBe("README.txt\nprojects/");
  });
  it("copies to directory and file, preserves source, and rejects overwrites", () => {
    const s = terminalRun(["cp README.txt projects", "cp README.txt projects/note.txt"]);
    expect(s.nodes["/home/nico/projects/README.txt"]).toEqual(s.nodes["/home/nico/README.txt"]);
    expect(terminalStep(s, "cp README.txt projects/note.txt").error).toBe(true);
    expect(terminalStep(s, "cp projects new").error).toBe(true);
  });
  it("accepts equivalent absolute/relative solutions and requires actual reading", () => {
    for (const lines of [["mkdir practice", "cp README.txt practice/note.txt", "cd practice", "cat note.txt"], ["mkdir /home/nico/practice", "cp /home/nico/README.txt /home/nico/practice/note.txt", "cd /home/nico/practice", "cat /home/nico/practice/note.txt"]]) expect(terminalGoals(terminalRun(lines)).every(g => g.ok)).toBe(true);
    expect(terminalGoals(terminalRun(["mkdir practice", "cp README.txt practice/note.txt", "cd practice"])).every(g => g.ok)).toBe(false);
    expect(terminalGoals(terminalRun(["mkdir practice", "touch practice/note.txt", "cd practice", "cat note.txt"])).every(g => g.ok)).toBe(false);
  });
  it("bounds input and file count and preserves snapshots", () => {
    const s = initialTerminal(); const before = structuredClone(s);
    expect(terminalStep(s, "x".repeat(241)).error).toBe(true); terminalStep(s, "mkdir demo"); expect(s).toEqual(before);
    let full = s; for (let i = 0; i < 80; i++) full = terminalStep(full, `touch f${i}`);
    expect(Object.keys(full.nodes)).toHaveLength(80); expect(full.error).toBe(true);
  });
});
describe("complete Foundation lessons", () => {
  for (const id of ["a06-memory", "a07-os", "a08-command-line"]) it(`${id}: full template, real sources, draft, diagnostics, transfer grading`, () => {
    const l = lessons[id]!; expect(lessonSchema.safeParse(l).success).toBe(true);
    expect(l.quality).toEqual({ state: "draft" }); expect(l.sources.length).toBeGreaterThan(0);
    expect(l.blocks.filter(b => b.type === "explain").length).toBeGreaterThanOrEqual(3);
    expect(l.blocks.filter(b => b.type === "sim").map(b => b.mode)).toEqual(["free", "challenge"]);
    const quiz = l.blocks.find(b => b.type === "quiz"); if (quiz?.type !== "quiz") throw Error("missing quiz");
    expect(quiz.items).toHaveLength(3);
    for (const q of quiz.items) for (let i = 0; i < q.options.length; i++) { expect(gradeChoice(q, i).correct).toBe(i === q.answer); expect(gradeChoice(q, i).message.length).toBeGreaterThan(5); }
    const t = l.blocks.find(b => b.type === "transfer"); if (t?.type !== "transfer") throw Error("missing transfer");
    expect(gradeNumber(t.answer, "invalid").valid).toBe(false); expect(gradeNumber(t.answer, String(t.answer + 1)).correct).toBe(false); expect(gradeNumber(t.answer, String(t.answer)).correct).toBe(true);
    expect(lessonSchema.safeParse({ ...l, quality: { state: "published" } }).success).toBe(false);
  });
  it("independently recomputes transfer answers from capacity, scheduling and paths", () => {
    const answer = (id: string) => { const t = lessons[id]!.blocks.find(b => b.type === "transfer"); return t?.type === "transfer" ? t.answer : null; };
    expect(answer("a06-memory")).toBe(4 - (8 - 5));
    let s = initialOs(); for (let i = 0; i < 8; i++) { s = osStep(s, { type: "dispatch", pid: i % 2 === 0 ? "browser" : "editor" }); s = osStep(s, { type: "tick" }); }
    expect(answer("a07-os")).toBe(s.work.browser);
    let p = "/home/nico/projects/demo", hops = 0; while (p !== "/home/nico") { p = resolvePath(p, ".."); hops++; }
    expect(answer("a08-command-line")).toBe(hops);
  });
  it("preserves a continuous A05–A09 chain", () => {
    const chain = ["a05-cpu-cycle", "a06-memory", "a07-os", "a08-command-line", "a09-network-layers"];
    for (let i = 0; i < chain.length - 1; i++) expect(nextAvailableAfter(chain[i]!)?.id).toBe(chain[i + 1]);
  });
});
