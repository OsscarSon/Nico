import { z } from "zod";
import data from "./curriculum.json";
import { foundationCatalogLessons, getLesson } from ".";
import { tracks } from "./catalog";

const courseSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(["Foundation", "Intermediate", "Advanced"]),
  track: z.enum(["A", "B", "C", "D", "E", "F", "M"]),
  title: z.string().min(1),
  status: z.enum(["live", "next", "planned", "flagship", "reading"]),
  phase: z.number().int().min(1).max(5),
  source: z.string().optional(),
  project: z.string(),
  units: z.array(z.string()).optional(),
  prerequisites: z.string().optional(),
});
export type Course = z.infer<typeof courseSchema>;
export type Stage = Course["stage"];
export type AcademyTrackId = Course["track"];
export type CourseStatus = Course["status"];
export const curriculum = z.array(courseSchema).parse(data);

export const stages: { id: Stage; title: string; subtitle: string; note: string }[] = [
  { id: "Foundation", title: "基础阶段", subtitle: "打好知识基础", note: "已上线课程可直接学习，规划中的课程会在目录中单独标明。内容质量以课内的草稿 / 试学标记为准。" },
  { id: "Intermediate", title: "中阶阶段", subtitle: "从知识走向实践", note: "A、B 路线课程及 C-I04、C-I05 可学习。课内标记反映课程质量，先修课程可按需要复习。" },
  { id: "Advanced", title: "进阶阶段", subtitle: "深入专业主题", note: "精选主题是未来计划制作互动实验的方向；资料路径的资源尚待整理。两者都不表示已经上线。" },
];
export const statusLabels: Record<CourseStatus, string> = {
  live: "已上线", next: "下一批 / 试点", planned: "规划中", flagship: "精选主题", reading: "资料路径",
};
export const academyTracks: { id: AcademyTrackId; title: string; subtitle: string; art?: string }[] = [
  ...tracks.map(t => ({ id: t.id.toUpperCase() as AcademyTrackId, title: t.title, subtitle: t.tagline, art: t.art })),
  { id: "M", title: "数学基础", subtitle: "理解技术背后的数学。", art: "track-m-math.png" },
];

export function coursesFor(stage: Stage, track?: AcademyTrackId): Course[] {
  return curriculum.filter(c => c.stage === stage && (!track || c.track === track))
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
}
export function stageSummary(stage: Stage): string {
  const courses = coursesFor(stage);
  const count = (status: CourseStatus) => courses.filter(c => c.status === status).length;
  if (stage !== "Advanced") return `已上线 ${count("live")} / ${courses.length}`;
  return `精选 ${count("flagship")} · 资料路径 ${count("reading")}`;
}

// 基础目录保留展示编号与旧 ID 的映射；中阶使用原目录编号。
const legacyByCode = new Map(foundationCatalogLessons().map(l => [l.id.split("-")[0]!.toUpperCase(), l]));
export function liveLessonFor(course: Course) {
  if (course.status !== "live") return undefined;
  if (course.stage === "Intermediate") {
    const lesson = getLesson(course.id.toLowerCase());
    return lesson?.stage === "Intermediate" && lesson.track.toUpperCase() === course.track ? lesson : undefined;
  }
  if (course.stage !== "Foundation") return undefined;
  const legacy = legacyByCode.get(course.id);
  return legacy?.status === "available" ? getLesson(legacy.id) : undefined;
}

export function filterCourses(courses: Course[], query: string, status: CourseStatus | "all"): Course[] {
  const q = query.trim().toLocaleLowerCase();
  return courses.filter(c => (status === "all" || c.status === status)
    && `${c.id} ${c.title}`.toLocaleLowerCase().includes(q));
}
