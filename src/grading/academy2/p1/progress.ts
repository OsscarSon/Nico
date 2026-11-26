import { z } from "zod";
import type { Exercise } from "../../../content/academy2/p1/types";

const attemptSchema = z.object({
  count: z.number().int().positive(),
  lastCorrect: z.boolean(),
  passed: z.boolean(),
  at: z.number().int().nonnegative(),
});
const recordSchema = z.object({
  startedAt: z.number().int().nonnegative(),
  practice: z.tuple([attemptSchema.nullable(), attemptSchema.nullable(), attemptSchema.nullable()]),
  verification: attemptSchema.nullable(),
});
const topicKey = z.string().regex(/^[a-z][a-z0-9-]{1,90}$/);
const selfKey = z.string().regex(/^[a-z][a-z0-9/-]{1,170}$/);
export const knowledgeProgressSchema = z.object({
  version: z.literal(1),
  records: z.record(topicKey, recordSchema),
  selfChecks: z.record(selfKey, z.boolean()),
});

export type KnowledgeProgress = z.infer<typeof knowledgeProgressSchema>;
export type PracticeRecord = z.infer<typeof recordSchema>;
export type KnowledgeStatus = "new" | "learning" | "complete" | "mastered" | "review";
export const statusLabel: Record<KnowledgeStatus, string> = {
  new: "未开始", learning: "学习中", complete: "已完成", mastered: "已掌握", review: "需要复习",
};
export const reviewAfterMs = 45 * 24 * 60 * 60 * 1000;
export const emptyKnowledge = (): KnowledgeProgress => ({ version: 1, records: {}, selfChecks: {} });

const normalize = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "").replace(/[。．]$/, "");
export function gradeExercise(exercise: Exercise, input: string): boolean {
  const answer = normalize(input).replace(/−/g, "-");
  if (!answer) return false;
  if (typeof exercise.answer !== "number") return exercise.answer.some(candidate => normalize(candidate) === answer);
  const parts = answer.split("/");
  const decimal = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d{1,3})?$/;
  if (parts.length > 2 || !parts.every(part => decimal.test(part))) return false;
  const numeric = parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(parts[0]);
  const tolerance = exercise.answer!==0&&Math.abs(exercise.answer)<.002 ? Math.abs(exercise.answer)*.01 : .0005;
  return Number.isFinite(numeric) && Math.abs(numeric - exercise.answer) <= tolerance;
}

export function beginTopic(state: KnowledgeProgress, id: string, time: number): KnowledgeProgress {
  if (state.records[id]) return state;
  return { ...state, records: { ...state.records, [id]: {startedAt: time, practice:[null,null,null], verification:null} } };
}
export const practicePassed = (record: PracticeRecord | undefined) => record?.practice.every(item => item?.passed) ?? false;

export function gradeTopic(state: KnowledgeProgress, id: string, index: 0 | 1 | 2 | 3, exercise: Exercise, input: string, time: number) {
  const current = beginTopic(state,id,time);
  const record = current.records[id]!;
  if (!normalize(input) || index === 3 && !practicePassed(record)) return current;
  const correct = gradeExercise(exercise,input);
  const previous = index === 3 ? record.verification : record.practice[index];
  const attempt = { count: (previous?.count ?? 0) + 1, lastCorrect: correct, passed: correct || previous?.passed === true, at: time };
  const practice = [...record.practice] as PracticeRecord["practice"];
  if (index !== 3) practice[index] = attempt;
  const updated = { ...record, practice, verification: index === 3 ? attempt : record.verification };
  return { ...current, records: { ...current.records, [id]: updated } };
}

export function knowledgeStatus(record: PracticeRecord | undefined, now: number): KnowledgeStatus {
  if (!record) return "new";
  if (!practicePassed(record)) return "learning";
  if (record.practice.some(item => item && !item.lastCorrect)) return "review";
  if (!record.verification) return "complete";
  if (!record.verification.lastCorrect || now - record.verification.at >= reviewAfterMs) return "review";
  return "mastered";
}

export function progressSummary(state: KnowledgeProgress, ids: readonly string[], time: number) {
  const counts: Record<KnowledgeStatus, number> = { new: 0, learning: 0, complete: 0, mastered: 0, review: 0 };
  for (const id of new Set(ids)) counts[knowledgeStatus(state.records[id],time)]++;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const finished = [...new Set(ids)].filter(id => practicePassed(state.records[id])).length;
  const stateLabel = counts.review > 0 ? "review" : total > 0 && counts.mastered === total ? "mastered" : total > 0 && finished === total ? "complete" : counts.new < total ? "learning" : "new";
  return { counts, total, finished, status: stateLabel as KnowledgeStatus };
}
