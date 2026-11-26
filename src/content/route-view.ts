import { foundationCatalogLessons, getLesson } from ".";
import { academyTracks, coursesFor, liveLessonFor, type Course, type Stage } from "./academy";
import { getTrack } from "./catalog";
import type { Progress } from "../progress/store";

export const unitArt: Record<string, string> = { a1: "unit-a1-digital.png", a2: "unit-a2-computer.png", a3: "unit-a3-network.png", a4: "unit-a4-security.png" };
export const plannedArt: Record<string, string> = { A21: "planned-a21-http-status.png", A22: "planned-a22-error-logs.png" };
export function routeNode(course: Course) {
  const legacy = course.stage === "Foundation" ? foundationCatalogLessons().find(l => l.id.split("-")[0]?.toUpperCase() === course.id) : undefined;
  const lesson = liveLessonFor(course);
  return { code: course.id, course, lesson, id: lesson?.id ?? legacy?.id ?? course.id.toLowerCase(), available: !!lesson, unit: lesson?.unit ?? legacy?.unit ?? (course.track === "A" && course.stage === "Foundation" ? "a3" : `${course.track.toLowerCase()}-planned`), plannedArt: plannedArt[course.id] };
}
export type RouteNode = ReturnType<typeof routeNode>;
/** Curriculum availability + existing registry identity, one deterministic view for catalog, map and summaries. */
export function routeView(trackId: string, stage: Stage = "Foundation") {
  const identity = academyTracks.find(t => t.id.toLowerCase() === trackId.toLowerCase());
  if (!identity) return undefined;
  const legacy = getTrack(trackId.toLowerCase());
  const nodes = coursesFor(stage, identity.id).map(routeNode);
  const definitions = stage === "Foundation" ? legacy?.units ?? []
    : [...new Set(nodes.filter(node => node.available).map(node => node.unit))]
        .map(id => ({ id, title: "中阶课程" }));
  const units = [...definitions.map(u => ({ ...u, art: unitArt[u.id], nodes: nodes.filter(n => n.unit === u.id) }))];
  for (const unit of [...new Set(nodes.filter(n => !definitions.some(u => u.id === n.unit)).map(n => n.unit))]) units.push({ id: unit, title: stage === "Foundation" ? "后续规划" : `${stage === "Intermediate" ? "中阶" : "进阶"}主题规划`, art: undefined, nodes: nodes.filter(n => n.unit === unit) });
  return { id: identity.id.toLowerCase(), title: identity.title, art: identity.art, tagline: identity.subtitle, stage, nodes, units };
}
export type RouteView = NonNullable<ReturnType<typeof routeView>>;
export function nodeState(node: RouteNode, progress: Progress, currentId?: string) {
  if (!node.available) return "planned";
  if (progress.lessons[node.id]) return "completed";
  return node.id === currentId ? "current" : "available";
}
export function routeCounts(nodes: RouteNode[], progress: Progress) {
  return { total: nodes.length, available: nodes.filter(n => n.available).length, planned: nodes.filter(n => !n.available).length, completed: nodes.filter(n => n.available && progress.lessons[n.id]).length };
}
export function continuation(progress: Progress, resumeHome = true, preferred = "") {
  const resume = resumeHome && progress.resume && !progress.lessons[progress.resume.lessonId] ? getLesson(progress.resume.lessonId) : undefined;
  return resume ?? foundationCatalogLessons().filter(c => c.status === "available").map(c => getLesson(c.id)!).find(l => !progress.lessons[l.id] && (!preferred || l.track === preferred)) ?? foundationCatalogLessons().filter(c => c.status === "available").map(c => getLesson(c.id)!).find(l => !progress.lessons[l.id]);
}
