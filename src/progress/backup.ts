import { z } from "zod";
import { mergeProgress, parseProgress, STORAGE_KEY, type Progress } from "./store";
import { knowledgeProgressSchema, type KnowledgeProgress } from "../grading/academy2/p1/progress";
import { PREFERENCES_KEY, isCurrentPreferences, type Preferences } from "../preferences/model";
import { getPersonalPath } from "../content/academy2/paths";
import { mergeStudy, studySchema, STUDY_KEY } from "./study";

export const ACADEMY_PATH_KEY = "nico-academy2-path";
export const KNOWLEDGE_BACKUP_KEY = "nico-knowledge-progress";
const preferences = z.custom<Preferences>((value) => isCurrentPreferences(JSON.stringify(value)));
const legacy = z
  .custom<Progress>((value) => {
    const accepted = parseProgress(JSON.stringify(value));
    return (
      accepted !== null &&
      Object.values(accepted.lessons).every(
        (record) =>
          Number.isInteger(record.firstTryCorrect) &&
          Number.isInteger(record.quizTotal) &&
          record.firstTryCorrect >= 0 &&
          record.quizTotal >= record.firstTryCorrect,
      )
    );
  })
  .transform((value) => parseProgress(JSON.stringify(value))!);
const fullSchema = z.object({
  format: z.literal("nico-academy-backup"),
  version: z.literal(1),
  legacy,
  knowledge: knowledgeProgressSchema,
  library: studySchema,
  preferences,
  professionalPath: z.string().refine((value) => !value || Boolean(getPersonalPath(value))),
});
export type Backup = z.infer<typeof fullSchema>;

function safeData(value: unknown, depth = 0): boolean {
  if (depth > 30) return false;
  if (!value || typeof value !== "object") return true;
  return Object.entries(value).every(
    ([key, item]) =>
      !["__proto__", "constructor", "prototype"].includes(key) && safeData(item, depth + 1),
  );
}
export function readBackup(text: string): Backup | Progress | null {
  if (text.length > 4_000_000) return null;
  try {
    const source: unknown = JSON.parse(text);
    if (!safeData(source)) return null;
    const full = fullSchema.safeParse(source);
    if (full.success) return full.data;
    if (source && typeof source === "object" && "format" in source) return null;
    const old = legacy.safeParse(source);
    return old.success ? old.data : null;
  } catch {
    return null;
  }
}
type Attempt = NonNullable<KnowledgeProgress["records"][string]["verification"]>;
function combineAttempt(a: Attempt | null, b: Attempt | null): Attempt | null {
  if (!a || !b) return a ?? b;
  return { ...(b.at > a.at ? b : a), count: Math.max(a.count, b.count), passed: a.passed || b.passed };
}
export function mergeKnowledge(a: KnowledgeProgress, b: KnowledgeProgress): KnowledgeProgress {
  const records = { ...a.records };
  for (const [id, incoming] of Object.entries(b.records)) {
    const current = records[id];
    records[id] = current
      ? {
          startedAt: Math.min(current.startedAt, incoming.startedAt),
          practice: [0, 1, 2].map((i) =>
            combineAttempt(current.practice[i]!, incoming.practice[i]!),
          ) as typeof current.practice,
          verification: combineAttempt(current.verification, incoming.verification),
        }
      : incoming;
  }
  const questionBank = { ...a.questionBank };
  for (const [topic, items] of Object.entries(b.questionBank ?? {})) {
    const merged = { ...questionBank[topic] };
    for (const [id, attempt] of Object.entries(items))
      merged[id] = combineAttempt(merged[id] ?? null, attempt)!;
    questionBank[topic] = merged;
  }
  return { ...a, records, questionBank, selfChecks: { ...a.selfChecks, ...b.selfChecks } };
}
export function mergeBackup(mine: Backup, incoming: Backup, restoreSettings: boolean): Backup {
  return {
    ...mine,
    legacy: mergeProgress(mine.legacy, incoming.legacy),
    knowledge: mergeKnowledge(mine.knowledge, incoming.knowledge),
    library: mergeStudy(mine.library, incoming.library),
    preferences: restoreSettings ? incoming.preferences : mine.preferences,
    professionalPath: restoreSettings ? incoming.professionalPath : mine.professionalPath,
  };
}
export function applyBackup(storage: Storage, backup: Backup) {
  const updates = [
    [STORAGE_KEY, JSON.stringify(backup.legacy)],
    [KNOWLEDGE_BACKUP_KEY, JSON.stringify(backup.knowledge)],
    [STUDY_KEY, JSON.stringify(backup.library)],
    [PREFERENCES_KEY, JSON.stringify(backup.preferences)],
    [ACADEMY_PATH_KEY, backup.professionalPath],
  ] as const;
  const snapshot = updates.map(([key]) => [key, storage.getItem(key)] as const);
  // Save pre-import data before writing across several legacy keys.
  const recovery = "nico-recovery-" + Date.now();
  storage.setItem(recovery, JSON.stringify(Object.fromEntries(snapshot)));
  let committed = 0;
  try {
    for (const [key, value] of updates) {
      storage.setItem(key, value);
      committed++;
    }
  } catch {
    try {
      for (const [key, value] of snapshot.slice(0, committed)) {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      }
    } catch {
      throw Error("浏览器禁止自动恢复。原数据仍保存在本机恢复点 " + recovery + "。");
    }
    throw Error("浏览器拒绝保存，已恢复此前的记录。");
  }
  storage.removeItem(recovery);
}
