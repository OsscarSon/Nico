import { knowledgeRegistry, knowledgeAt } from "../knowledgeRegistry";
import { getAcademyCourse } from "../model";

export const dataCourses = [
  "foundation-data-science",
  "intermediate-data-science",
  "foundation-ai",
  "intermediate-ai",
] as const;
export type DataCourse = (typeof dataCourses)[number];
export const isDataCourse = (key: string): key is DataCourse =>
  (dataCourses as readonly string[]).includes(key);
const topics = knowledgeRegistry.flatMap((row) =>
  isDataCourse(row.course) ? [{ ...row, course: row.course }] : [],
);
const scope = new Map(topics.map((topic) => [topic.id, topic]));
export const dataTopic = (id: string) => scope.get(id);
export const dataTopics = topics;
export function dataIds(course: string) {
  if (!isDataCourse(course)) return [];
  const item = getAcademyCourse(course);
  if (!item) return [];
  const outline = item.modules.flatMap((module) =>
    module.chapters
      .flat()
      .flatMap((title) => knowledgeAt(course, module.id, title)?.id ?? []),
  );
  return [
    ...new Set([
      ...outline,
      ...topics
        .filter((topic) => topic.course === course)
        .map((topic) => topic.id),
    ]),
  ];
}
export const labOf = (course: string) =>
  course.endsWith("-ai") ? "ml" : "data";
