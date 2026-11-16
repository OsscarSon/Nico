import { describe, it, expect } from "vitest";
import { evalGoals, newRepo, run, runScript, statusOf, tokenize } from "../src/grading/git";

const go = (r = newRepo({ "index.html": "v1" }, false), ...lines: string[]) => runScript(r, lines);

describe("mini git", () => {
  it("tokenizes quoted messages", () => {
    expect(tokenize('git commit -m "first try"')).toEqual(["git", "commit", "-m", "first try"]);
  });
  it("refuses git commands before init", () => {
    const r = run(newRepo({}, false), "git status");
    expect(r.error).toBe(true);
    expect(r.out[0]).toMatch(/not a git repository/);
  });
  it("init, add, commit gives a clean tree", () => {
    const { repo, errors } = go(undefined, "git init", "git add .", 'git commit -m "first"');
    expect(errors).toEqual([]);
    expect(statusOf(repo).clean).toBe(true);
    expect(Object.keys(repo.commits)).toHaveLength(1);
  });
  it("untracked, unstaged and staged files are told apart", () => {
    let { repo } = go(undefined, "git init", "git add .", 'git commit -m "a"', "edit index.html", "new b.txt");
    expect(statusOf(repo)).toMatchObject({ modified: ["index.html"], untracked: ["b.txt"], staged: [] });
    ({ repo } = go(repo, "git add index.html"));
    expect(statusOf(repo)).toMatchObject({ staged: ["index.html"], modified: [] });
  });
  it("commit without add is rejected with an explanation", () => {
    const { repo } = go(undefined, "git init", "git add .", 'git commit -m "a"', "edit index.html");
    const r = run(repo, 'git commit -m "x"');
    expect(r.error).toBe(true);
    expect(r.out[0]).toMatch(/add/);
  });
  it("commit needs -m", () => {
    const { repo } = go(undefined, "git init", "git add .");
    expect(run(repo, "git commit").error).toBe(true);
  });
  it("add of a missing file fails and changes nothing", () => {
    const { repo } = go(undefined, "git init");
    const r = run(repo, "git add nope.txt");
    expect(r.error).toBe(true);
    expect(r.repo).toEqual(repo);
  });
  it("run never mutates the repo it was given", () => {
    const start = newRepo({ "a": "v1" }, true);
    const copy = structuredClone(start);
    run(start, "edit a");
    run(start, "git add .");
    expect(start).toEqual(copy);
  });
  it("log lists newest first", () => {
    const { repo } = go(undefined, "git init", "git add .", 'git commit -m "one"', "edit index.html", "git add .", 'git commit -m "two"');
    const out = run(repo, "git log --oneline").out;
    expect(out[0]).toMatch(/HEAD -> main\) two$/);
    expect(out[1]).toMatch(/one$/);
  });
  it("branch creation needs a commit, then works", () => {
    expect(run(go(undefined, "git init").repo, "git branch x").error).toBe(true);
    const r = run(newRepo({ a: "v1" }, true), "git branch x");
    expect(r.error).toBe(false);
    expect(Object.keys(r.repo.branches).sort()).toEqual(["main", "x"]);
  });
  it("switching with uncommitted changes is refused", () => {
    const { repo } = go(newRepo({ a: "v1" }, true), "git branch x", "edit a");
    const r = run(repo, "git switch x");
    expect(r.error).toBe(true);
    expect(r.repo.head).toBe("main");
  });
  it("a new untracked file follows you to another branch", () => {
    const { repo } = go(newRepo({ a: "v1" }, true), "git switch -c f", "new b", "git switch main");
    expect(repo.head).toBe("main");
    expect(repo.work.b).toBe("v1");
  });
  it("files committed on a branch disappear from the other branch", () => {
    const { repo } = go(newRepo({ a: "v1" }, true), "git switch -c f", "new b", "git add b", 'git commit -m "b"', "git switch main");
    expect(repo.work.b).toBeUndefined();
  });
  it("fast-forward merge", () => {
    const { repo, errors } = go(newRepo({ a: "v1" }, true), "git switch -c f", "new b", "git add b", 'git commit -m "b"', "git switch main", "git merge f");
    expect(errors).toEqual([]);
    expect(repo.work.b).toBe("v1");
    expect(repo.branches.main).toBe(repo.branches.f);
  });
  it("diverged branches make a merge commit with two parents", () => {
    const { repo, errors } = go(
      newRepo({ a: "v1" }, true),
      "git switch -c f", "new b", "git add b", 'git commit -m "b"',
      "git switch main", "edit a", "git add a", 'git commit -m "a2"', "git merge f",
    );
    expect(errors).toEqual([]);
    const m = repo.commits[repo.branches.main!]!;
    expect(m.parents).toHaveLength(2);
    expect(m.files).toEqual({ a: "v1+", b: "v1" });
  });
  it("same file changed on both sides is a conflict, nothing changes", () => {
    const { repo } = go(newRepo({ a: "v1" }, true), "git switch -c f", "edit a", "git add a", 'git commit -m "f"', "git switch main", "edit a", "edit a", "git add a", 'git commit -m "m"');
    const r = run(repo, "git merge f");
    expect(r.error).toBe(true);
    expect(r.out[0]).toMatch(/CONFLICT/);
    expect(r.repo).toEqual(repo);
  });
  it("merging an already-merged branch is a no-op", () => {
    const { repo } = go(newRepo({ a: "v1" }, true), "git branch x");
    expect(run(repo, "git merge x").out[0]).toMatch(/up to date/);
  });
  it("unknown commands get a friendly message", () => {
    expect(run(newRepo({}, false), "rm -rf /").error).toBe(true);
    expect(run(newRepo({}, true), "git push").error).toBe(true);
  });
  it("goals", () => {
    const g = [
      { kind: "initialized" as const, label: "i" },
      { kind: "commitCount" as const, label: "c", branch: "main", min: 2 },
      { kind: "clean" as const, label: "k" },
    ];
    expect(evalGoals(newRepo({ a: "v1" }, false), g).ok).toBe(false);
    const { repo } = go(undefined, "git init", "git add .", 'git commit -m "a"', "edit index.html", "git add .", 'git commit -m "b"');
    expect(evalGoals(repo, g).ok).toBe(true);
  });
});
