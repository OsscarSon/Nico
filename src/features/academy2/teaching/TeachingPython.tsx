import { useState, useSyncExternalStore } from "react";
import { CodeEditor } from "../../../sims/code/CodeEditor";
import { getPythonRunner, type RunResult } from "../../../runtime/python";

let runningExample=false;
export default function TeachingPython({initial,transform,onResult,button="运行 Python",onChangeCode}:{
  initial:string; transform?:(code:string)=>string;onResult?:(result:RunResult)=>void;button?:string;onChangeCode?:()=>void;
}) {
  const [code, setCode] = useState(initial),
    [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult>();
  const [notice,setNotice]=useState("");
  const runner = getPythonRunner();
  const canStop = useSyncExternalStore(runner.subscribe, () => runner.running);
  async function run() {
    if(runningExample||runner.running||runner.status==="loading"){setNotice("有一段教学代码正在运行，请等它结束。");return;}
    runningExample=true;setNotice("");
    setRunning(true);
    setResult(undefined);
    try {
      const run=await runner.run(transform?.(code)??code);
      setResult(run);onResult?.(run);
    } finally {
      runningExample=false;setRunning(false);
    }
  }
  return (
    <div className="teaching-python">
      <CodeEditor
        value={code}
        onChange={value=>{setCode(value);onChangeCode?.();}}
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
          {button}
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
            setCode(initial);onChangeCode?.();
            setResult(undefined);
          }}
        >
          恢复示例
        </button>
      </div>
      {notice&&<p role="status">{notice}</p>}
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
