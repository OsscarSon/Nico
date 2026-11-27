import { useSyncExternalStore, type ComponentProps } from "react";

/** 极简 hash 路由：不依赖第三方库，GitHub Pages 上刷新也不会 404。 */
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const read = () => {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
};
export const usePath = () => useSyncExternalStore(subscribe, read, () => "/");

export const navigate = (to: string) => {
  window.location.hash = to;
};

export function Link({
  to,
  ...rest
}: { to: string } & Omit<ComponentProps<"a">, "href">) {
  return <a href={`#${to}`} {...rest} />;
}

export type Match =
  | { name: "home" }
  | { name: "paths" }
  | { name: "courses" }
  | { name: "course"; courseId: string }
  | { name: "track"; trackId: string }
  | { name: "lesson"; lessonId: string }
  | { name: "knowledge-lesson"; id: string }
  | { name: "lab" }
  | { name: "academy-lab"; id: string }
  | { name: "knowledge" }
  | { name: "resources" }
  | { name: "study" }
  | { name: "prompt-lab" }
  | { name: "tutor"; lessonId?: string }
  | { name: "projects" }
  | { name: "academy-project"; id: string }
  | { name: "me" }
  | { name: "settings" }
  | { name: "notfound" };

export function matchRoute(path: string): Match {
  const parts = path.split("?")[0]!.split("/").filter(Boolean).map(decodeURIComponent);
  const [a, b, c, ...more] = parts;
  if (more.length) return { name: "notfound" };
  if (a === "lab" && b === "prompt" && !c) return { name: "prompt-lab" };
  if (a === "lab" && b === "tutor") return c ? { name: "tutor", lessonId: c } : { name: "tutor" };
  if (c) return { name: "notfound" };
  if (!a) return { name: "home" };
  if (a === "courses" && !b) return { name: "courses" };
  if (a === "courses" && b) return { name: "course", courseId: b };
  if (a === "paths" && !b) return { name: "paths" };
  if (a === "paths" && b) return { name: "track", trackId: b };
  if (a === "lesson" && b) return { name: "lesson", lessonId: b };
  if (a === "topics" && b) return { name: "knowledge-lesson", id: b };
  if (!b && a === "lab") return { name: "lab" };
  if (a === "lab" && b) return { name: "academy-lab", id: b };
  if (!b && a === "graph") return { name: "knowledge" };
  if (!b && a === "study") return { name:"study" };
  if (!b && a === "resources") return { name: "resources" };
  if (!b && a === "projects") return { name: "projects" };
  if (a === "projects" && b) return { name: "academy-project", id: b };
  if (!b && a === "me") return { name: "me" };
  if (!b && a === "settings") return { name: "settings" };
  return { name: "notfound" };
}
