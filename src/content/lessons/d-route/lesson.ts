import { lessonSchema, type Block, type Lesson, type QuizItem } from "../../schema";
import type { GameRouteSim } from "../../../grading/game-route/ids";

type Study = {
  id: string; unit: "d2" | "d3" | "d4"; title: string; previous: string; next?: string;
  objectives: string[]; hook: string; sections: [string, string, ...string[]][];
  simulator: GameRouteSim; experiment: [string, string, string]; quiz: QuizItem[];
  transfer: Omit<Extract<Block, { type: "transfer" }>, "type">;
  summary: [string, string, string]; sources: [string, string][];
};

export function question(q: string, options: [string, string, string, string], answer: number, why: string, diagnostics: [string, string, string]): QuizItem {
  const mistakes = options.map((_, i) => i).filter(i => i !== answer);
  return { q, options, answer, why, wrongHints: Object.fromEntries(mistakes.map((i, j) => [String(i), diagnostics[j]!])) };
}

export function dLesson(data: Study): Lesson {
  const [title, free, challenge] = data.experiment;
  return lessonSchema.parse({
    id: data.id, track: "d", unit: data.unit, title: data.title, objectives: data.objectives,
    prerequisites: [data.previous], estimatedMinutes: 11, quality: { state: "draft" },
    art: data.id === "d10-game-object" ? "lesson-d10-game-object-centered.png" : `lesson-${data.id}.png`,
    sources: data.sources.map(([title, url]) => ({ title, url })),
    blocks: [
      { type: "hook", text: data.hook },
      ...data.sections.map(([title, ...body]) => ({ type: "explain", title, body })),
      { type: "sim", sim: data.simulator, mode: "free", title, intro: free },
      { type: "sim", sim: data.simulator, mode: "challenge", title: `挑战 · ${title}`, intro: challenge },
      { type: "quiz", items: data.quiz },
      { type: "transfer", ...data.transfer },
      { type: "summary", points: data.summary, next: data.next },
    ],
  });
}
