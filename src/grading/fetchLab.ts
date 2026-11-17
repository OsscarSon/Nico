/** Explicit local API teaching model. No real fetch/interception/network dependency. */
export type FetchRequest = { path: string; method: "GET" | "POST"; body: string; online: boolean; override: string; field: string };
export type ApiResponse = { status: number; ok: boolean; text: string };
export type ApiOutcome = { response: ApiResponse; error?: never } | { error: string; response?: never };
export const profile = (id: number) => ({ id, name: id === 2 ? "Mina" : "Nico", points: id === 2 ? 8 : 5 });
export function localApi(r: FetchRequest): ApiOutcome {
  if (!r.online) return { error: "网络失败：fetch Promise 被拒绝，没有 HTTP Response。" };
  const reply = (status: number, text: string): ApiOutcome => ({ response: { status, ok: status >= 200 && status < 300, text } });
  if (r.path.length > 200 || r.body.length > 4000 || r.override.length > 4000) return reply(413, '{"error":"内容过长"}');
  if (!r.path.startsWith("/api/") || r.path.startsWith("//")) return reply(400, '{"error":"只支持本地 /api/ 路径"}');
  const url = new URL(r.path, "https://api.example.invalid");
  if (url.pathname !== "/api/profile") return reply(404, '{"error":"没有这个接口"}');
  if (r.method === "POST") {
    try {
      const data: unknown = JSON.parse(r.body);
      if (!data || typeof data !== "object" || !("name" in data) || typeof data.name !== "string" || !data.name.trim()) return reply(422, '{"error":"name 必须是非空字符串"}');
      return reply(201, JSON.stringify({ id: 3, name: data.name }));
    } catch { return reply(400, '{"error":"请求体不是合法JSON"}'); }
  }
  const id = Number(url.searchParams.get("id") ?? 1);
  if (id !== 1 && id !== 2) return reply(404, '{"error":"没有这个成员"}');
  return reply(200, r.override || JSON.stringify(profile(id)));
}

export const FETCH_TASKS = [
  { title: "修好响应 JSON", help: "先请求并尝试解析，观察尾逗号错误；修正覆盖文本，让 name=Mina、points=8，然后重新请求、解析并显示 name。", error: "json", expected: "Mina" },
  { title: "名单字段去哪了", help: "请求 id=2 并解析，试着显示 nickname 观察错误；查看实际对象，改用它真正拥有的 name 字段。", error: "field", expected: "Mina" },
  { title: "断网不等于404", help: "先发出断网请求，观察没有Response；恢复连接，再取得并显示 id=1 的 name。", error: "network", expected: "Nico" },
  { title: "请求成功到达，但接口错了", help: "先请求不存在的接口，观察HTTP404与ok=false；修正为 /api/profile?id=1，再解析和显示name。", error: "http", expected: "Nico" },
] as const;
export type FetchLabState = {
  task: number; config: FetchRequest; revision: number; pending: number | null;
  response: ApiResponse | null; parsed: unknown; parsedReady: boolean; displayed: string | null;
  observed: string[]; message: string; phase: "idle" | "pending" | "response" | "rejected";
};
export function newFetchLab(task = 0): FetchLabState {
  return { task, config: { path: task === 3 ? "/api/missing" : `/api/profile?id=${task < 2 ? 2 : 1}`, method: "GET", body: '{"name":"Ada"}', online: task !== 2, override: task === 0 ? '{"id":2,"name":"Mina","points":8,}' : "", field: task === 1 ? "nickname" : "name" }, revision: 0, pending: null, response: null, parsed: null, parsedReady: false, displayed: null, observed: [], message: "先设置请求，再观察 pending → fulfilled/rejected。", phase: "idle" };
}
export function configureFetch(s: FetchLabState, patch: Partial<FetchRequest>): FetchLabState {
  if (Object.keys(patch).every(key => key === "field")) return { ...s, config: { ...s.config, ...patch }, displayed: null, message: "显示字段已改变，可直接从已经解析的对象中读取，不必重新请求。" };
  return { ...s, config: { ...s.config, ...patch }, revision: s.revision + 1, pending: null, response: null, parsed: null, parsedReady: false, displayed: null, phase: "idle", message: "参数已修改，旧响应已失效；请重新请求。" };
}
export function beginFetch(s: FetchLabState): FetchLabState {
  return { ...s, pending: s.revision + 1, revision: s.revision + 1, response: null, parsed: null, parsedReady: false, displayed: null, phase: "pending", message: "Promise pending：等待本地API；还不能读取结果。" };
}
const observe = (s: FetchLabState, error: string) => [...new Set([...s.observed, error])];
export function settleFetch(s: FetchLabState, token: number, outcome: ApiOutcome): FetchLabState {
  if (s.pending !== token || s.phase !== "pending") return s;
  if (outcome.error !== undefined) return { ...s, pending: null, phase: "rejected", message: outcome.error, observed: observe(s, "network") };
  const response = outcome.response;
  return { ...s, pending: null, phase: "response", response, message: `fetch Promise fulfilled；HTTP ${response.status}，ok=${response.ok}。${response.ok ? "下一步读取JSON。" : "HTTP错误不让fetch自动reject；先检查ok。"}`, observed: response.ok ? s.observed : observe(s, "http") };
}
export function parseFetch(s: FetchLabState): FetchLabState {
  if (!s.response) return { ...s, message: "先等待Response；pending/rejected都没有可解析的响应体。" };
  try { return { ...s, parsed: JSON.parse(s.response.text) as unknown, parsedReady: true, displayed: null, message: "JSON.parse成功：JSON文本已转换为JavaScript值；解析本身不代表HTTP成功。" }; }
  catch { return { ...s, parsed: null, parsedReady: false, displayed: null, observed: observe(s, "json"), message: "JSON解析失败：检查双引号、逗号和括号；末尾不能有多余逗号。修好后重新请求。" }; }
}
export function displayFetch(s: FetchLabState): FetchLabState {
  if (!s.response?.ok || !s.parsedReady) return { ...s, displayed: null, message: "显示前需要HTTP成功且JSON解析成功。" };
  const data = s.parsed;
  if (!data || typeof data !== "object" || !Object.hasOwn(data, s.config.field) || !["string", "number", "boolean"].includes(typeof (data as Record<string, unknown>)[s.config.field])) return { ...s, displayed: null, observed: observe(s, "field"), message: `字段 ${s.config.field || "（空）"} 不存在或不是可显示的基本值；对照对象键名，注意大小写。` };
  return { ...s, displayed: String((data as Record<string, unknown>)[s.config.field]), message: "已把实际字段值写到下方页面（使用文本，不执行HTML）。" };
}
export function gradeFetch(s: FetchLabState): boolean {
  const task = FETCH_TASKS[s.task];
  const data = s.parsed as Record<string, unknown> | null;
  const expectedId = s.task < 2 ? 2 : 1;
  return Boolean(task && s.phase === "response" && s.response?.ok && s.parsedReady && s.config.method === "GET" && s.config.field === "name" && s.observed.includes(task.error) && s.displayed === task.expected && data?.name === task.expected && data.id === expectedId && new URL(s.config.path, "https://api.example.invalid").searchParams.get("id") === String(expectedId) && (s.task !== 0 || data.points === 8));
}
