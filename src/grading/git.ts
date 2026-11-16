// 迷你 Git 模拟器：纯函数，不依赖浏览器。教学用的**简化模型**，不是真的 Git：
// - 一个文件的"内容"只是一小段文字；edit 命令在末尾加一个 "+" 代表改过；
// - 只支持：init、add、commit -m、status、log、branch、switch / checkout、merge；
// - 切换分支、合并之前要求工作区干净（真 Git 在没有冲突时允许带着修改切换）；
// - 合并冲突不处理：遇到冲突就提示并保持原状。
// 界面上要标"模拟"。

export type Commit = { id: string; message: string; parents: string[]; files: Record<string, string> };
export type Repo = {
  inited: boolean;
  commits: Record<string, Commit>;
  /** 分支名 → 最新提交的 id */
  branches: Record<string, string>;
  /** 当前所在分支（第一次提交之前，这个分支还不存在） */
  head: string;
  work: Record<string, string>;
  index: Record<string, string>;
};
export type Result = { repo: Repo; out: string[]; error: boolean };

export function newRepo(files: Record<string, string>, committed: boolean): Repo {
  const r: Repo = { inited: false, commits: {}, branches: {}, head: "main", work: { ...files }, index: {} };
  if (!committed) return r;
  const id = hashOf("Initial commit", [], files);
  r.inited = true;
  r.commits[id] = { id, message: "Initial commit", parents: [], files: { ...files } };
  r.branches.main = id;
  r.index = { ...files };
  return r;
}

function hashOf(message: string, parents: string[], files: Record<string, string>): string {
  const s = JSON.stringify([message, parents, Object.entries(files).sort()]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 7);
}

const clone = (r: Repo): Repo => structuredClone(r);
const tip = (r: Repo, branch = r.head): string | undefined => r.branches[branch];
const snap = (r: Repo, id: string | undefined): Record<string, string> => (id ? r.commits[id]!.files : {});
const same = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/** 从某个提交往回能到达的所有提交（含自己） */
export function ancestors(r: Repo, id: string | undefined): Set<string> {
  const seen = new Set<string>();
  const stack = id ? [id] : [];
  while (stack.length) {
    const x = stack.pop()!;
    if (seen.has(x)) continue;
    seen.add(x);
    stack.push(...r.commits[x]!.parents);
  }
  return seen;
}

export type Status = { staged: string[]; modified: string[]; untracked: string[]; clean: boolean };
export function statusOf(r: Repo): Status {
  const head = snap(r, tip(r));
  const staged = Object.keys(r.index).filter((f) => head[f] !== r.index[f]).sort();
  const modified = Object.keys(r.index).filter((f) => f in r.work && r.work[f] !== r.index[f]).sort();
  const untracked = Object.keys(r.work).filter((f) => !(f in r.index) && !(f in head)).sort();
  return { staged, modified, untracked, clean: !staged.length && !modified.length && !untracked.length };
}
const dirty = (r: Repo) => {
  const s = statusOf(r);
  return s.staged.length > 0 || s.modified.length > 0;
};

export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out;
}

const ok = (repo: Repo, ...out: string[]): Result => ({ repo, out, error: false });
const fail = (repo: Repo, ...out: string[]): Result => ({ repo, out, error: true });

