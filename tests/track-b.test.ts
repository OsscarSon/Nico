import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { ancestors, evalGoals, newRepo, runScript, type GitGoal } from "../src/grading/git";
import { lessonSchema, type CodeSpec } from "../src/content/schema";
import { lessons, nextAvailableAfter, validateContent } from "../src/content";
import { tracks } from "../src/content/catalog";
import { trackBLessons } from "../src/content/track-b";
import { checkSource, countLines, gradeChecks, programFor, type RunOutcome } from "../src/grading/code";

// 找一个能用的 Python 3；没有就跳过依赖它的测试（比如没装 Python 的 Windows 电脑）。
const PY = (() => {
  for (const cmd of ["python3", "python", "py"]) {
    const r = spawnSync(cmd, ["-c", "import sys; print(sys.version_info[0])"], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim() === "3") return cmd;
  }
  return null;
})();

function runPy(program: string, stdin = ""): RunOutcome {
  const r = spawnSync(PY!, ["-I", "-c", program], { input: stdin, encoding: "utf8", timeout: 5000 });
  return {
    stdout: r.stdout ?? "",
    error: r.status === 0 ? null : (r.stderr ?? "error"),
    timedOut: r.error !== undefined && /ETIMEDOUT/.test(String(r.error)),
  };
}
const py = (program: string) => runPy(program).stdout.trim();

type PySim = { id: string; title: string; mode: string; code: CodeSpec };
const pythonSims: PySim[] = trackBLessons.flatMap((l) =>
  l.blocks.flatMap((b) => (b.type === "sim" && b.sim === "python" && b.code ? [{ id: l.id, title: b.title, mode: b.mode, code: b.code }] : [])),
);
const challenges = pythonSims.filter((s) => s.mode === "challenge");

describe("track B content", () => {
  it("all B lessons pass the schema and are registered and catalogued consistently", () => {
    for (const l of trackBLessons) {
      expect(lessonSchema.safeParse(l).success).toBe(true);
      expect(lessons[l.id]).toBe(l);
    }
    expect(validateContent()).toEqual([]);
  });
  it("track B is building, has 20 catalog entries and exactly the available lessons we wrote", () => {
    const b = tracks.find((t) => t.id === "b")!;
    expect(b.status).toBe("building");
    expect(b.lessons.length).toBe(20);
    expect(b.lessons.filter((l) => l.status === "available").map((l) => l.id)).toEqual(trackBLessons.map((l) => l.id));
  });
  it("every B lesson is still a draft (no real learners have tried it)", () => {
    for (const l of trackBLessons) expect(l.quality.state).toBe("draft");
  });
  it("the next lesson never jumps to another track", () => {
    expect(nextAvailableAfter("b03-loops")?.id).toBe("b04-functions");
    expect(nextAvailableAfter("b07-debugging")?.id).toBe("b08-html");
    expect(nextAvailableAfter("b08-html")?.id).toBe("b09-css");
    expect(nextAvailableAfter("b10-css-layout")?.id).toBe("b11-js-dom");
    expect(nextAvailableAfter("b11-js-dom")?.id).toBe("b12-events");
    expect(nextAvailableAfter("b12-events")?.id).toBe("b14-git-basics");
    expect(nextAvailableAfter("b14-git-basics")?.id).toBe("b15-git-branches");
    expect(nextAvailableAfter("b15-git-branches")).toBe(undefined);
  });
  it("every regex in a lesson compiles", () => {
    for (const s of pythonSims) for (const r of s.code.requires ?? []) expect(() => new RegExp(r.pattern, "m")).not.toThrow();
  });
});

