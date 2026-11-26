import { useState, useSyncExternalStore } from "react";
import { CodeEditor } from "../../../sims/code/CodeEditor";
import { getPythonRunner, type RunResult } from "../../../runtime/python";

export default function TeachingPython({ initial }: { initial: string }) {
  const [code, setCode] = useState(initial),
    [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult>();
  const runner = getPythonRunner();
  const canStop = useSyncExternalStore(runner.subscribe, () => runner.running);
  async function run() {
    setRunning(true);
    setResult(undefined);
    try {
      setResult(await runner.run(code));
    } finally {
      setRunning(false);
    }
  }
  return (
    <div className="teaching-python">
      <CodeEditor
        value={code}
        onChange={setCode}
        label="Python 教学示例"
        language="python"
      />
      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={running}
          onClick={() => void run()}
        >
          运行 Python
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={!running || !canStop}
          onClick={() => runner.stop()}
        >
          停止执行
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={running}
          onClick={() => {
            setCode(initial);
            setResult(undefined);
          }}
        >
          恢复示例
        </button>
      </div>
      {running && <p role="status">正在准备或运行 Python…</p>}
      {result && (
        <pre role="status" tabIndex={0}>
          {[
            result.loadError && "Python 加载失败：" + result.loadError,
            result.error,
            result.stdout,
            result.stderr,
            result.timedOut && "运行超时",
            result.stopped && "已停止",
            result.truncated && "输出已截断",
          ]
            .filter(Boolean)
            .join("\n") || "运行完成，无文本输出。"}
        </pre>
      )}
    </div>
  );
}
