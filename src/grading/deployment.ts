/** Copy-based static publisher + URL/file server. Not GitHub Pages, a bundler or real hosting. */
export const SITE_ORIGIN = "https://pages.example.invalid";
export const SITE_BASE = "/club/";
export const SITE_MESSAGE = "来自已发布的 JS";
export const STATIC_HTML = '<h1>编程社</h1>\n<link rel="stylesheet" href="./style.css">\n<p id="message">等待脚本</p>\n<script src="./app.js"></script>';
export const STATIC_JS = 'document.querySelector("#message").textContent = "来自已发布的 JS";';
export const DEPLOY_TASKS = [
  { title: "入口为什么404", help: "检查并构建项目，先从错误目录发布并访问 /club/ 观察404；选择真正含index.html的dist目录，重新发布再访问。", error: "page404" },
  { title: "页面有字，样式和脚本没了", help: "先构建、发布和访问，查看根绝对路径 /style.css、/app.js 的404；改为相对路径，再检查、重建、重新发布和访问。", error: "asset404" },
  { title: "本机的大小写侥幸", help: "先发布并访问，观察 App.js 与实际app.js不一致；修正HTML引用的大小写，重建发布并让JS真正更新页面。", error: "asset404" },
] as const;
export type StaticVisit = { url: string; status: number; html: string; resources: { ref: string; url: string; status: number; text: string; kind: "style" | "script" }[]; deployment: number };
export type RuntimeProof = { deployment: number; url: string; heading: string; message: string; color: string; error: string | null };
export type DeploymentState = {
  task: number; files: Record<string, string>; source: string; output: string; publishDir: string; revision: number;
  inspected: number | null; built: { files: Record<string, string>; revision: number; output: string } | null;
  deployed: { files: Record<string, string>; id: number; buildRevision: number } | null; sequence: number;
  visit: StaticVisit | null; proof: RuntimeProof | null; observed: string[]; message: string;
};
export function newDeployment(task = 0): DeploymentState {
  let html = STATIC_HTML;
  if (task === 1) html = html.replace('./style.css', '/style.css').replace('./app.js', '/app.js');
  if (task === 2) html = html.replace('./app.js', './App.js');
  return { task, files: { "src/index.html": html, "src/style.css": 'h1 { color: #2457f5; } body { font-family: sans-serif; padding: 16px; }', "src/app.js": STATIC_JS }, source: "src", output: "dist", publishDir: task === 0 ? "." : "dist", revision: 0, inspected: null, built: null, deployed: null, sequence: 0, visit: null, proof: null, observed: [], message: "这是保留域名的内存部署实验，不会在真实互联网发布。" };
}
const safeDir = (x: string) => /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(x);
export function editDeployment(s: DeploymentState, file: string, text: string): DeploymentState {
  if (!Object.hasOwn(s.files, file) || text.length > 12000) return { ...s, message: "只编辑列出的教学文件，每个最多12000字符。" };
  return { ...s, files: { ...s.files, [file]: text }, revision: s.revision + 1, inspected: null, message: "源码已修改；旧构建和已发布快照没有自动改变。请重新检查、构建、发布。" };
}
export function configureDeployment(s: DeploymentState, patch: Partial<Pick<DeploymentState, "source" | "output" | "publishDir">>): DeploymentState {
  const changesBuild = patch.source !== undefined || patch.output !== undefined;
  return { ...s, ...patch, revision: s.revision + Number(changesBuild), inspected: changesBuild ? null : s.inspected, message: "配置已改变；发布目录改变不会自动部署。" };
}
export function inspectDeployment(s: DeploymentState): DeploymentState {
  const valid = safeDir(s.source) && safeDir(s.output) && s.source !== s.output && Object.hasOwn(s.files, `${s.source}/index.html`);
  return { ...s, inspected: valid ? s.revision : null, message: valid ? `文件检查通过：${Object.keys(s.files).join("、")}。复制构建不会替你修正HTML中的资源URL。` : "文件检查失败：源目录需含小写index.html，输出需为不同的合法相对目录（不含..）。" };
}
export function buildDeployment(s: DeploymentState): DeploymentState {
  if (s.inspected !== s.revision) return { ...s, message: "先检查当前版本的项目文件与构建目录。" };
  const files: Record<string, string> = {};
  for (const [name, text] of Object.entries(s.files)) if (name.startsWith(`${s.source}/`)) files[`${s.output}/${name.slice(s.source.length + 1)}`] = text;
  return { ...s, built: { files, revision: s.revision, output: s.output }, message: `复制构建完成：${Object.keys(files).join("、")}。这是文件输出，不是npm打包/Jekyll。` };
}
export function publishDeployment(s: DeploymentState): DeploymentState {
  if (!s.built) return { ...s, message: "还没有构建产物，先构建。" };
  if (s.publishDir !== "." && !safeDir(s.publishDir)) return { ...s, message: "发布目录只能是项目内相对目录。" };
  const pool = { ...s.files, ...s.built.files }, files: Record<string, string> = {};
  const prefix = s.publishDir === "." ? "" : `${s.publishDir}/`;
  for (const [path, text] of Object.entries(pool)) if (path.startsWith(prefix)) files[path.slice(prefix.length)] = text;
  return { ...s, sequence: s.sequence + 1, deployed: { files, id: s.sequence + 1, buildRevision: s.built.revision }, visit: null, proof: null, message: `已复制快照到模拟站点 ${SITE_ORIGIN}${SITE_BASE}，尚未访问验证。${s.built.revision !== s.revision ? "注意：构建不是当前源码版本。" : ""}` };
}
export function serveStatic(s: DeploymentState, address: string): { status: number; text: string; url: string } {
  let url: URL;
  try { url = new URL(address, SITE_ORIGIN); } catch { return { status: 400, text: "URL无效", url: address }; }
  if (url.origin !== SITE_ORIGIN || !url.pathname.startsWith(SITE_BASE)) return { status: 404, text: "站点外或不在项目子路径", url: url.href };
  let name: string;
  try { name = decodeURIComponent(url.pathname.slice(SITE_BASE.length)); } catch { return { status: 400, text: "URL编码无效", url: url.href }; }
  if (!name || name.endsWith("/")) name += "index.html";
  const pool = s.deployed?.files ?? {};
  const text = Object.hasOwn(pool, name) ? pool[name] : undefined;
  return { status: text === undefined ? 404 : 200, text: text ?? "404：这个发布快照中没有该路径（区分大小写）。", url: url.href };
}
function attr(tag: string, key: string): string | undefined {
  return new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(1).find(x => x !== undefined);
}
/** Teaching subset: literal link[rel=stylesheet] and script[src] attributes, not a complete HTML parser. */
export function staticReferences(html: string): { ref: string; kind: "style" | "script" }[] {
  const refs: { ref: string; kind: "style" | "script" }[] = [];
  for (const match of html.matchAll(/<(link|script)\b[^>]*>/gi)) {
    const script = match[1]!.toLowerCase() === "script";
    const ref = attr(match[0], script ? "src" : "href");
    if (ref && (script || attr(match[0], "rel")?.toLowerCase() === "stylesheet")) refs.push({ ref, kind: script ? "script" : "style" });
  }
  return refs;
}
export function visitDeployment(s: DeploymentState, address = SITE_BASE): DeploymentState {
  if (!s.deployed) return { ...s, message: "还没有发布快照。" };
  const main = serveStatic(s, address);
  const resources: StaticVisit["resources"] = main.status === 200 ? staticReferences(main.text).map(r => {
    try { return { ...r, ...serveStatic(s, new URL(r.ref, main.url).href) }; }
    catch { return { ...r, url: r.ref, status: 400, text: "资源URL无效" }; }
  }) : [];
  const error = main.status !== 200 ? "page404" : resources.some(r => r.status !== 200) ? "asset404" : null;
  const observed = error && main.url === `${SITE_ORIGIN}${SITE_BASE}` ? [...new Set([...s.observed, error])] : s.observed;
  return { ...s, visit: { url: main.url, status: main.status, html: main.text, resources, deployment: s.deployed.id }, proof: null, observed, message: error === "page404" ? "入口404：检查发布目录与index.html。" : error ? "入口200但资源404：查看解析后的URL、项目子路径和大小写。" : "入口与引用资源200，接下来在隔离预览中执行发布的JS并检查页面。" };
}
export function recordRuntime(s: DeploymentState, proof: RuntimeProof): DeploymentState {
  if (!s.visit || proof.deployment !== s.deployed?.id || proof.url !== s.visit.url) return s;
  return { ...s, proof, message: proof.error ? `发布页面执行失败：${proof.error}` : `实际预览检查：标题「${proof.heading}」，页面消息「${proof.message}」。` };
}
export function gradeDeployment(s: DeploymentState): boolean {
  const v = s.visit, p = s.proof, task = DEPLOY_TASKS[s.task];
  return Boolean(task && s.observed.includes(task.error) && s.built?.revision === s.revision && s.inspected === s.revision && s.publishDir === s.built.output && s.deployed?.buildRevision === s.built.revision && Object.entries(s.built.files).every(([path, text]) => s.deployed?.files[path.slice(s.built!.output.length + 1)] === text) && v?.url === `${SITE_ORIGIN}${SITE_BASE}` && v.status === 200 && v.deployment === s.deployed?.id && v.resources.some(r => r.kind === "style") && v.resources.some(r => r.kind === "script") && v.resources.every(r => r.status === 200) && p?.deployment === v.deployment && p.url === v.url && !p.error && p.heading === "编程社" && p.message === SITE_MESSAGE && p.color === "rgb(36, 87, 245)");
}
