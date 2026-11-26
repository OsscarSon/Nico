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

export type Target = { course: string; module?: string; topic?: string };
const target = (course: string, module?: string, topic?: string): Target => ({ course, module, topic });
const crossCourse: Record<string, Target[]> = {
  "foundation-algorithms": [target("foundation-programming", "control"), target("foundation-mathematics", "proof")],
  "foundation-data-science": [target("foundation-statistics", "data"), target("foundation-programming", "collections")],
  "foundation-ai": [target("foundation-mathematics", "vectors"), target("foundation-statistics", "probability")],
  "foundation-software": [target("foundation-programming", "syntax")],
  "foundation-security": [target("foundation-systems", "network")],
  "foundation-applied": [target("foundation-programming", "control")],
  "intermediate-mathematics": [target("foundation-programming", "control")],
  "intermediate-statistics": [target("intermediate-mathematics", "calculus")],
  "intermediate-algorithms": [target("intermediate-mathematics", "discrete"), target("intermediate-programming", "python")],
  "intermediate-data-science": [target("intermediate-statistics", "inference"), target("intermediate-programming", "python")],
  "intermediate-ai": [target("intermediate-mathematics", "linear-algebra"), target("intermediate-statistics", "inference"), target("intermediate-algorithms", "structures")],
  "intermediate-software": [target("intermediate-programming", "async"), target("intermediate-data-science", "database-design")],
  "intermediate-security": [target("intermediate-systems", "networks"), target("intermediate-mathematics", "discrete")],
  "intermediate-applied": [target("intermediate-programming", "languages")],
  "advanced-algorithms": [target("intermediate-mathematics", "discrete")],
  "advanced-programming": [target("intermediate-mathematics", "discrete")],
  "advanced-systems": [target("intermediate-algorithms", "graphs"), target("advanced-data-science", "pipelines"), target("intermediate-ai", "evaluation")],
  "advanced-data-science": [target("intermediate-algorithms", "design")],
  "advanced-ai": [target("intermediate-statistics", "inference"), target("intermediate-mathematics", "calculus"), target("advanced-systems", "distributed")],
  "advanced-software": [target("intermediate-systems", "virtualization"), target("intermediate-data-science", "database-design")],
  "advanced-security": [target("intermediate-statistics", "inference"), target("intermediate-ai", "evaluation")],
};
export const topicDependencies: Record<string, Target[]> = {
  "advanced-ai/attention/Attention": [
    target("intermediate-mathematics", "linear-algebra", "线性代数：矩阵运算"),
    target("foundation-mathematics", "vectors", "向量点积"),
    target("intermediate-ai", "reasoning", "Softmax"),
    target("intermediate-statistics", "variables", "联合与条件分布"),
    target("intermediate-mathematics", "calculus", "梯度"),
  ],
  "intermediate-ai/supervised/线性回归": [
    target("intermediate-mathematics", "linear-algebra", "最小二乘"), target("foundation-statistics", "visualization", "相关性"),
  ],
  "intermediate-algorithms/graphs/Dijkstra": [
    target("intermediate-algorithms", "graphs", "图表示"), target("intermediate-algorithms", "structures", "Heap"),
  ],
};
export function courseDependencies(course: AcademyCourse): Target[] {
  const index = phases.findIndex(phase => phase.id === course.stage);
  return [...index > 0 ? [target(phases[index - 1]!.id + "-" + course.domain)] : [], ...crossCourse[course.id] ?? []];
}
export function moduleDependencies(course: AcademyCourse, moduleId: string): Target[] {
  const index = course.modules.findIndex(module => module.id === moduleId);
  const context = courseDependencies(course);
  return index > 0 ? [target(course.id, course.modules[index - 1]!.id), ...context.slice(0, 2)] : context;
}
export function lessonDependencies(id: string) {
  return getLesson(id)?.prerequisites.map(lessonId => ({ lesson: getLesson(lessonId), position: primaryLocation(lessonId) })).filter(result => result.lesson || result.position) ?? [];
}
export function topicPrerequisites(course: AcademyCourse, module: AcademyModule, topic: string): Target[] {
  const explicit = topicDependencies[course.id + "/" + module.id + "/" + topic];
  if (explicit) return explicit;
  const topics = module.chapters.flat();
  const prior = topics[topics.indexOf(topic) - 1];
  return prior ? [target(course.id, module.id, prior), ...moduleDependencies(course, module.id).slice(0, 1)] : moduleDependencies(course, module.id);
}
export function labelTarget(value: Target) {
  const course = getAcademyCourse(value.course)!;
  return value.topic ?? course.modules.find(module => module.id === value.module)?.title ?? course.title;
}
