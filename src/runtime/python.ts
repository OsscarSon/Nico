import { LOAD_TIMEOUT_MS, PYODIDE_INDEX_URL, RUN_TIMEOUT_MS } from "./config";

/** Worker 的最小接口：真实的 Worker 满足它，测试里可以用假的。 */
export type WorkerLike = {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
};

export type RunnerStatus = "idle" | "loading" | "ready" | "error";

export type RunResult = {
  stdout: string;
  stderr: string;
  /** Python 报错的完整文本（回溯）；没报错为 null */
  error: string | null;
  timedOut: boolean;
  /** 学习者点了"停止" */
  stopped: boolean;
  /** Pyodide 没能加载（多半是没网）；有值时没有运行学习者的代码 */
  loadError: string | null;
  /** 输出太多被截断 */
  truncated: boolean;
};

export type RunOptions = {
  stdin?: string;
  /** 是否把 input() 的提示和输入回显到输出里（像终端那样）。判分时关闭。 */
  echoPrompt?: boolean;
};

export type RunnerOptions = {
  createWorker: () => WorkerLike;
  indexURL: string;
  runTimeoutMs?: number;
  loadTimeoutMs?: number;
};

type WorkerMessage =
  | { type: "ready" }
  | { type: "loaderror"; message: string }
  | { type: "result"; id: number; stdout: string; stderr: string; error: string | null; truncated: boolean };

const blank = (): RunResult => ({
  stdout: "", stderr: "", error: null, timedOut: false, stopped: false, loadError: null, truncated: false,
});

/**
 * 在 Web Worker 里运行 Python。主线程永远不执行学习者的代码；
 * 超时或点"停止"时直接终止 Worker（死循环也停得下来），下一次运行会重新创建。
 */
export class PythonRunner {
  private worker: WorkerLike | null = null;
  private starting: Promise<void> | null = null;
  private pending: { id: number; resolve: (r: RunResult) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private seq = 0;
  private listeners = new Set<() => void>();
  private _status: RunnerStatus = "idle";

  constructor(private readonly opts: RunnerOptions) {}

  get status(): RunnerStatus {
    return this._status;
  }
  get running(): boolean {
    return this.pending !== null;
  }
  /** 给 useSyncExternalStore 用 */
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private setStatus(s: RunnerStatus) {
    this._status = s;
    this.listeners.forEach((f) => f());
  }

  private ensureReady(): Promise<void> {
    if (this.starting) return this.starting;
    const w = this.opts.createWorker();
    this.worker = w;
    this.setStatus("loading");
    const p = new Promise<void>((resolve, reject) => {
      const fail = (msg: string) => {
        clearTimeout(timer);
        w.terminate();
        if (this.worker === w) this.worker = null;
        this.starting = null;
        this.setStatus("error");
        reject(new Error(msg));
      };
      const timer = setTimeout(() => fail("加载超时"), this.opts.loadTimeoutMs ?? LOAD_TIMEOUT_MS);
      w.onerror = () => fail("Worker 出错");
      w.onmessage = (e) => {
        const m = e.data as WorkerMessage;
        if (m.type === "ready") {
          clearTimeout(timer);
          this.setStatus("ready");
          w.onmessage = (ev) => this.onMessage(ev.data as WorkerMessage);
          w.onerror = () => this.kill({ ...blank(), error: "Worker 出错" });
          resolve();
        } else if (m.type === "loaderror") fail(m.message);
      };
      w.postMessage({ type: "init", indexURL: this.opts.indexURL });
    });
    this.starting = p;
    // 加载失败后允许下次重试；这里吞掉未处理的 rejection，调用方在 run() 里处理
    p.catch(() => undefined);
    return p;
  }

  private onMessage(m: WorkerMessage) {
    if (m.type !== "result" || !this.pending || m.id !== this.pending.id) return;
    const { resolve, timer } = this.pending;
    clearTimeout(timer);
    this.pending = null;
    resolve({ ...blank(), stdout: m.stdout, stderr: m.stderr, error: m.error, truncated: m.truncated });
    this.listeners.forEach((f) => f());
  }

  /** 终止 Worker 并让当前运行以给定结果返回。 */
  private kill(result: RunResult) {
    this.worker?.terminate();
    this.worker = null;
    this.starting = null;
    this.setStatus("idle");
    if (this.pending) {
      clearTimeout(this.pending.timer);
      const { resolve } = this.pending;
      this.pending = null;
      resolve(result);
    }
  }

  async run(code: string, options: RunOptions = {}): Promise<RunResult> {
    if (this.pending) return { ...blank(), error: "已经有一段代码在运行。" };
    try {
      await this.ensureReady();
    } catch (e) {
      return { ...blank(), loadError: e instanceof Error ? e.message : String(e) };
    }
    const w = this.worker;
    if (!w) return { ...blank(), loadError: "Python 没有准备好" };
    return new Promise<RunResult>((resolve) => {
      const id = ++this.seq;
      const timer = setTimeout(
        () => this.kill({ ...blank(), timedOut: true }),
        this.opts.runTimeoutMs ?? RUN_TIMEOUT_MS,
      );
      this.pending = { id, resolve, timer };
      this.listeners.forEach((f) => f());
      w.postMessage({ type: "run", id, code, stdin: options.stdin ?? "", echoPrompt: options.echoPrompt ?? true });
    });
  }

  /** 学习者点"停止"。 */
  stop() {
    if (this.pending) this.kill({ ...blank(), stopped: true });
  }

  dispose() {
    this.kill({ ...blank(), stopped: true });
  }
}

let shared: PythonRunner | null = null;

/** 全站共用一个运行器：Pyodide 只需下载和初始化一次，换课也不用重来。 */
export function getPythonRunner(): PythonRunner {
  shared ??= new PythonRunner({
    createWorker: () =>
      new Worker(new URL("workers/python-worker.js", document.baseURI)) as unknown as WorkerLike,
    indexURL: PYODIDE_INDEX_URL,
  });
  return shared;
}
