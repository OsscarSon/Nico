import type { CLabKey } from "../../grading/c-route/types";
import { lessonSchema, type Lesson, type QuizItem } from "../schema";
import { trackCCatalog } from "../track-c-catalog";

export type CLessonSpec = {
  id: string;
  lab: CLabKey;
  hook: string;
  objectives: [string, string, string];
  sections: [string, string, string][];
  practice: string;
  challenge: string;
  quiz: [QuizItem, QuizItem, QuizItem];
  transfer: [prompt: string, answer: number, why: string];
  summary: [string, string, string];
  sources: [title: string, url: string][];
};

export function question(q: string, correct: string, why: string,
  distractors: [string, string][], answer = 0): QuizItem {
  const options = distractors.map(([text]) => text);
  options.splice(answer, 0, correct);
  const wrongHints = Object.fromEntries(distractors.map(([, hint], i) => [i < answer ? i : i + 1, hint]));
  return { q, options, answer, why, wrongHints };
}

export function cLesson(spec: CLessonSpec): Lesson {
  const index = trackCCatalog.findIndex(item => item.id === spec.id);
  const entry = trackCCatalog[index];
  if (!entry) throw new Error(`C lesson has no catalog entry: ${spec.id}`);
  const prior = trackCCatalog[index - 1];
  return lessonSchema.parse({
    id: entry.id, track: "c", unit: entry.unit, title: entry.title,
    art: `lesson-${entry.id}.png`, quality: { state: "draft" },
    objectives: spec.objectives, prerequisites: prior ? [prior.id] : [], estimatedMinutes: 12,
    blocks: [
      { type: "hook", text: spec.hook },
      ...spec.sections.map(([title, first, second]) => ({ type: "explain", title, body: [first, second] })),
      { type: "sim", sim: "ai-route-lab", cLab: spec.lab, mode: "free", title: "自由实验", intro: spec.practice },
      { type: "sim", sim: "ai-route-lab", cLab: spec.lab, mode: "challenge", title: "操作挑战", intro: spec.challenge },
      { type: "quiz", items: spec.quiz },
      { type: "transfer", prompt: spec.transfer[0], answer: spec.transfer[1], why: spec.transfer[2] },
      { type: "summary", points: spec.summary, next: trackCCatalog[index + 1]?.id },
    ],
    sources: spec.sources.map(([title, url]) => ({ title, url })),
  });
}
