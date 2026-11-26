import type { CatalogLesson } from "./catalog";
import { d01, d02, d03, d04 } from "./lessons/game-basics";

export const trackDUnits = [{ id: "d1", title: "让角色动起来" }];
export const trackDLessons = [d01, d02, d03, d04];
export const trackDCatalog: CatalogLesson[] = trackDLessons.map(({ id, title, unit }) => ({
  id, title, unit, status: "available",
}));
