import { useSyncExternalStore } from "react";
import { z } from "zod";

export const STUDY_KEY = "nico-study-library";
const safeKey = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[a-z0-9][a-z0-9/:-]*$/)
  .refine((id) => id !== "constructor" && id !== "prototype");
const time = z.number().int().nonnegative();
const title = z.string().trim().min(1).max(180);
const bookmark = z.object({
  kind: z.enum(["course", "topic", "formula", "example"]),
  title,
  topic: safeKey,
  anchor: z
    .string()
    .max(100)
    .regex(/^[-a-z0-9]*$/)
    .optional(),
  text: z.string().max(3500).optional(),
  active: z.boolean(),
  at: time,
});
const note = z.object({ body: z.string().max(6000), at: time });
const visit = z.object({
  at: time,
  anchor: z
    .string()
    .max(100)
    .regex(/^[-a-z0-9]*$/),
});
const report = z.object({
  kind: z.enum(["experiment", "project"]),
  title,
  topic: safeKey,
  at: time,
  markdown: z.string().max(30000),
  active: z.boolean(),
});
export const studySchema = z.object({
  version: z.literal(1),
  notes: z.record(safeKey, note),
  bookmarks: z.record(safeKey, bookmark),
  visits: z.record(safeKey, visit),
  reports: z.record(safeKey, report),
});
export type Study = z.infer<typeof studySchema>;
export type SavedReport = z.infer<typeof report>;
export type Bookmark = z.infer<typeof bookmark>;

export const emptyStudy = (): Study => ({
  version: 1,
  notes: {},
  bookmarks: {},
  visits: {},
  reports: {},
});
const initial = { data: emptyStudy(), warning: "" };
function load() {
  try {
    const raw = localStorage.getItem(STUDY_KEY);
    if (!raw) return initial;
    const parsed = studySchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { data: parsed.data, warning: "" };
  } catch {
    /* keep unreadable data for recovery */
  }
  return { ...initial, warning: "本机学习资料读取失败，原数据已保留。" };
}
let view: ReturnType<typeof load> | undefined;
const subscribers = new Set<() => void>();
function subscribe(fn: () => void) {
  subscribers.add(fn);
  const receive = (event: StorageEvent) => {
    if (event.key === STUDY_KEY || event.key === null) {
      view = load();
      fn();
    }
  };
  window.addEventListener("storage", receive);
  return () => {
    subscribers.delete(fn);
    window.removeEventListener("storage", receive);
  };
}
export const useStudy = () =>
  useSyncExternalStore(
    subscribe,
    () => (view ??= load()),
    () => initial,
  );
export function changeStudy(fn: (source: Study) => Study): boolean {
  const previous = (view ??= load());
  const next = fn(previous.data);
  try {
    if (previous.warning.includes("原数据")) {
      const raw = localStorage.getItem(STUDY_KEY);
      if (raw) localStorage.setItem(STUDY_KEY + "-backup-" + Date.now(), raw);
    }
    localStorage.setItem(STUDY_KEY, JSON.stringify(next));
    view = { data: next, warning: "" };
    return true;
  } catch {
    view = { data: next, warning: "浏览器无法保存本次操作，当前页面仍可查看。" };
    return false;
  } finally {
    subscribers.forEach((listener) => listener());
  }
}
export const getStudy = () => (view ??= load()).data;
export function refreshStudy() {
  view = load();
  subscribers.forEach((fn) => fn());
}

export function mergeTimestamped<T extends { at: number }>(
  mine: Record<string, T>,
  other: Record<string, T>,
) {
  const merged = { ...mine };
  for (const [id, value] of Object.entries(other)) {
    if (!Object.hasOwn(mine, id) || value.at > mine[id]!.at) merged[id] = value;
  }
  return merged;
}
export function mergeStudy(mine: Study, other: Study): Study {
  return {
    version: 1,
    notes: mergeTimestamped(mine.notes, other.notes),
    bookmarks: mergeTimestamped(mine.bookmarks, other.bookmarks),
    visits: mergeTimestamped(mine.visits, other.visits),
    reports: mergeTimestamped(mine.reports, other.reports),
  };
}
