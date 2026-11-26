import { lessonSchema, type Block, type QuizItem } from "../../schema";
import type { LabId } from "../../../grading/ab-courses/model";

type LessonData = {
  id: string;
  art?: string;
  unit?: string;
  lab: LabId;
  title: string;
  hook: string;
  objectives: string[];
  prerequisites: string[];
  sections: [title: string, first: string, second: string, simplification?: string][];
  experiment: string;
  questions: QuizItem[];
  transfer: [prompt: string, answer: number, why: string];
  review: [string, string, string];
  next?: string;
  sources: [title: string, url: string][];
};

export function question(q: string, right: string, why: string, first: [string, string], second: [string, string], answer = 0): QuizItem {
  const options = [first[0], second[0]];
  options.splice(answer, 0, right);
  const wrongPositions = [0, 1, 2].filter(index => index !== answer);
  return { q, options, answer, why, wrongHints: { [wrongPositions[0]!]: first[1], [wrongPositions[1]!]: second[1] } };
}

export function abLesson(data: LessonData) {
  const stage = data.id.includes("-i") ? "Intermediate" : undefined;
  const track = data.id[0];
  const blocks: Block[] = [
    { type: "hook", text: data.hook },
    ...data.sections.map(([title, first, second, callout]): Block => ({ type: "explain", title, body: [first, second], callout })),
    { type: "sim", sim: "ab-course-lab", abLab: data.lab, mode: "free", title: "自由实验", intro: data.experiment },
    { type: "sim", sim: "ab-course-lab", abLab: data.lab, mode: "challenge", title: "操作挑战", intro: "按任务要求运行实验。对照每条实际结果，逐项找出需要调整的位置。" },
    { type: "quiz", items: data.questions },
    { type: "transfer", prompt: data.transfer[0], answer: data.transfer[1], why: data.transfer[2] },
    { type: "summary", points: data.review, next: data.next },
  ];
  return lessonSchema.parse({
    id: data.id, track, stage, unit: data.unit ?? track + "-intermediate",
    title: data.title, art: data.art ?? "lesson-" + data.id + ".png", estimatedMinutes: stage ? 15 : 12,
    objectives: data.objectives, prerequisites: data.prerequisites, blocks,
    sources: data.sources.map(([title, url]) => ({ title, url })), quality: { state: "draft" },
  });
}
