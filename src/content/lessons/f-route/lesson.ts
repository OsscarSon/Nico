import { fSims } from "../../../grading/f-route/ids";
import { lessonSchema, type Block, type QuizItem } from "../../schema";

export const fLessonIds = [
  "f01-circuits-current", "f02-sensors-actuators", "f03-arduino-intro", "f04-signals",
  "f05-read-sensors", "f06-motors-servos", "f07-uart-i2c", "f08-rover-project",
] as const;

type Study = {
  no: number; title: string; hook: string; objectives: string[];
  sections: [string, string, ...string[]][]; experiment: [string, string, string]; quiz: QuizItem[];
  transfer: Omit<Extract<Block, { type: "transfer" }>, "type">;
  summary: [string, string, string]; sources: [string, string][];
};

export function q(stem: string, options: [string, string, string], answer: 0 | 1 | 2, why: string, hints: [string, string]): QuizItem {
  const wrong = options.map((_, i) => i).filter(i => i !== answer);
  return { q: stem, options, answer, why, wrongHints: Object.fromEntries(wrong.map((i, j) => [String(i), hints[j]!])) };
}

export function lesson(data: Study) {
  const index = data.no - 1;
  const id = fLessonIds[index]!;
  const sim = fSims[index]!;
  const [title, free, challenge] = data.experiment;
  return lessonSchema.parse({
    id, track: "f", unit: data.no <= 4 ? "f1" : "f2", title: data.title, objectives: data.objectives,
    art: "lesson-" + id + ".png", quality: { state: "draft" }, estimatedMinutes: 11,
    prerequisites: index ? [fLessonIds[index - 1]] : [],
    blocks: [
      { type: "hook", text: data.hook },
      ...data.sections.map(([title, ...body]) => ({ type: "explain", title, body })),
      { type: "sim", sim, mode: "free", title, intro: free },
      { type: "sim", sim, mode: "challenge", title: "挑战 · " + title, intro: challenge },
      { type: "quiz", items: data.quiz },
      { type: "transfer", ...data.transfer },
      { type: "summary", points: data.summary, next: fLessonIds[index + 1] },
    ],
    sources: data.sources.map(([title, url]) => ({ title, url })),
  });
}
