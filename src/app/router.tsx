import { useSyncExternalStore, type AnchorHTMLAttributes } from "react";

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
}: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return <a href={`#${to}`} {...rest} />;
}

export type Match =
  | { name: "home" }
  | { name: "paths" }
  | { name: "track"; trackId: string }
  | { name: "lesson"; lessonId: string }
  | { name: "lab" }
  | { name: "projects" }
  | { name: "me" }
  | { name: "notfound" };

export function matchRoute(path: string): Match {
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const [a, b, ...more] = parts;
  if (more.length) return { name: "notfound" };
  if (!a) return { name: "home" };
  if (a === "paths" && !b) return { name: "paths" };
  if (a === "paths" && b) return { name: "track", trackId: b };
  if (a === "lesson" && b) return { name: "lesson", lessonId: b };
  if (!b && a === "lab") return { name: "lab" };
  if (!b && a === "projects") return { name: "projects" };
  if (!b && a === "me") return { name: "me" };
  return { name: "notfound" };
}