describe("schema rules for code interactions", () => {
  const base = () => structuredClone(lessons["b01-variables"]!);
  const challenge = (l: ReturnType<typeof base>) => {
    const s = l.blocks.find((b) => b.type === "sim" && b.mode === "challenge");
    if (s?.type !== "sim") throw new Error("no challenge");
    return s;
  };
  it("a python challenge without checks is rejected", () => {
    const l = base();
    delete challenge(l).code!.checks;
    expect(lessonSchema.safeParse(l).success).toBe(false);
  });
  it("a python challenge without a reference solution is rejected", () => {
    const l = base();
    delete challenge(l).code!.solution;
    expect(lessonSchema.safeParse(l).success).toBe(false);
  });
  it("a python sim without a code config is rejected", () => {
    const l = base();
    delete challenge(l).code;
    expect(lessonSchema.safeParse(l).success).toBe(false);
  });
  it("a web challenge needs webChecks", () => {
    const l = structuredClone(lessons["b08-html"]!);
    const s = l.blocks.find((b) => b.type === "sim" && b.mode === "challenge");
    if (s?.type !== "sim") throw new Error("no challenge");
    delete s.code!.webChecks;
    expect(lessonSchema.safeParse(l).success).toBe(false);
  });
});

describe.skipIf(!PY)("python challenges against real CPython", () => {
  it("there is at least one python challenge to check", () => {
    expect(challenges.length).toBeGreaterThan(0);
  });
  for (const c of challenges) {
    const checks = c.code.checks ?? [];
    it(`${c.id}「${c.title}」: the reference solution passes every check`, () => {
      const sol = c.code.solution!;
      expect(checkSource(sol, c.code.requires)).toBe(null);
      const outcomes = checks.map((k) => runPy(programFor(sol, k), k.stdin ?? ""));
      const g = gradeChecks(checks, outcomes, countLines(sol));
      expect(g.results.filter((r) => !r.ok).map((r) => `${r.label}: ${r.detail}`)).toEqual([]);
      expect(g.ok).toBe(true);
    });
    it(`${c.id}「${c.title}」: the starter code does not already pass`, () => {
      const st = c.code.starter;
      const outcomes = checks.map((k) => runPy(programFor(st, k), k.stdin ?? ""));
      expect(gradeChecks(checks, outcomes, countLines(st)).ok).toBe(false);
    });
    it(`${c.id}「${c.title}」: hard-coding the expected answer is caught`, () => {
      // 一个只会把第一个检查的答案写死的"作弊"程序，不能通过全部检查（除非只有一项且有源码规则拦截）
      const cheat = `print(${JSON.stringify(checks[0]!.expect)})\n`;
      const outcomes = checks.map((k) => runPy(programFor(cheat, k), k.stdin ?? ""));
      const passesChecks = gradeChecks(checks, outcomes, countLines(cheat)).ok;
      const blockedBySource = checkSource(cheat, c.code.requires) !== null;
      expect(!passesChecks || blockedBySource).toBe(true);
    });
  }
  it("every free-practice starter runs without an error", () => {
    for (const s of pythonSims.filter((x) => x.mode === "free")) {
      const o = runPy(s.code.starter, s.code.allowInput ? "70" : "");
      expect(o.error).toBe(null);
    }
  });
});

