/**
 * Pyodide（浏览器里的真 CPython，MPL-2.0）从 jsDelivr 加载，不打进我们的包。
 * 版本只在这里写一次。升级时：改这个号码，在真实浏览器里跑一遍 B 路线的冒烟测试。
 * 上线后若要完全离线（PWA，Phase 8），再把这个目录改为自己托管的路径。
 */
export const PYODIDE_VERSION = "314.0.8";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** 学习者代码单次运行的上限；超过就终止 Worker。 */
export const RUN_TIMEOUT_MS = 5000;
/** 首次下载 Pyodide 的上限（约 10 MB）。 */
export const LOAD_TIMEOUT_MS = 90_000;
