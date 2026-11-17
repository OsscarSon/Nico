export type LessonRecord = {
  completedAt: string;
  firstTryCorrect: number;
  quizTotal: number;
};
export type Progress = {
  schemaVersion: 1;
  lessons: Record<string, LessonRecord>;
  resume: { lessonId: string; step: number } | null;
  /** 有学习动作的日期（本地时间，YYYY-MM-DD） */
  activeDays: string[];
};

export const STORAGE_KEY = "nico-progress";
export const CURRENT_VERSION = 1;

type KV = Pick<Storage, "getItem" | "setItem">;

export const emptyProgress = (): Progress => ({
  schemaVersion: 1,
  lessons: {},
  resume: null,
  activeDays: [],
});

export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isProgress(x: unknown): x is Progress {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    p.schemaVersion === CURRENT_VERSION &&
    typeof p.lessons === "object" &&
    p.lessons !== null &&
    Array.isArray(p.activeDays)
  );
}

/**
 * 读取进度。数据损坏或来自更新版本时，把原文备份到另一个键，
 * 再从空进度开始——绝不静默覆盖学习者的数据。
 */
export function loadProgress(storage: KV, now: Date = new Date()): Progress {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return emptyProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isProgress(parsed)) return { ...emptyProgress(), ...parsed };
  } catch {
    /* 落到下面的备份逻辑 */
  }
  storage.setItem(`${STORAGE_KEY}-backup-${now.getTime()}`, raw);
  return emptyProgress();
}

export function saveProgress(storage: KV, p: Progress): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* 存储已满或被禁用：本次不保存，应用继续可用 */
  }
}

const withDay = (days: string[], today: string): string[] =>
  days.includes(today) ? days : [...days, today].slice(-400);

export function recordStep(
  p: Progress,
  lessonId: string,
  step: number,
  today: string,
): Progress {
  if (p.lessons[lessonId]) return { ...p, activeDays: withDay(p.activeDays, today) };
  return {
    ...p,
    resume: { lessonId, step },
    activeDays: withDay(p.activeDays, today),
  };
}

/** 首次完成才记录成绩；重学不会覆盖第一次的结果。 */
export function completeLesson(
  p: Progress,
  lessonId: string,
  stats: { firstTryCorrect: number; quizTotal: number },
  now: Date,
): Progress {
  const existing = p.lessons[lessonId];
  return {
    ...p,
    lessons: {
      ...p.lessons,
      [lessonId]: existing ?? { completedAt: now.toISOString(), ...stats },
    },
    resume: p.resume?.lessonId === lessonId ? null : p.resume,
    activeDays: withDay(p.activeDays, localDay(now)),
  };
}

/** 连续学习天数：今天或昨天有记录都算连续中。 */
export function streak(p: Progress, today: Date): number {
  const days = new Set(p.activeDays);
  const cursor = new Date(today);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(localDay(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * 解析用户导入的备份文件。只接受当前版本、结构完整的数据；
 * 任何一处不合法就整体拒绝（返回 null），不做"尽量修复"。
 */
export function parseProgress(raw: string): Progress | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isProgress(parsed)) return null;
  const lessons: Record<string, LessonRecord> = {};
  for (const [id, rec] of Object.entries(parsed.lessons)) {
    if (UNSAFE_KEYS.has(id) || id.length > 100) return null;
    const r = rec as Partial<LessonRecord> | null;
    if (
      !r || typeof r.completedAt !== "string" || Number.isNaN(Date.parse(r.completedAt)) ||
      !Number.isFinite(r.firstTryCorrect) || !Number.isFinite(r.quizTotal)
    ) return null;
    lessons[id] = { completedAt: r.completedAt, firstTryCorrect: r.firstTryCorrect as number, quizTotal: r.quizTotal as number };
  }
  if (!parsed.activeDays.every((d) => typeof d === "string" && DAY.test(d))) return null;
  const rs = parsed.resume;
  const resume = rs && typeof rs.lessonId === "string" && Number.isInteger(rs.step) && rs.step >= 0 ? { lessonId: rs.lessonId, step: rs.step } : null;
  return { schemaVersion: 1, lessons, resume, activeDays: [...parsed.activeDays].sort().slice(-400) };
}

/**
 * 合并两份进度：只增不减。同一课时两边都有记录时保留更早的那次（首次成绩不被覆盖）。
 */
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const lessons: Record<string, LessonRecord> = { ...current.lessons };
  for (const [id, rec] of Object.entries(incoming.lessons)) {
    const mine = lessons[id];
    if (!mine || Date.parse(rec.completedAt) < Date.parse(mine.completedAt)) lessons[id] = rec;
  }
  const resume = current.resume ?? incoming.resume;
  return {
    schemaVersion: 1,
    lessons,
    resume: resume && !lessons[resume.lessonId] ? resume : null,
    activeDays: [...new Set([...current.activeDays, ...incoming.activeDays])].sort().slice(-400),
  };
}
