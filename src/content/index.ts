import { tracks, type CatalogLesson } from "./catalog";
import type { Lesson } from "./schema";
import { a01 } from "./lessons/a01-binary";
import { a02 } from "./lessons/a02-hex-encoding";
import { a03 } from "./lessons/a03-logic-gates";
import { a04 } from "./lessons/a04-adder";
import { a06 } from "./lessons/a06-memory";
import { a07 } from "./lessons/a07-os";
import { a08 } from "./lessons/a08-command-line";
import { a05 } from "./lessons/a05-cpu-cycle";
import { trackBLessons } from "./track-b";
import { trackCLessons } from "./track-c";
import { trackELessons } from "./track-e";
import { networkLessons } from "./track-a-net";
import { securityLessons } from "./track-a-security";

export const lessons: Record<string, Lesson> = {
  [a01.id]: a01, [a02.id]: a02, [a03.id]: a03, [a04.id]: a04, [a05.id]: a05, [a06.id]: a06, [a07.id]: a07, [a08.id]: a08,
  ...Object.fromEntries(networkLessons.map((l) => [l.id, l])),
  ...Object.fromEntries(securityLessons.map((l) => [l.id, l])),
  ...Object.fromEntries(trackBLessons.map((l) => [l.id, l])),
  ...Object.fromEntries(trackCLessons.map((l) => [l.id, l])),
  ...Object.fromEntries(trackELessons.map((l) => [l.id, l])),
};

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

/** 同一条路线里，当前课之后第一个已经开放的课（不会跳到别的路线）。 */
export function nextAvailableAfter(id: string): CatalogLesson | undefined {
  const track = tracks.find((t) => t.lessons.some((l) => l.id === id));
  if (!track) return undefined;
  const idx = track.lessons.findIndex((l) => l.id === id);
  return track.lessons.slice(idx + 1).find((l) => l.status === "available");
}
