import { describe, expect, it } from "vitest";
import { ancestors } from "../src/grading/git";
import { cloneGithub, COLLAB_TARGET, commandGithub as cmd, editGithub, gradeGithub, inspectGithub, mergeGithub, newGithub, openGithubPr, peerGithub, pullGithub, pushGithub, resolveGithub, reviewGithub, type GithubState } from "../src/grading/github";
function feature() {
  let s = cmd(cloneGithub(newGithub()), "git switch -c feature"); s = editGithub(s, "<h1>编程社</h1>");
  return cmd(cmd(s, "git add ."), 'git commit -m "更新标题"');
}
function conflict() { return pullGithub(peerGithub(openGithubPr(pushGithub(feature())))); }
function resolved() { return resolveGithub(editGithub(conflict(), COLLAB_TARGET)); }
function merge(s: GithubState) { return mergeGithub(reviewGithub(inspectGithub(pushGithub(s)))); }
describe("B16 independent local/remote graphs and review-bound collaboration", () => {
  it("commit and worktree edits do not upload; only committed branch history pushes", () => {
    const s = feature(), old = s.remote.branches.main;
    expect(s.remote.commits[s.remote.branches.main!]!.files["index.html"]).toBe("<h1>旧标题</h1>");
    expect(openGithubPr(s).pr).toBeNull();
    const pushed = pushGithub(editGithub(s, "未提交修改"));
    expect(pushed.remote.branches.main).toBe(old);
    expect(pushed.remote.commits[pushed.remote.branches.feature!]!.files["index.html"]).toBe("<h1>编程社</h1>");
    expect(s.remote.branches.feature).toBeUndefined();
  });
  it("pull produces a genuine common-base conflict without overwriting local work", () => {
    const s = conflict(); expect(s.conflict).not.toBeNull();
    expect(s.local!.work["index.html"]).toBe("<h1>编程社</h1>");
    expect(s.local!.commits[s.conflict!.base]!.files["index.html"]).toBe("<h1>旧标题</h1>");
    expect(gradeGithub(s)).toBe(false);
    expect(resolveGithub(editGithub(s, "<<<<<<< ours\n=======\n>>>>>>> theirs")).conflict).not.toBeNull();
  });
  it("requires looking at the current remote diff before approving; new commits stale the review", () => {
    const approvedBeforePeer = reviewGithub(inspectGithub(openGithubPr(pushGithub(feature()))));
    expect(mergeGithub(peerGithub(approvedBeforePeer)).pr?.status).toBe("open");
    let s = pushGithub(resolved()); expect(reviewGithub(s).pr?.approved).toBeUndefined();
    s = reviewGithub(inspectGithub(s)); expect(s.pr?.approved).toBeDefined();
    s = editGithub(s, COLLAB_TARGET + "\n<!--补充说明-->"); s = cmd(cmd(s, "git add ."), 'git commit -m "补充"');
    s = pushGithub(s); expect(mergeGithub(s).pr?.status).toBe("open");
    expect(reviewGithub(s).message).toContain("旧版本");
  });
  it("rejects non-fast-forward pushes rather than erasing remote history", () => {
    const pushed = pushGithub(feature());
    const oldLocal = cloneGithub(newGithub()).local!; // another clone based on the original main
    const diverged = cmd(cmd(editGithub(cmd({ ...pushed, local: oldLocal }, "git switch -c feature"), "其他内容"), "git add ."), 'git commit -m "另一条历史"');
    const rejected = pushGithub(diverged); expect(rejected.message).toContain("非快进"); expect(rejected.remote).toEqual(pushed.remote);
  });
  it("completes only with both changes, a two-parent resolution, approved merge and synced clean main", () => {
    let s = resolved(); const resolution = s.local!.commits[s.resolution!]!;
    expect(resolution.parents).toHaveLength(2); expect(resolution.parents).toContain(s.peer);
    s = merge(s); expect(s.pr?.status).toBe("merged"); expect(gradeGithub(s)).toBe(false);
    s = pullGithub(cmd(s, "git switch main")); expect(gradeGithub(s)).toBe(true);
    expect(ancestors(s.remote, s.remote.branches.main)).toContain(s.resolution);
    expect(gradeGithub(editGithub(s, "覆盖队友联系方式"))).toBe(false);
    expect(gradeGithub({ ...s, resolution: null })).toBe(false);
  });
  it("a merely conflict-free or wrong-content merge does not satisfy the collaboration task", () => {
    let s = conflict(); s = resolveGithub(editGithub(s, "<h1>只留自己</h1>")); s = merge(s);
    s = pullGithub(cmd(s, "git switch main")); expect(gradeGithub(s)).toBe(false);
    expect(mergeGithub(newGithub()).pr).toBeNull(); expect(gradeGithub(newGithub())).toBe(false);
    expect(pushGithub(cloneGithub(newGithub())).message).toContain("main保护");
  });
  it("rejects dirty pull, repeated clone overwrite and repeated peer events; pure calls preserve input", () => {
    const s = feature(), before = structuredClone(s);
    expect(pullGithub(editGithub(s, "未保存")).message).toContain("先提交");
    expect(cloneGithub(s).local).toBe(s.local); expect(peerGithub(peerGithub(s)).remote).toEqual(peerGithub(s).remote);
    conflict(); expect(s).toEqual(before);
  });
});
