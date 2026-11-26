import catalogue from "./knowledge-ids.json";

export type KnowledgeLocation = { id: string; course: string; module: string; title: string };
const topics: KnowledgeLocation[] = catalogue.map(([id, course, module, title]) => ({ id: id!, course: course!, module: module!, title: title! }));
const byId = new Map(topics.map(topic => [topic.id, topic]));
const byLocation = new Map(topics.map(topic => [topic.course + "/" + topic.module + "/" + topic.title, topic]));
export { topics as knowledgeRegistry };
export const findKnowledge = (id: string) => byId.get(id);
export const knowledgeAt = (course: string, module: string, title: string) => byLocation.get(course + "/" + module + "/" + title);
export const knowledgeLink = (id: string) => "/topics/" + id;
