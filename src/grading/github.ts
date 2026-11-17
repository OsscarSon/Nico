/** In-memory collaboration model layered on the unchanged B14/B15 Git implementation. */
import { ancestors, newRepo, run, statusOf, type Repo } from "./git";
export const TEAM_FILE = '<h1>旧标题</h1>\n<p>联系：club@example.invalid</p>';
export const COLLAB_TARGET = '<h1>编程社</h1>\n<p>联系：club@example.invalid</p>';
type PullRequest = { branch: string; status: "open" | "merged"; inspected?: string; approved?: string; mergedHead?: string };
export type GithubState = { local: Repo | null; remote: Repo; pr: PullRequest | null; peer: string | null; conflict: { ours: string; theirs: string; base: string } | null; resolution: string | null; message: string };
const tip = (r: Repo, b = r.head) => r.branches[b]!;
const files = (r: Repo, b = r.head) => r.commits[tip(r, b)]!.files;
const pair = (s: GithubState) => s.pr ? `${tip(s.remote, s.pr.branch)}:${tip(s.remote, "main")}` : "";
export function newGithub(): GithubState { return { local: null, remote: newRepo({ "index.html": "<h1>旧标题</h1>", "README.md": "社团网站" }, true), pr: null, peer: null, conflict: null, resolution: null, message: "远程已有项目；先clone到本地。所有操作仅在内存模拟，不连接GitHub。" }; }
export function cloneGithub(s: GithubState): GithubState {
  if (s.local) return { ...s, message: "本地仓库已存在，不覆盖你的文件；重新实验请重置。" };
  return { ...s, local: structuredClone(s.remote), message: "clone：复制远程提交与main分支到本地。" };
}
export function editGithub(s: GithubState, text: string): GithubState {
  if (!s.local) return { ...s, message: "先clone。" };
  if (text.length > 4000) return { ...s, message: "教学文件上限4000字符。" };
  return { ...s, local: { ...s.local, work: { ...s.local.work, "index.html": text } }, message: "只改了本地工作区；暂存、commit、push是不同步骤。" };
}
export function commandGithub(s: GithubState, command: string): GithubState {
  if (!s.local) return { ...s, message: "先clone。" };
  if (s.conflict) return { ...s, message: "冲突待处理；先编辑工作区保留双方内容，再完成冲突解决。" };
  const result = run(s.local, command);
  return { ...s, local: result.repo, message: result.out.join("\n") || "命令已执行（本地）。" };
}
export function pushGithub(s: GithubState): GithubState {
  if (!s.local) return { ...s, message: "先clone。" };
  const local = s.local, branch = local.head, head = tip(local);
  if (s.conflict) return { ...s, message: "先解决冲突。" };
  if (branch === "main") return { ...s, message: "本实验启用main保护：请在分支push并经PR审查。真实仓库是否保护由管理员配置。" };
  const old = s.remote.branches[branch];
  if (!head || (old && !ancestors(local, head).has(old))) return { ...s, message: "push被拒绝：远程分支有本地没有的提交（非快进），先同步；不要强推覆盖。" };
  const remote = structuredClone(s.remote); Object.assign(remote.commits, structuredClone(local.commits)); remote.branches[branch] = head;
  return { ...s, remote, message: `push：远程 ${branch} 指向 ${head}。未commit的工作区修改没有上传。` };
}
export function openGithubPr(s: GithubState): GithubState {
  if (!s.local || s.local.head === "main" || !s.remote.branches[s.local.head]) return { ...s, message: "先把本地功能分支push到远程，才能创建PR。" };
  if (s.pr) return { ...s, message: "已有PR，后续push会更新它；无需重复创建。" };
  if (tip(s.remote, s.local.head) === tip(s.remote, "main")) return { ...s, message: "分支没有提交差异，不能凭空创建改动。" };
  return { ...s, pr: { branch: s.local.head, status: "open" }, message: "PR已创建（模拟），比较远程功能分支与远程main。" };
}
export function peerGithub(s: GithubState): GithubState {
  if (s.peer) return { ...s, message: "队友这次更新已经在远程main，不重复生成。" };
  let remote = structuredClone(s.remote); remote.head = "main"; remote.work = { ...files(remote, "main"), "index.html": TEAM_FILE }; remote.index = { ...remote.work };
  remote = run(remote, 'git commit -m "队友补充联系方式"').repo;
  return { ...s, remote, peer: tip(remote), message: "队友只更新了远程main；你的本地文件不会自动改变。" };
}
export function pullGithub(s: GithubState): GithubState {
  if (!s.local) return { ...s, message: "先clone。" };
  if (s.conflict) return { ...s, message: "先完成当前冲突解决。" };
  if (!statusOf(s.local).clean) return { ...s, message: "先提交本地工作区修改，再pull，避免覆盖。" };
  const local = structuredClone(s.local); Object.assign(local.commits, structuredClone(s.remote.commits));
  // Teaching pull = fetch origin/main then merge into current branch.
  local.branches["origin/main"] = tip(s.remote, "main");
  const result = run(local, "git merge origin/main");
  if (result.error && result.out.some(x => x.includes("CONFLICT"))) {
    const theirHistory = ancestors(local, tip(s.remote, "main"));
    const queue = [tip(local)], seen = new Set<string>(); let base = "";
    while (queue.length) { const id = queue.shift()!; if (seen.has(id)) continue; seen.add(id); if (theirHistory.has(id)) { base = id; break; } queue.push(...local.commits[id]!.parents); }
    return { ...s, local, conflict: { ours: tip(local), theirs: tip(s.remote, "main"), base }, message: "CONFLICT：双方改了index.html。对照三个版本，手动编辑工作区保留双方意图；本模型按整文件判断冲突。" };
  }
  return { ...s, local: result.repo, message: `pull：fetch远程main，再合并到当前 ${local.head}。\n${result.out.join("\n")}` };
}
export function resolveGithub(s: GithubState): GithubState {
  if (!s.local || !s.conflict) return { ...s, message: "没有待解决的冲突。" };
  const text = s.local.work["index.html"] ?? "";
  if (!text.trim() || /<<<<<<<|=======|>>>>>>>/.test(text)) return { ...s, message: "仍有冲突标记或空文件；先编辑真实合并内容。" };
  const local = structuredClone(s.local), id = `merge${Object.keys(local.commits).length}`;
  local.commits[id] = { id, message: "Resolve collaborative conflict", parents: [s.conflict.ours, s.conflict.theirs], files: { ...local.work } };
  local.branches[local.head] = id; local.index = { ...local.work };
  return { ...s, local, conflict: null, resolution: id, message: "已记录双亲合并提交。Git能记录你的选择，但是否保留双方意图还要审查实际内容。" };
}
export function inspectGithub(s: GithubState): GithubState {
  if (!s.pr || s.pr.status !== "open") return { ...s, message: "先创建开放的PR。" };
  return { ...s, pr: { ...s.pr, inspected: pair(s) }, message: `远程差异（当前head/base）：\nmain：${files(s.remote, "main")["index.html"]}\n${s.pr.branch}：${files(s.remote, s.pr.branch)["index.html"]}` };
}
export function reviewGithub(s: GithubState): GithubState {
  if (!s.pr || s.pr.status !== "open" || s.pr.inspected !== pair(s)) return { ...s, message: "请先查看当前远程差异；旧版本的检查不能代替新提交的审查。" };
  return { ...s, pr: { ...s.pr, approved: pair(s) }, message: "已切换为队友审查者角色，批准当前head/base；新push或main变化会使批准失效。" };
}
export function mergeGithub(s: GithubState): GithubState {
  if (!s.pr || s.pr.status !== "open" || s.pr.approved !== pair(s)) return { ...s, message: "需要对当前远程版本完成审查，才能合并。" };
  const remote = structuredClone(s.remote); remote.head = "main"; remote.work = { ...files(remote, "main") }; remote.index = { ...remote.work };
  const result = run(remote, `git merge ${s.pr.branch}`);
  if (result.error) return { ...s, message: `远程无法合并：${result.out.join("\n")}\n在本地pull并解决冲突，然后重新push与审查。` };
  return { ...s, remote: result.repo, pr: { ...s.pr, status: "merged", mergedHead: tip(result.repo, "main") }, message: "PR已合并到模拟远程main。现在本地切回main再pull，验证最终文件。" };
}
export function gradeGithub(s: GithubState): boolean {
  const local = s.local, merge = local && s.resolution ? local.commits[s.resolution] : undefined;
  return Boolean(local && s.peer && merge && merge.parents.length === 2 && merge.parents.includes(s.peer) && s.pr?.status === "merged" && s.pr.mergedHead === tip(s.remote, "main") && ancestors(s.remote, tip(s.remote, "main")).has(s.resolution!) && files(s.remote, "main")["index.html"] === COLLAB_TARGET && local.head === "main" && tip(local) === tip(s.remote, "main") && local.work["index.html"] === COLLAB_TARGET && statusOf(local).clean && !s.conflict);
}
