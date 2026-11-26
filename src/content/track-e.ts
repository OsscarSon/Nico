import type { CatalogLesson } from "./catalog";
import { e01, e02, e03, e04 } from "./lessons/e-route/sheets";
import { e05, e06, e07, e08 } from "./lessons/e-route/analysis";
import { e09, e10, e11, e12 } from "./lessons/e-route/automation";
import { e13, e14, e15, e16 } from "./lessons/e-route/projects";

export const trackEUnits = [
  { id: "e1", title: "表格与公式" },
  { id: "e2", title: "清洗、汇总与图表" },
  { id: "e3", title: "脚本与安全自动化" },
  { id: "e4", title: "数据工作流与报表" },
];

export const trackELessons = [
  e01, e02, e03, e04, e05, e06, e07, e08,
  e09, e10, e11, e12, e13, e14, e15, e16,
];
export const trackECatalog: CatalogLesson[] = trackELessons.map(({ id, title, unit }) => ({
  id, title, unit, status: "available",
}));