describe.skipIf(!PY)("quiz and transfer answers, recomputed independently in Python", () => {
  const quiz = (id: string, n: number) => {
    const q = lessons[id]!.blocks.find((b) => b.type === "quiz");
    if (q?.type !== "quiz") throw new Error("no quiz");
    const item = q.items[n]!;
    return item.options[item.answer];
  };
  const transfer = (id: string) => {
    const t = lessons[id]!.blocks.find((b) => b.type === "transfer");
    if (t?.type !== "transfer") throw new Error("no transfer");
    return t.answer;
  };
  it("b01", () => {
    expect(quiz("b01-variables", 0)).toBe(py("x = 5\nx = x + 1\nprint(x)"));
    expect(quiz("b01-variables", 2)).toBe(py('print("3" + "4")'));
    expect(transfer("b01-variables")).toBe(Number(py("a = 7\nb = a * 2\na = 3\nprint(b)")));
  });
  it("b02", () => {
    expect(quiz("b02-conditions", 0)).toBe(py("print(60 >= 60)"));
    expect(py('x = 5\nif x > 3:\n    print("A")\nif x > 4:\n    print("B")')).toBe("A\nB");
    expect(quiz("b02-conditions", 2)).toBe("A 然后 B");
    expect(transfer("b02-conditions")).toBe(Number(py("n = 10\nif n > 10:\n    n = n + 1\nelif n == 10:\n    n = n + 5\nelse:\n    n = 0\nprint(n)")));
  });
  it("b03", () => {
    expect(py("print(list(range(3)))")).toBe("[0, 1, 2]");
    expect(quiz("b03-loops", 0)).toBe("0、1、2");
    expect(Number(py('c = 0\nfor i in range(4):\n    c += 1\nprint(c)'))).toBe(Number(quiz("b03-loops", 1)));
    expect(transfer("b03-loops")).toBe(Number(py("total = 0\nfor i in range(1, 5):\n    total = total + i\nprint(total)")));
  });
  it("b04", () => {
    expect(quiz("b04-functions", 0)).toBe(py("def f(x):\n    return x + 1\nprint(f(2))"));
    expect(py("def g(x):\n    pass\nprint(g(1))")).toBe("None");
    expect(quiz("b04-functions", 1)).toBe("None");
    expect(transfer("b04-functions")).toBe(Number(py("def f(x):\n    return x * 2 + 1\nprint(f(f(2)))")));
  });
  it("b05", () => {
    expect(quiz("b05-lists", 0)).toBe(py("print([10, 20, 30][1])"));
    expect(quiz("b05-lists", 1)).toBe(py("x = [1, 2]\nx.append(9)\nprint(x)"));
    expect(Number(quiz("b05-lists", 2))).toBe(Number(py("print(len([1, 2, 3, 4]) - 1)")));
    expect(transfer("b05-lists")).toBe(Number(py("x = [4, 8, 15, 16]\nprint(x[len(x) - 1] - x[0])")));
  });
  it("b06", () => {
    expect(quiz("b06-dicts", 0)).toBe(py('d = {"a": 1, "b": 2}\nprint(d["b"])'));
    expect(runPy('d = {}\nprint(d["z"])').error).toContain("KeyError");
    expect(quiz("b06-dicts", 2)).toBe(py('d = {}\nd["x"] = 1\nd["x"] = 2\nprint(len(d))'));
    expect(transfer("b06-dicts")).toBe(Number(py('d = {"a": 1}\nd["b"] = d["a"] + 1\nd["a"] = 10\nprint(d["a"] + d["b"])')));
  });
  it("b07", () => {
    expect(runPy("print(totl)").error).toContain("NameError");
    expect(runPy("for i in range(3)\n    pass").error).toContain("SyntaxError");
    expect(transfer("b07-debugging")).toBe(Number(py("print(sum(range(1, 11)) - sum(range(1, 10)))")));
  });
  it("b09 / b10 arithmetic", () => {
    expect(transfer("b10-css-layout")).toBe(Number(py("print(100 + 2*10 + 2*2 + 2*5)")));
    expect(transfer("b09-css")).toBe(24);
  });
  it("b08: nested list has 4 li elements", () => {
    const html = "<ul><li>A<ul><li>B</li><li>C</li></ul></li><li>D</li></ul>";
    expect(transfer("b08-html")).toBe((html.match(/<li>/g) ?? []).length);
  });
});

