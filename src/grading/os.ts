/** 单核、两进程、固定文件权限的教学模型，不代表真实调度算法。 */
export type Pid = "browser" | "editor";
export type ProcessState = "ready" | "running" | "waiting" | "stopped";
export type OsState = { processes: Record<Pid, ProcessState>; work: Record<Pid, number>; notes: string; system: string; denied: number; note: string };
export type OsAction = { type: "dispatch" | "wait" | "wake" | "stop"; pid: Pid } | { type: "tick" } | { type: "write"; file: "notes" | "system" };
export const initialOs = (): OsState => ({ processes: { browser: "ready", editor: "ready" }, work: { browser: 0, editor: 0 }, notes: "原文", system: "受保护配置", denied: 0, note: "两个进程就绪，CPU 暂时空闲。" });
export function osStep(s: OsState, a: OsAction): OsState {
  const p = { ...s.processes };
  if (a.type === "tick") {
    const pid = (["browser", "editor"] as Pid[]).find(id => p[id] === "running");
    return pid ? { ...s, work: { ...s.work, [pid]: s.work[pid] + 1 }, note: "只有正在运行的进程完成了一单位工作。" } : { ...s, note: "CPU 空闲，没有进程获得工作量。" };
  }
  if (a.type === "write") {
    if (p.editor !== "running") return { ...s, note: "编辑器需要先获得 CPU 才能发出写入请求。" };
    if (a.file === "system") return { ...s, denied: s.denied + 1, note: "权限拒绝：系统配置只读，原内容未被修改。" };
    return { ...s, notes: "新笔记", note: "权限允许：学习笔记已保存。" };
  }
  const current = p[a.pid];
  if (a.type === "dispatch") {
    if (current !== "ready") return { ...s, note: "只能调度就绪进程；等待中的进程需先收到 I/O 回应。" };
    for (const id of ["browser", "editor"] as Pid[]) if (p[id] === "running") p[id] = "ready";
    p[a.pid] = "running";
  } else if (a.type === "wait") {
    if (current !== "running") return { ...s, note: "只有运行中的进程可以发出本模型的 I/O 请求。" };
    p[a.pid] = "waiting";
  } else if (a.type === "wake") {
    if (current !== "waiting") return { ...s, note: "这个进程没有等待 I/O。" };
    p[a.pid] = "ready";
  } else p[a.pid] = "stopped";
  return { ...s, processes: p, note: a.type === "wake" ? "I/O 完成：进程回到就绪队列，不会自动抢占 CPU。" : "进程状态已更新；最多一个进程占用 CPU。" };
}
export const osGoals = (s: OsState) => [
  { label: "让浏览器等待 I/O", ok: s.processes.browser === "waiting" },
  { label: "让编辑器获得 CPU 并推进工作", ok: s.processes.editor === "running" && s.work.editor > 0 },
  { label: "保存可写笔记", ok: s.notes === "新笔记" },
  { label: "观察只读配置写入被拒绝且内容不变", ok: s.denied > 0 && s.system === "受保护配置" },
];