export function run(before: Repo, line: string): Result {
  const t = tokenize(line.trim());
  if (t.length === 0) return ok(before);
  const r = clone(before);
  const [cmd, ...args] = t as [string, ...string[]];

  if (cmd === "ls") return ok(r, Object.keys(r.work).sort().join("  ") || "（没有文件）");
  if (cmd === "new") {
    const f = args[0];
    if (!f) return fail(r, "用法：new 文件名");
    if (f in r.work) return fail(r, `${f} 已经存在。`);
    r.work[f] = "v1";
    return ok(r, `（模拟）创建了 ${f}`);
  }
  if (cmd === "edit") {
    const f = args[0];
    if (!f) return fail(r, "用法：edit 文件名");
    if (!(f in r.work)) return fail(r, `找不到 ${f}。新文件用：new ${f}`);
    r.work[f] += "+";
    return ok(r, `（模拟）改了 ${f}`);
  }
  if (cmd !== "git") return fail(r, `不认识「${cmd}」。这里可以用：git …、new 文件名、edit 文件名、ls`);

  const sub = args[0];
  const rest = args.slice(1);
  if (!sub) return fail(r, "用法：git 子命令，例如 git status");
  if (sub === "init") {
    if (r.inited) return ok(r, "Reinitialized existing Git repository");
    r.inited = true;
    return ok(r, "Initialized empty Git repository");
  }
  if (!r.inited) return fail(r, "fatal: not a git repository（还没有 git init）");

  switch (sub) {
    case "add": {
      if (rest.length === 0) return fail(r, "Nothing specified, nothing added.（要写 git add 文件名，或 git add .）");
      for (const p of rest) {
        if (p === ".") Object.assign(r.index, r.work);
        else if (p in r.work) r.index[p] = r.work[p]!;
        else return fail(before, `fatal: pathspec '${p}' did not match any files`);
      }
      return ok(r);
    }
    case "commit": {
      const i = rest.indexOf("-m");
      const msg = i >= 0 ? rest[i + 1] : undefined;
      if (!msg) return fail(r, '请用 -m 写一句说明，例如：git commit -m "第一次提交"');
      const head = tip(r);
      if (same(r.index, snap(r, head))) {
        const s = statusOf(r);
        return fail(
          r,
          s.modified.length || s.untracked.length
            ? "no changes added to commit（有修改，但还没 git add 到暂存区）"
            : "nothing to commit, working tree clean",
        );
      }
      const files = { ...r.index };
      const parents = head ? [head] : [];
      const id = hashOf(msg, parents, files);
      r.commits[id] = { id, message: msg, parents, files };
      r.branches[r.head] = id;
      return ok(r, `[${r.head} ${id}] ${msg}`);
    }
    case "status": {
      const s = statusOf(r);
      const o = [`On branch ${r.head}`];
      if (!tip(r)) o.push("No commits yet");
      if (s.staged.length) o.push("Changes to be committed（已暂存，会进入下一次提交）:", ...s.staged.map((f) => `        ${f}`));
      if (s.modified.length) o.push("Changes not staged for commit（改了，但还没 add）:", ...s.modified.map((f) => `        ${f}`));
      if (s.untracked.length) o.push("Untracked files（Git 还没在管它们）:", ...s.untracked.map((f) => `        ${f}`));
      if (s.clean) o.push("nothing to commit, working tree clean");
      return ok(r, ...o);
    }
    case "log": {
      const head = tip(r);
      if (!head) return fail(r, `fatal: your current branch '${r.head}' does not have any commits yet`);
      // 按"最新在前"列出所有能到达的提交：同一条线上父提交一定在子提交之后
      const all = ancestors(r, head);
      const order: string[] = [];
      const left = new Set(all);
      while (left.size) {
        const next = [...left].find((id) => ![...left].some((o) => o !== id && r.commits[o]!.parents.includes(id)))!;
        order.push(next);
        left.delete(next);
      }
      return ok(r, ...order.map((id, i) => `${id}${i === 0 ? ` (HEAD -> ${r.head})` : ""} ${r.commits[id]!.message}`));
    }
    case "branch": {
      const name = rest[0];
      if (!name) return ok(r, ...Object.keys(r.branches).sort().map((b) => `${b === r.head ? "*" : " "} ${b}`));
      const head = tip(r);
      if (!head) return fail(r, "fatal: 还没有任何提交，不能建分支（先 git commit 一次）");
      if (name in r.branches) return fail(r, `fatal: a branch named '${name}' already exists`);
      r.branches[name] = head;
      return ok(r);
    }
    case "switch":
    case "checkout": {
      const create = rest[0] === "-c" || rest[0] === "-b";
      const name = create ? rest[1] : rest[0];
      if (!name) return fail(r, `用法：git ${sub} 分支名`);
      if (create) {
        const head = tip(r);
        if (!head) return fail(r, "fatal: 还没有任何提交，不能建分支（先 git commit 一次）");
        if (name in r.branches) return fail(r, `fatal: a branch named '${name}' already exists`);
        r.branches[name] = head;
        r.head = name;
        return ok(r, `Switched to a new branch '${name}'`);
      }
      if (!(name in r.branches)) return fail(r, `fatal: invalid reference: ${name}（用 git branch 看有哪些分支）`);
      if (name === r.head) return ok(r, `Already on '${name}'`);
      if (dirty(r)) return fail(r, "error: 有还没提交的修改，切换分支会弄丢它们。先 git add 再 git commit。");
      const keep = statusOf(r).untracked;
      const target = snap(r, tip(r, name));
      r.work = { ...target, ...Object.fromEntries(keep.map((f) => [f, r.work[f]!])) };
      r.index = { ...target };
      r.head = name;
      return ok(r, `Switched to branch '${name}'`);
    }
    case "merge": {
      const name = rest[0];
      if (!name) return fail(r, "用法：git merge 分支名（把那个分支合并进当前分支）");
      if (!(name in r.branches)) return fail(r, `merge: ${name} - not something we can merge`);
      const cur = tip(r);
      const theirs = tip(r, name)!;
      if (!cur) return fail(r, "当前分支还没有提交。");
      if (name === r.head || ancestors(r, cur).has(theirs)) return ok(r, "Already up to date.");
      if (dirty(r)) return fail(r, "error: 有还没提交的修改，先 git add 再 git commit，再合并。");
      const theirAnc = ancestors(r, theirs);
      const curAnc = ancestors(r, cur);
      const apply = (files: Record<string, string>) => {
        const keep = statusOf(r).untracked;
        r.work = { ...files, ...Object.fromEntries(keep.map((f) => [f, r.work[f]!])) };
        r.index = { ...files };
      };
      if (theirAnc.has(cur)) {
        r.branches[r.head] = theirs;
        apply(snap(r, theirs));
        return ok(r, `Updating ${cur}..${theirs}`, "Fast-forward（当前分支没有新提交，指针直接往前移）");
      }
      // 三方合并：找最近的共同祖先
      let base: string | undefined;
      const queue = [cur];
      const seen = new Set<string>();
      while (queue.length && !base) {
        const x = queue.shift()!;
        if (seen.has(x)) continue;
        seen.add(x);
        if (theirAnc.has(x)) base = x;
        else queue.push(...r.commits[x]!.parents);
      }
      const b = snap(r, base);
      const o = snap(r, cur);
      const t = snap(r, theirs);
      const merged: Record<string, string> = {};
      const conflicts: string[] = [];
      for (const f of new Set([...Object.keys(b), ...Object.keys(o), ...Object.keys(t)])) {
        if (o[f] === t[f]) { if (o[f] !== undefined) merged[f] = o[f]!; }
        else if (o[f] === b[f]) { if (t[f] !== undefined) merged[f] = t[f]!; }
        else if (t[f] === b[f]) { if (o[f] !== undefined) merged[f] = o[f]!; }
        else conflicts.push(f);
      }
      void curAnc;
      if (conflicts.length)
        return fail(r, ...conflicts.map((f) => `CONFLICT (content): Merge conflict in ${f}`), "Automatic merge failed。本模拟不处理冲突：合并没有发生，状态保持原样。");
      const msg = `Merge branch '${name}'`;
      const id = hashOf(msg, [cur, theirs], merged);
      r.commits[id] = { id, message: msg, parents: [cur, theirs], files: merged };
      r.branches[r.head] = id;
      apply(merged);
      return ok(r, `Merge made by the 'ort' strategy.`, `[${r.head} ${id}] ${msg}`);
    }
    default:
      return fail(r, `这个模拟不支持 git ${sub}。支持：init、add、commit、status、log、branch、switch、checkout、merge`);
  }
}