// ---- JavaScript 挑战：没有页面的纯逻辑挑战可以直接在 Node 里验证；带页面的在浏览器 smoke 里验证 ----
const jsSims = trackBLessons.flatMap((l) =>
  l.blocks.flatMap((b) => (b.type === "sim" && b.sim === "js" && b.code ? [{ id: l.id, ...b, code: b.code }] : [])),
);
function runJsNode(program: string): RunOutcome {
  const lines: string[] = [];
  const log = (...a: unknown[]) => lines.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  try {
    vm.runInNewContext(program, { console: { log } }, { timeout: 2000 });
    return { stdout: lines.join("\n"), error: null, timedOut: false };
  } catch (e) {
    return { stdout: lines.join("\n"), error: String(e), timedOut: false };
  }
}
describe("javascript challenges", () => {
  it("there are js sims in B11 and B12", () => {
    expect(new Set(jsSims.map((s) => s.id))).toEqual(new Set(["b11-js-dom", "b12-events"]));
  });
  for (const c of jsSims.filter((s) => s.mode === "challenge" && !s.code.page)) {
    const checks = c.code.checks ?? [];
    it(`${c.id}「${c.title}」: solution passes, starter fails`, () => {
      const sol = c.code.solution!;
      expect(checkSource(sol, c.code.requires)).toBe(null);
      const g = gradeChecks(checks, checks.map((k) => runJsNode(programFor(sol, k))), countLines(sol), (e) => e);
      expect(g.results.filter((r) => !r.ok).map((r) => `${r.label}: ${r.detail}`)).toEqual([]);
      const st = c.code.starter;
      expect(gradeChecks(checks, checks.map((k) => runJsNode(programFor(st, k))), countLines(st), (e) => e).ok).toBe(false);
    });
  }
  it("every page-based js challenge has a solution and a page", () => {
    for (const c of jsSims.filter((s) => s.mode === "challenge" && s.code.page)) expect(c.code.solution).toBeTruthy();
  });
  it("transfer answers", () => {
    const t = (id: string) => {
      const b = lessons[id]!.blocks.find((x) => x.type === "transfer");
      if (b?.type !== "transfer") throw new Error("no transfer");
      return b.answer;
    };
    expect(t("b11-js-dom")).toBe(Number(runJsNode("let n = 0; for (let i = 0; i < 4; i++) { n += i; } console.log(n)").stdout));
    expect(t("b12-events")).toBe(1 + 1 + 5 + 1);
  });
});

// ---- Git 模拟器挑战：参考答案必须能达成全部目标，起始状态不能 ----
const gitSims = trackBLessons.flatMap((l) =>
  l.blocks.flatMap((b) => (b.type === "sim" && b.sim === "git" && b.git ? [{ id: l.id, ...b, git: b.git }] : [])),
);
describe("git challenges", () => {
  it("B14 and B15 each have a free sim and a challenge", () => {
    for (const id of ["b14-git-basics", "b15-git-branches"]) {
      const mine = gitSims.filter((s) => s.id === id);
      expect(mine.map((s) => s.mode)).toEqual(["free", "challenge"]);
    }
  });
  for (const c of gitSims.filter((s) => s.mode === "challenge")) {
    const goals = (c.git.goals ?? []) as GitGoal[];
    const start = () => newRepo(c.git.files, c.git.committed);
    it(`${c.id}: the reference solution reaches every goal without errors`, () => {
      const { repo, errors } = runScript(start(), c.git.solution!);
      expect(errors).toEqual([]);
      const g = evalGoals(repo, goals);
      expect(g.results.filter((r) => !r.ok).map((r) => r.label)).toEqual([]);
    });
    it(`${c.id}: the starting state does not already pass`, () => {
      expect(evalGoals(start(), goals).ok).toBe(false);
    });
    it(`${c.id}: dropping any single step of the solution fails`, () => {
      const sol = c.git.solution!;
      for (let i = 0; i < sol.length; i++) {
        const without = sol.filter((_, j) => j !== i);
        expect(evalGoals(runScript(start(), without).repo, goals).ok).toBe(false);
      }
    });
  }
  it("git transfer answers", () => {
    const t = (id: string) => {
      const b = lessons[id]!.blocks.find((x) => x.type === "transfer");
      if (b?.type !== "transfer") throw new Error("no transfer");
      return b.answer;
    };
    const { repo } = runScript(newRepo({ a: "v1" }, false), ["git init", "git add .", 'git commit -m "1"', "edit a", "git add .", 'git commit -m "2"', "edit a", "git add ."]);
    expect(t("b14-git-basics")).toBe(Object.keys(repo.commits).length);
    // main: Initial commit + 2 提交 = 3；然后开出 feature 再提交 2 次，main 不变
    const r2 = runScript(newRepo({ a: "v1" }, true), ["edit a", "git add .", 'git commit -m "2"', "edit a", "git add .", 'git commit -m "3"', "git switch -c f", "new b", "git add b", 'git commit -m "4"', "edit a", "git add a", 'git commit -m "5"']);
    expect(t("b15-git-branches")).toBe(ancestors(r2.repo, r2.repo.branches.main).size);
  });
});
