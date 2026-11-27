import { teaching } from "./authoring";
import { foundation } from "./foundation";
import { intermediate } from "./intermediate";
import { advanced } from "./advanced";

const curriculum = { ...foundation, ...intermediate, ...advanced };
export const algorithmLessons = Object.entries(curriculum).map(
  ([key, material]) => teaching(key, material),
);
const byId = new Map(algorithmLessons.map((item) => [item.id, item]));
export const findAlgorithmLesson = (id: string) => byId.get(id);
