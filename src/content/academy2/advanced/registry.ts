import available from "./available.json";
import { findKnowledge, knowledgeRegistry } from "../knowledgeRegistry";

export const p4Courses = [
  "foundation-programming",
  "intermediate-programming",
  "foundation-systems",
  "intermediate-systems",
  "foundation-software",
  "intermediate-software",
  "foundation-security",
  "intermediate-security",
  "advanced-mathematics",
  "advanced-statistics",
  "advanced-programming",
  "advanced-systems",
  "advanced-data-science",
  "advanced-ai",
  "advanced-software",
  "advanced-security",
] as const;

export const p4Course = (id: string) =>
  (p4Courses as readonly string[]).includes(id);
const taught = new Set<string>(available);
export const p4Topic = (id: string) =>
  taught.has(id) ? findKnowledge(id) : undefined;
export const p4TopicsIn = (course: string) =>
  knowledgeRegistry
    .filter((item) => item.course === course && taught.has(item.id))
    .map((item) => item.id);

export type LabArea =
  "math" | "statistics" | "algorithms" | "systems" | "data" | "ml" | "research";
export const p4LabLink = (area: LabArea, id: string, topic?: string) =>
  "/lab/" + area + "?advanced=" + id + (topic ? "&from=" + topic : "");
