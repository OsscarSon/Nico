import { teach } from "./authoring";
import { foundationData } from "./foundationData";
import { intermediateData } from "./intermediateData";
import { foundationAI } from "./foundationAI";
import { intermediateAI } from "./intermediateAI";

export const dataLessons = Object.entries({
  ...foundationData,
  ...intermediateData,
  ...foundationAI,
  ...intermediateAI,
}).map(([id, m]) => teach(id, m));
const index = new Map(dataLessons.map((lesson) => [lesson.id, lesson]));
export const findDataLesson = (id: string) => index.get(id);
