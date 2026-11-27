import type { Table } from "../../../grading/academy2/data/table";
import type {
  SQLResult,
  measureIndex,
} from "../../../grading/academy2/data/sql";

export function runSQL(
  table: Table,
  queries: string[],
  download: true,
): Promise<Uint8Array>;
export function runSQL(
  table: Table,
  queries: string[],
  download?: false,
): Promise<SQLResult>;
export function runSQL(table: Table, queries: string[], download = false) {
  return requestSQL({ table, queries, download });
}
export function benchmarkSQL(
  table: Table,
  column: string,
): Promise<ReturnType<typeof measureIndex>> {
  return requestSQL({ table, queries: [], download: false, benchmark: column });
}

function requestSQL<T>(request: {
  table: Table;
  queries: string[];
  download: boolean;
  benchmark?: string;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../../grading/academy2/data/sql.worker.ts", import.meta.url),
      { type: "module" },
    );
    const timer = window.setTimeout(() => {
      worker.terminate();
      reject(Error("SQLite 执行超时。请缩小数据或使用更简单的查询。"));
    }, 10_000);
    const finish = () => {
      window.clearTimeout(timer);
      worker.terminate();
    };
    worker.onmessage = (event) => {
      finish();
      if (event.data.error) reject(Error(event.data.error));
      else resolve(event.data.data);
    };
    worker.onerror = () => {
      finish();
      reject(Error("SQLite Worker 无法加载。"));
    };
    worker.postMessage(request);
  });
}
