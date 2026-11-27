import { knowledgeRegistry } from "../knowledgeRegistry";

export const algorithmCourses = [
  "foundation-algorithms",
  "intermediate-algorithms",
  "advanced-algorithms",
] as const;
export type AlgorithmCourse = (typeof algorithmCourses)[number];
export const isAlgorithmCourse = (id: string): id is AlgorithmCourse =>
  (algorithmCourses as readonly string[]).includes(id);
const ids = {
  correct: "k-494dfbd26c5e",
  cost: "k-7c9c2d87892c",
  linear: "k-4d7f53ed5633",
  binary: "k-2ff5b3b7875e",
  sorting: "k-8ef37a03c6ff",
  array: "k-53c7175577d8",
  list: "k-527241e53fee",
  stack: "k-353ad87ed5a1",
  queue: "k-6d4d43c735bf",
  hash: "k-894fa5cb59f6",
  recursive: "k-32c01df48a3d",
  "tree-graph": "k-589d2767b853",
  "big-o": "k-62d187108943",
  omega: "k-2a53cc99f40d",
  theta: "k-b1da25fe55c6",
  recurrence: "k-50fdb7b45a22",
  derivation: "k-995adf16d8e7",
  linked: "k-712306d0d959",
  hashtable: "k-3ba20d509029",
  bst: "k-c23ed71b701c",
  avl: "k-51f26af537a1",
  heap: "k-07f40cb22cea",
  trie: "k-93d860c2f0b2",
  union: "k-9286bb3a8e1e",
  representation: "k-386aea145417",
  bfs: "k-46aa2ef31b1f",
  dfs: "k-3554d1992099",
  topo: "k-8d6c83aa3300",
  dijkstra: "k-58cba2ff9cb8",
  bellman: "k-d6de0d96fe9c",
  mst: "k-1033fdacd4cc",
  divide: "k-b17d84d0f79b",
  greedy: "k-0afaa924aaa3",
  backtrack: "k-5b7325053a74",
  dp: "k-984b15fbdf16",
  window: "k-37ebb735fe98",
  pointers: "k-8bc200da107b",
  prefix: "k-9d8af04ed211",
  amortized: "k-68ec66217cce",
  proof: "k-7934ff104beb",
  segment: "k-11496b028938",
  fenwick: "k-f719d4373c12",
  suffix: "k-a90d4d853482",
  kmp: "k-fbe92b8acc17",
  flow: "k-41bc6d738bbe",
  matching: "k-ccace5f80830",
  geometry: "k-b64b772ec206",
  random: "k-c0db68a0e869",
  approx: "k-aa1d8f08a6ec",
  online: "k-004921d63f56",
  fpt: "k-bfa7cb28f42b",
  dfa: "k-713d4f2ab857",
  tm: "k-cfc5fdc4bf73",
  computable: "k-175b3e8c96ad",
  halting: "k-7176b811c05b",
  p: "k-d6b6252197cc",
  np: "k-a9cc028fd116",
  hard: "k-eeb7a61a7906",
  complete: "k-06e5ea0dfc81",
  reduction: "k-d8e0bc956dab",
} as const;
const locations = new Map(knowledgeRegistry.map((topic) => [topic.id, topic]));
const topics = Object.entries(ids).map(([key, id]) => {
  const topic = locations.get(id);
  if (!topic || !isAlgorithmCourse(topic.course))
    throw Error("算法知识点 ID 无效 " + id);
  return { ...topic, course: topic.course, key };
});
const byId = new Map(topics.map((topic) => [topic.id, topic]));
const byKey = new Map(topics.map((topic) => [topic.key, topic]));
export const algorithmTopics = topics;
export const algorithmTopic = (id: string) => byId.get(id);
export const algorithmKey = (key: string) => byKey.get(key);
export const algorithmIds = (course: string) =>
  topics.filter((topic) => topic.course === course).map((topic) => topic.id);
