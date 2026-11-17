import { useSyncExternalStore } from "react";
import {
  loadProgress,
  saveProgress,
  emptyProgress,
  mergeProgress,
  STORAGE_KEY,
  type Progress,
} from "./store";

const safeStorage = (): Pick<Storage, "getItem" | "setItem"> => {
  try {
    const s = window.localStorage;
    s.getItem("nico-probe");
    return s;
  } catch {
    // 无痕模式等场景：退回内存，应用仍可使用，只是刷新后不保留。
    const mem: Record<string, string> = {};
    return {
      getItem: (k) => mem[k] ?? null,
      setItem: (k, v) => {
        mem[k] = v;
      },
    };
  }
};

const storage = safeStorage();
let state: Progress = loadProgress(storage);
const listeners = new Set<() => void>();

export const getProgress = () => state;
export function updateProgress(fn: (p: Progress) => Progress) {
  const next = fn(state);
  if (next === state) return;
  state = next;
  saveProgress(storage, state);
  listeners.forEach((l) => l());
}
/** 把导入的备份合并进当前进度（不覆盖已有记录）。 */
export function importProgress(incoming: Progress) {
  updateProgress((p) => mergeProgress(p, incoming));
}
export function clearProgress() {
  state = emptyProgress();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 忽略 */
  }
  listeners.forEach((l) => l());
}
export const useProgress = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getProgress,
    getProgress,
  );
