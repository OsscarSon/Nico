/* global self */
// 在 Web Worker 里运行学习者的 Python（Pyodide = 浏览器里的真 CPython）。
// 协议见 src/runtime/python.ts。Pyodide 314 起要求 module Worker，通过官方 ESM 入口加载。
// 超时与停止由主线程直接 terminate() 这个 Worker 实现，所以死循环也能停。

let pyodide = null;
const MAX_LINES = 500;
const MAX_CHARS = 20000;

// 每次运行用全新的全局命名空间，互不影响。
// input() 被替换：从本次运行的 stdin 文本里一行一行读；没有输入就像文件结束一样抛 EOFError。
const PRELUDE = `
_nico_lines = __nico_stdin__.split("\\n") if __nico_stdin__ else []
def input(prompt=""):
    if __nico_echo__:
        print(prompt, end="")
    if not _nico_lines:
        raise EOFError("EOF when reading a line")
    line = _nico_lines.pop(0)
    if __nico_echo__:
        print(line)
    return line
`;

self.onmessage = async (e) => {
  const m = e.data;
  if (m.type === "init") {
    try {
      const module = await import(m.indexURL + "pyodide.mjs");
      const loadPyodide = module.loadPyodide || self.loadPyodide; // 兼容离线测试夹具
      pyodide = await loadPyodide({ indexURL: m.indexURL });
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "loaderror", message: String((err && err.message) || err) });
    }
    return;
  }
  if (m.type !== "run" || !pyodide) return;

  const out = [];
  const errLines = [];
  let chars = 0;
  let truncated = false;
  const collect = (arr) => (line) => {
    if (truncated) return;
    chars += line.length + 1;
    if (arr.length >= MAX_LINES || chars > MAX_CHARS) {
      truncated = true;
      return;
    }
    arr.push(line);
  };
  pyodide.setStdout({ batched: collect(out) });
  pyodide.setStderr({ batched: collect(errLines) });

  let error = null;
  const g = pyodide.globals.get("dict")();
  try {
    g.set("__nico_stdin__", m.stdin || "");
    g.set("__nico_echo__", Boolean(m.echoPrompt));
    pyodide.runPython(PRELUDE, { globals: g });
    await pyodide.runPythonAsync(m.code, { globals: g });
  } catch (err) {
    error = String((err && err.message) || err);
  } finally {
    try {
      pyodide.runPython("import sys; sys.stdout.flush(); sys.stderr.flush()");
    } catch { /* 忽略 */ }
    g.destroy();
  }
  self.postMessage({
    type: "result",
    id: m.id,
    stdout: out.join("\n"),
    stderr: errLines.join("\n"),
    error,
    truncated,
  });
};
