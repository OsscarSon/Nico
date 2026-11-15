import { tracks, type CatalogLesson } from "./catalog";
import type { Lesson } from "./schema";
import { a01 } from "./lessons/a01-binary";
import { a02 } from "./lessons/a02-hex-encoding";
import { a03 } from "./lessons/a03-logic-gates";
import { a04 } from "./lessons/a04-adder";

export const lessons: Record<string, Lesson> = { [a01.id]: a01, [a02.id]: a02, [a03.id]: a03, [a04.id]: a04 };

export const getLesson = (id: string): Lesson | undefined => lessons[id];

export const allCatalogLessons = (): CatalogLesson[] =>
  tracks.flatMap((t) => t.lessons);

/** 目录和课时内容必须一致：标为 available 的必须有内容，反之亦然。 */
export function validateContent(): string[] {
  const errors: string[] = [];
  const catalogIds = new Set(allCatalogLessons().map((l) => l.id));
  for (const l of allCatalogLessons()) {
    if (l.status === "available" && !lessons[l.id])
      errors.push(`目录标记 ${l.id} 可学习，但没有课时内容`);
    if (l.status === "planned" && lessons[l.id])
      errors.push(`${l.id} 已有内容，目录仍标记为规划中`);
  }
  for (const l of Object.values(lessons)) {
    if (!catalogIds.has(l.id)) errors.push(`${l.id} 不在目录里`);
    for (const p of l.prerequisites)
      if (!catalogIds.has(p)) errors.push(`${l.id} 的先修 ${p} 不存在`);
    const summary = l.blocks.at(-1);
    if (summary?.type === "summary" && summary.next && !catalogIds.has(summary.next))
      errors.push(`${l.id} 的下一课 ${summary.next} 不存在`);
  }
  return errors;
}

/** 目录顺序里，当前课之后第一个已经开放的课。 */
export function nextAvailableAfter(id: string): CatalogLesson | undefined {
  const all = allCatalogLessons();
  const idx = all.findIndex((l) => l.id === id);
  if (idx < 0) return undefined;
  return all.slice(idx + 1).find((l) => l.status === "available");
}
