import data from "./curriculum.json";
import { curriculum, liveLessonFor } from "../academy";
import { getLesson } from "..";
import { continuation } from "../route-view";
import type { Progress } from "../../progress/store";
import { expandCodes, placements, relatedEntries } from "./migration";
import type { PersonalPathId } from "./paths";
import { getPersonalPath } from "./paths";

export const phases = [
  { id: "foundation", title: "基础", english: "Foundation", intro: "从零开始，掌握数学、数据、编程和计算机的共同语言。" },
  { id: "intermediate", title: "中阶", english: "Intermediate", intro: "连接大学核心知识，独立拆解和解决实际问题。" },
  { id: "advanced", title: "进阶", english: "Advanced", intro: "深入理论、生产系统及研究。按兴趣选择延伸方向。" },
] as const;
export type Phase = (typeof phases)[number]["id"];

export const domains = [
  { id: "mathematics", title: "数学", english: "Mathematics", art: "track-m-math.png", accent: "lime" },
  { id: "statistics", title: "统计学", english: "Statistics", art: "lesson-e08-charts.png", accent: "mint" },
  { id: "programming", title: "编程", english: "Programming", art: "track-b-code.png", accent: "sky" },
  { id: "algorithms", title: "算法", english: "Algorithms", art: "lesson-b-i06.png", accent: "violet" },
  { id: "systems", title: "计算机系统", english: "Computer Systems", art: "track-a-network.png", accent: "sky" },
  { id: "data-science", title: "数据科学", english: "Data Science", art: "lesson-b-i05.png", accent: "mint" },
  { id: "ai", title: "人工智能", english: "Artificial Intelligence", art: "track-c-ai.png", accent: "violet" },
  { id: "software", title: "软件工程", english: "Software Engineering", art: "lesson-b-i08.png", accent: "sky" },
  { id: "security", title: "安全与科研", english: "Security & Research", art: "lesson-a-i05.png", accent: "amber" },
  { id: "applied", title: "专项应用", english: "Applied Computing", art: "track-f-hardware.png", accent: "amber" },
] as const;
export type Domain = (typeof domains)[number]["id"];
type Outline = { id: string; title: string; chapters: string[][] };
type Blueprint = { id: string; domain: Domain; stage: Phase; title: string; english: string; project: string; modules: Outline[] };

const legacy = new Map(curriculum.map(course => [course.id, { course, lesson: liveLessonFor(course) }]));
export type LegacyEntry = NonNullable<ReturnType<typeof legacy.get>>;
function entries(spec = "") {
  return expandCodes(spec).map(code => {
    const entry = legacy.get(code);
    if (!entry) throw new Error("旧目录中找不到 " + code);
    return entry;
  });
}

const topicAdditions: Record<string, string[]> = {
  "foundation-mathematics/vectors": ["向量点积"],
  "intermediate-ai/reasoning": ["Softmax"],
};

export const academyCourses = (data as Blueprint[]).map(course => ({
  ...course,
  modules: course.modules.map(module => {
    const key = course.id + "/" + module.id;
    const added = topicAdditions[key];
    return {
      ...module,
      chapters: added ? [...module.chapters, added] : module.chapters,
      entries: entries(placements[course.id]?.[module.id]),
      related: entries(relatedEntries[key]),
    };
  }),
}));
export type AcademyCourse = typeof academyCourses[number];
export type AcademyModule = AcademyCourse["modules"][number];
export const getAcademyCourse = (id: string) => academyCourses.find(course => course.id === id);
export const getDomain = (id: Domain) => domains.find(domain => domain.id === id)!;
export const getPhase = (id: Phase) => phases.find(phase => phase.id === id)!;
export const liveLessons = (course: AcademyCourse) => course.modules.flatMap(module => module.entries.flatMap(entry => entry.lesson ? [entry.lesson] : []));
export function moduleLessons(course: AcademyCourse, id?: string) {
  if (!id) return liveLessons(course);
  const module = course.modules.find(part => part.id === id);
  return module ? [...module.entries, ...module.related].flatMap(entry => entry.lesson ? [entry.lesson] : []) : [];
}
export const uniqueLiveCount = academyCourses.reduce((sum, course) => sum + liveLessons(course).length, 0);
export function courseLink(id: string, module?: string, topic?: string) {
  const query = new URLSearchParams();
  if (module) query.set("module", module);
  if (topic) query.set("topic", topic);
  return "/courses/" + id + (query.size ? "?" + query.toString() : "");
}

export function primaryLocation(id: string) {
  for (const course of academyCourses) {
    const module = course.modules.find(part => part.entries.some(entry => entry.course.id === id || entry.lesson?.id === id));
    if (module) return { course, module };
  }
  return undefined;
}

export function pathContinuation(id: PersonalPathId | "", progress: Progress) {
  const path = getPersonalPath(id);
  if (!path) return undefined;
  for (const [, courseId, moduleId] of path.steps) {
    const course = getAcademyCourse(courseId)!;
    const next = moduleLessons(course, moduleId).find(lesson => !progress.lessons[lesson.id]);
    if (next) return next;
  }
  return undefined;
}
export function recommendedLesson(progress: Progress, resume: boolean, oldTrack: string, personal: PersonalPathId | "") {
  const recent = resume && progress.resume && !progress.lessons[progress.resume.lessonId] ? getLesson(progress.resume.lessonId) : undefined;
  return recent ?? pathContinuation(personal, progress) ?? continuation(progress, false, oldTrack);
}

export type { Target, Dependency } from "./knowledgeGraph";
import { dependenciesOf, type Target } from "./knowledgeGraph";
import { knowledgeAt } from "./knowledgeRegistry";

export const courseDependencies = (course: AcademyCourse) => dependenciesOf(course.id);
export const moduleDependencies = (course: AcademyCourse, moduleId: string) => dependenciesOf(course.id + "/" + moduleId);
export const topicDependencies = {
  "advanced-ai/attention/Attention": dependenciesOf(knowledgeAt("advanced-ai", "attention", "Attention")!.id),
};

export function lessonDependencies(id: string) {
  return getLesson(id)?.prerequisites.map(lessonId => ({ lesson: getLesson(lessonId), position: primaryLocation(lessonId) })).filter(result => result.lesson || result.position) ?? [];
}
export function topicPrerequisites(course: AcademyCourse, module: AcademyModule, topic: string) {
  return dependenciesOf(knowledgeAt(course.id, module.id, topic)?.id ?? "");
}
export function labelTarget(value: Target) {
  const course = getAcademyCourse(value.course)!;
  return value.topic ?? course.modules.find(module => module.id === value.module)?.title ?? course.title;
}
