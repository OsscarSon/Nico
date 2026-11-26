import { useSyncExternalStore } from "react";
import { getPersonalPath, type PersonalPathId } from "../../content/academy2/paths";

const key = "nico-academy2-path";
type Preference = Readonly<{ id: PersonalPathId | ""; persistent: boolean }>;
const initial: Preference = { id: "", persistent: true };
let current: Preference | undefined;
const listeners = new Set<() => void>();

function read(): Preference {
  try {
    const id = window.localStorage.getItem(key) ?? "";
    return { id: getPersonalPath(id)?.id ?? "", persistent: true };
  } catch {
    return { id: "", persistent: false };
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    current = read();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setAcademyPath(id: PersonalPathId | "") {
  try {
    if (id) window.localStorage.setItem(key, id);
    else window.localStorage.removeItem(key);
    current = { id, persistent: true };
  } catch {
    current = { id, persistent: false };
  }
  listeners.forEach(listener => listener());
}

export const useAcademyPath = () => useSyncExternalStore(subscribe, () => current ??= read(), () => initial);