// ---- 挑战目标（数据驱动，见 content/schema.ts 的 gitGoalSchema）----
export type GitGoal =
  | { kind: "initialized"; label: string }
  | { kind: "clean"; label: string }
  | { kind: "onBranch"; label: string; branch: string }
  | { kind: "branchExists"; label: string; branch: string }
  | { kind: "commitCount"; label: string; branch: string; min: number }
  | { kind: "fileOnBranch"; label: string; branch: string; file: string }
  | { kind: "merged"; label: string; branch: string; into: string };

export function evalGoal(r: Repo, g: GitGoal): boolean {
  switch (g.kind) {
    case "initialized": return r.inited;
    case "clean": return r.inited && statusOf(r).clean;
    case "onBranch": return r.head === g.branch && g.branch in r.branches;
    case "branchExists": return g.branch in r.branches;
    case "commitCount": return ancestors(r, tip(r, g.branch)).size >= g.min;
    case "fileOnBranch": return g.file in snap(r, tip(r, g.branch));
    case "merged": {
      const a = tip(r, g.branch);
      const b = tip(r, g.into);
      return Boolean(a && b && ancestors(r, b).has(a));
    }
  }
}
export function evalGoals(r: Repo, goals: GitGoal[]): { ok: boolean; results: { label: string; ok: boolean }[] } {
  const results = goals.map((g) => ({ label: g.label, ok: evalGoal(r, g) }));
  return { ok: results.length > 0 && results.every((x) => x.ok), results };
}

export function runScript(start: Repo, lines: string[]): { repo: Repo; errors: string[] } {
  let repo = start;
  const errors: string[] = [];
  for (const l of lines) {
    const res = run(repo, l);
    if (res.error) errors.push(`${l}: ${res.out.join(" ")}`);
    repo = res.repo;
  }
  return { repo, errors };
}
