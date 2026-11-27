import type {
  Evaluation,
  SplitOptions,
  MLResult,
} from "../../../grading/academy2/data/ml";
import type { Table } from "../../../grading/academy2/data/table";

export function runML(
  table: Table,
  options: SplitOptions,
  evaluation: Evaluation = "development",
): Promise<MLResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../../grading/academy2/data/ml.worker.ts", import.meta.url),
      { type: "module" },
    );
    const timer = window.setTimeout(() => {
      worker.terminate();
      reject(Error("训练超时。请减少轮次或输入规模。"));
    }, 20_000);
    const finish = () => {
      window.clearTimeout(timer);
      worker.terminate();
    };
    worker.onmessage = (event) => {
      finish();
      if (event.data.error) reject(Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.onerror = () => {
      finish();
      reject(Error("机器学习 Worker 无法加载。"));
    };
    worker.postMessage({ table, options, evaluation });
  });
}
