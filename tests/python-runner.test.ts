import { describe, it, expect } from "vitest";
import { PythonRunner, type WorkerLike } from "../src/runtime/python";

/** 假的 Worker：按脚本回应 init / run，用来测试运行器的握手、超时和停止。 */
function fakeWorker(behavior: {
  init?: "ready" | "loaderror" | "silent";
  run?: (code: string, id: number) => unknown | "hang";
}): WorkerLike & { terminated: boolean; sent: unknown[] } {
  const w = {
    terminated: false,
    sent: [] as unknown[],
    onmessage: null as WorkerLike["onmessage"],
    onerror: null as WorkerLike["onerror"],
    terminate() { this.terminated = true; },
    postMessage(m: unknown) {
      this.sent.push(m);
      const msg = m as { type: string; id?: number; code?: string };
      queueMicrotask(() => {
        if (this.terminated) return;
        if (msg.type === "init") {
          const mode = behavior.init ?? "ready";
          if (mode === "ready") this.onmessage?.({ data: { type: "ready" } });
          if (mode === "loaderror") this.onmessage?.({ data: { type: "loaderror", message: "offline" } });
        } else if (msg.type === "run") {
          const out = behavior.run?.(msg.code ?? "", msg.id ?? 0);
          if (out !== "hang" && out !== undefined) this.onmessage?.({ data: out });
        }
      });
    },
  };
  return w;
}

const result = (id: number, stdout = "", error: string | null = null) => ({
  type: "result", id, stdout, stderr: "", error, truncated: false,
});

describe("PythonRunner", () => {
  it("loads once, runs code and returns its output", async () => {
    const workers: ReturnType<typeof fakeWorker>[] = [];
    const r = new PythonRunner({
      indexURL: "x/",
      createWorker: () => { const w = fakeWorker({ run: (_c, id) => result(id, "hi") }); workers.push(w); return w; },
    });
    const a = await r.run("print('hi')");
    const b = await r.run("print('hi')");
    expect(a.stdout).toBe("hi");
    expect(b.stdout).toBe("hi");
    expect(workers.length).toBe(1);
    expect(r.status).toBe("ready");
  });

  it("passes stdin and echo options to the worker", async () => {
    const w = fakeWorker({ run: (_c, id) => result(id) });
    const r = new PythonRunner({ indexURL: "x/", createWorker: () => w });
    await r.run("c", { stdin: "5", echoPrompt: false });
    const run = w.sent.find((m) => (m as { type: string }).type === "run") as Record<string, unknown>;
    expect(run.stdin).toBe("5");
    expect(run.echoPrompt).toBe(false);
  });

  it("an endless program is killed after the timeout and the next run starts a fresh worker", async () => {
    const workers: ReturnType<typeof fakeWorker>[] = [];
    let n = 0;
    const r = new PythonRunner({
      indexURL: "x/", runTimeoutMs: 40,
      createWorker: () => {
        const first = n++ === 0;
        const w = fakeWorker({ run: (_c, id) => (first ? "hang" : result(id, "ok")) });
        workers.push(w);
        return w;
      },
    });
    const a = await r.run("while True: pass");
    expect(a.timedOut).toBe(true);
    expect(workers[0]!.terminated).toBe(true);
    const b = await r.run("print('ok')");
    expect(b.stdout).toBe("ok");
    expect(workers.length).toBe(2);
  });

  it("stop() terminates a running program and reports stopped", async () => {
    const w = fakeWorker({ run: () => "hang" });
    const r = new PythonRunner({ indexURL: "x/", runTimeoutMs: 5000, createWorker: () => w });
    const p = r.run("while True: pass");
    await new Promise((res) => setTimeout(res, 10));
    expect(r.running).toBe(true);
    r.stop();
    const out = await p;
    expect(out.stopped).toBe(true);
    expect(w.terminated).toBe(true);
    expect(r.running).toBe(false);
  });

  it("a failed load is reported honestly and can be retried", async () => {
    let attempt = 0;
    const r = new PythonRunner({
      indexURL: "x/",
      createWorker: () => (attempt++ === 0 ? fakeWorker({ init: "loaderror" }) : fakeWorker({ run: (_c, id) => result(id, "ok") })),
    });
    const a = await r.run("print(1)");
    expect(a.loadError).toBe("offline");
    expect(r.status).toBe("error");
    const b = await r.run("print(1)");
    expect(b.loadError).toBe(null);
    expect(b.stdout).toBe("ok");
  });

  it("a load that never answers times out", async () => {
    const r = new PythonRunner({ indexURL: "x/", loadTimeoutMs: 30, createWorker: () => fakeWorker({ init: "silent" }) });
    const a = await r.run("x");
    expect(a.loadError).toBe("加载超时");
  });

  it("python errors come back as text, not as a crash", async () => {
    const r = new PythonRunner({
      indexURL: "x/",
      createWorker: () => fakeWorker({ run: (_c, id) => result(id, "", "NameError: name 'x' is not defined") }),
    });
    const a = await r.run("x");
    expect(a.error).toContain("NameError");
    expect(a.timedOut).toBe(false);
  });

  it("refuses to start a second program while one is running", async () => {
    const r = new PythonRunner({ indexURL: "x/", runTimeoutMs: 5000, createWorker: () => fakeWorker({ run: () => "hang" }) });
    const first = r.run("a");
    await new Promise((res) => setTimeout(res, 10));
    const second = await r.run("b");
    expect(second.error).toContain("已经有一段代码在运行");
    r.stop();
    await first;
  });
});
