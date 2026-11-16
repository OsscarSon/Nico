/** 单文档教学模型：写入 RAM 时使缓存失效；保存显式复制到持久存储。 */
export type MemoryState = { disk: string; ram: string | null; cache: string | null; hits: number; restartedSaved: boolean; note: string };
export type MemoryAction = "open" | "edit" | "save" | "read" | "restart";
export const initialMemory = (): MemoryState => ({ disk: "原稿", ram: null, cache: null, hits: 0, restartedSaved: false, note: "文档在持久存储里。先打开它。" });
export function memoryStep(s: MemoryState, action: MemoryAction): MemoryState {
  if (action === "restart") return { ...s, ram: null, cache: null, restartedSaved: s.restartedSaved || s.disk === "修改稿", note: "模拟断电重启：RAM 和缓存清空，持久存储保留。" };
  if (action === "open") return { ...s, ram: s.disk, cache: null, note: "从持久存储加载到 RAM。" };
  if (s.ram === null) return { ...s, note: "请先打开文档，RAM 里还没有工作副本。" };
  if (action === "edit") return { ...s, ram: "修改稿", cache: null, note: "只修改了 RAM 工作副本；缓存失效，持久存储尚未改变。" };
  if (action === "save") return { ...s, disk: s.ram, note: "保存：RAM 的内容复制到持久存储。" };
  if (s.cache === s.ram) return { ...s, hits: s.hits + 1, note: "缓存命中：这次直接读取缓存，不再访问 RAM。" };
  return { ...s, cache: s.ram, note: "缓存未命中：从 RAM 读取，并填入缓存。" };
}
export const memoryGoals = (s: MemoryState) => [
  { label: "将修改稿保存到持久存储", ok: s.disk === "修改稿" },
  { label: "保存后断电重启，再打开修改稿", ok: s.restartedSaved && s.ram === "修改稿" },
  { label: "连续读取，观察至少一次缓存命中", ok: s.cache === "修改稿" && s.hits > 0 },
];
