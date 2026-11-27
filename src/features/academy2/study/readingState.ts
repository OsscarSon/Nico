import { findKnowledge } from "../../../content/academy2/knowledgeRegistry";
import { changeStudy, type Study, type Bookmark } from "../../../progress/study";

export const readingLink = (id: string, anchor?: string) =>
  "/topics/" + id + (anchor && anchor !== "reading-top" ? "?at=" + encodeURIComponent(anchor) : "");
export function bookmarkPath(item: Bookmark) {
  return item.kind === "course" ? "/courses/" + item.topic : readingLink(item.topic, item.anchor);
}
export function chooseRecent(data: Study) {
  return Object.entries(data.visits)
    .map(([id, visit]) => ({ id, title: findKnowledge(id)?.title ?? id, ...visit }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 30);
}
export function saveVisit(id: string, anchor: string) {
  changeStudy((data) => ({ ...data, visits: { ...data.visits, [id]: { anchor, at: Date.now() } } }));
}
