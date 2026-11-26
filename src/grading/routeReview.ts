import { buildDeployment, configureDeployment, inspectDeployment, newDeployment, publishDeployment, SITE_BASE, SITE_ORIGIN, visitDeployment, type DeploymentState } from "./deployment";
import { localApi } from "./fetchLab";
import { newRepo, run, statusOf, type Repo } from "./git";

const FILE = "src/index.html";
const page = (points: number) => `<h1>社团积分</h1><p>成员 2 的积分：${points}</p>`;

type ReadResult = { id: number; field: "points" | "name" | "id"; value: string | number };
export type ReviewState = {
  read: ReadResult | null;
  response: string;
  repo: Repo;
  buildCommit: string | null;
  publishedCommit: string | null;
  site: DeploymentState;
  note: string;
};

export function newReview(): ReviewState {
  return {
    read: null, response: "",
    repo: newRepo({ [FILE]: page(3) }, true),
    buildCommit: null, publishedCommit: null,
    site: newDeployment(), note: "先查询 API，检查成员编号和字段。",
  };
}

export function queryReview(state: ReviewState, path: string, field: ReadResult["field"]): ReviewState {
  const { response, error } = localApi({ path, method: "GET", body: "", online: true, override: "", field });
  if (!response?.ok) {
    const note = response ? `接口返回 HTTP ${response.status}。检查 URL 或成员编号。` : error ?? "接口没有响应。";
    return { ...state, read: null, response: response?.text ?? "", note };
  }
  const data = JSON.parse(response.text) as { id: number; name: string; points: number };
  return {
    ...state,
    read: { id: data.id, field, value: data[field] }, response: response.text,
    note: `请求返回 HTTP 200。记录 ${data.id} 的 ${field} 是 ${data[field]}。`,
  };
}

export function editReview(state: ReviewState): ReviewState {
  if (state.read?.id !== 2 || state.read.field !== "points" || typeof state.read.value !== "number") {
    return { ...state, note: "先取得成员 2 的 points 字段。名字或编号不能当成积分写入。" };
  }
  return {
    ...state, repo: { ...state.repo, work: { ...state.repo.work, [FILE]: page(state.read.value) } },
    note: "工作区已更新，暂存区和提交历史仍保留原版本。",
  };
}

export function commitReview(state: ReviewState, action: "stage" | "commit"): ReviewState {
  const cmd = action === "stage" ? `git add ${FILE}` : 'git commit -m "更新成员积分"';
  const result = run(state.repo, cmd);
  return { ...state, repo: result.repo, note: result.out.join("\n") || "已暂存当前文件快照。" };
}

export function buildReview(state: ReviewState): ReviewState {
  const head = state.repo.branches.main!;
  const snapshot = state.repo.commits[head]!;
  const staged = inspectDeployment({
    ...state.site, files: { ...snapshot.files }, revision: state.site.revision + 1,
  });
  const site = buildDeployment(staged);
  return { ...state, site, buildCommit: head, note: `已构建提交 ${head} 中的文件。未提交的工作区内容不会进入产物。` };
}

export function publishReview(state: ReviewState, dir: "." | "dist"): ReviewState {
  if (!state.buildCommit) return { ...state, note: "先从提交快照构建。" };
  const site = publishDeployment(configureDeployment(state.site, { publishDir: dir }));
  return { ...state, site, publishedCommit: state.buildCommit, note: `已从 ${dir} 发布模拟快照。下一步访问项目地址确认。` };
}

export function visitReview(state: ReviewState, address: string): ReviewState {
  const site = visitDeployment(state.site, address);
  const note = site.visit?.status === 200
    ? "已加载发布快照。核对预览中的积分与当前提交。"
    : site.message;
  return { ...state, site, note };
}

export function gradeReview(state: ReviewState) {
  const head = state.repo.branches.main!;
  const read = state.read;
  const expected = read?.id === 2 && read.field === "points" && typeof read.value === "number"
    ? page(read.value)
    : null;
  const commit = state.repo.commits[head]!;
  const committed = expected !== null && commit.files[FILE] === expected && statusOf(state.repo).clean;
  const published = committed && state.publishedCommit === head
    && state.site.deployed?.files["index.html"] === expected;
  const visit = state.site.visit;
  return {
    correct: expected !== null, committed, published,
    verified: published && visit?.status === 200 && visit.url === SITE_ORIGIN + SITE_BASE
      && visit.deployment === state.site.deployed?.id && visit.html === expected,
  };
}
