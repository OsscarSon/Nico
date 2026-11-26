import type { CatalogLesson } from "./catalog";
import { d01, d02, d03, d04 } from "./lessons/game-basics";
import { d05, d06, d07, d08 } from "./lessons/d-route/systems";
import { d09, d10, d11, d12 } from "./lessons/d-route/unity";
import { d13, d14, d15, d16 } from "./lessons/d-route/ship";

export const trackDUnits = [
  { id: "d1", title: "让角色动起来" },
  { id: "d2", title: "物理、规则与反馈" },
  { id: "d3", title: "Unity 与脚本基础" },
  { id: "d4", title: "界面、资源与作品" },
];

export const trackDLessons = [
  d01, d02, d03, d04, d05, d06, d07, d08,
  d09, d10, d11, d12, d13, d14, d15, d16,
];
export const trackDCatalog: CatalogLesson[] = trackDLessons.map(({ id, title, unit }) => ({
  id, title, unit, status: "available",
}));
