import { eSims } from "../../../grading/e-route/ids";
import { lessonSchema, type Block, type QuizItem } from "../../schema";

export const eLessonIds = [
  "e01-formula-basics", "e02-cell-references", "e03-conditional-formulas", "e04-lookup",
  "e05-dates-text", "e06-data-cleaning", "e07-pivot", "e08-charts",
  "e09-apps-script", "e10-triggers", "e11-workflow", "e12-gemini-api",
  "e13-colab", "e14-looker-studio", "e15-data-pipeline", "e16-report-project",
] as const;

type Study = {
  no: number; title: string; hook: string; objectives: string[];
  sections: [string, string, ...string[]][];
  experiment: [string, string, string]; quiz: QuizItem[]; summary: [string, string, string];
  transfer: Omit<Extract<Block, { type: "transfer" }>, "type">;
  sources: (readonly [string, string])[];
};

export const sheets = ["Google Sheets · 函数列表", "https://support.google.com/docs/table/25273?hl=en"] as const;
export const excel = ["Microsoft Support · Excel 函数分类", "https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb"] as const;
export const script = ["Google · Apps Script 概览", "https://developers.google.com/apps-script/overview"] as const;

export function q(stem: string, options: [string, string, string], answer: 0 | 1 | 2, why: string, hints: [string, string]): QuizItem {
  return { q: stem, options, answer, why, wrongHints: Object.fromEntries(
    [0, 1, 2].filter(i => i !== answer).map((i, j) => [String(i), hints[j]!])
  ) };
}

export function lesson(data: Study) {
  const index = data.no - 1;
  const id = eLessonIds[index]!;
  const sim = eSims[index]!;
  const [title, free, challenge] = data.experiment;
  return lessonSchema.parse({
    id, track: "e", unit: "e" + Math.ceil(data.no / 4), title: data.title, objectives: data.objectives,
    prerequisites: index ? [eLessonIds[index - 1]] : [], estimatedMinutes: 11,
    art: "lesson-" + id + (data.no === 1 ? "-centered" : "") + ".png",
    quality: { state: "draft" },
    blocks: [
      { type: "hook", text: data.hook },
      ...data.sections.map(([title, ...body]) => ({ type: "explain", title, body })),
      { type: "sim", sim, mode: "free", title, intro: free },
      { type: "sim", sim, mode: "challenge", title: "挑战 · " + title, intro: challenge },
      { type: "quiz", items: data.quiz },
      { type: "transfer", ...data.transfer },
      { type: "summary", points: data.summary, next: eLessonIds[index + 1] },
    ],
    sources: data.sources.map(([title, url]) => ({ title, url })),
  });
}
