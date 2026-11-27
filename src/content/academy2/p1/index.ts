import { foundationMath } from "./foundationMath";
import { foundationStats } from "./foundationStats";
import { intermediateMath } from "./intermediateMath";
import { intermediateStats } from "./intermediateStats";

export const p1Courses = {
  "foundation-mathematics": foundationMath,
  "foundation-statistics": foundationStats,
  "intermediate-mathematics": intermediateMath,
  "intermediate-statistics": intermediateStats,
};
export const p1Lessons = [...foundationMath, ...foundationStats, ...intermediateMath, ...intermediateStats];
const byId = new Map(p1Lessons.map(lesson => [lesson.id, lesson]));
export const findP1Lesson = (id: string) => byId.get(id);
export const isP1Course = (id: string): id is keyof typeof p1Courses => Object.hasOwn(p1Courses, id);
