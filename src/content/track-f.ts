import type { CatalogLesson } from "./catalog";
import { f01, f02, f03, f04 } from "./lessons/f-route/basics";
import { f05, f06, f07, f08 } from "./lessons/f-route/robotics";

export const trackFUnits = [
  { id: "f1", title: "电路、信号与控制" },
  { id: "f2", title: "读数、通信与小车" },
];
export const trackFLessons = [f01, f02, f03, f04, f05, f06, f07, f08];
export const trackFCatalog: CatalogLesson[] = trackFLessons.map(({ id, title, unit }) => ({
  id, title, unit, status: "available",
}));
