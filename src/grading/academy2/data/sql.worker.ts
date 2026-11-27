import wasmURL from "sql.js/dist/sql-wasm.wasm?url";
import { executeSQL, exportDatabase, loadSQLite, measureIndex } from "./sql";
import type { Table } from "./table";

let engine: ReturnType<typeof loadSQLite> | undefined;
self.onmessage = async (
  message: MessageEvent<{
    table: Table;
    queries: string[];
    download: boolean;
    benchmark?: string;
  }>,
) => {
  try {
    engine ??= loadSQLite(() => wasmURL);
    const sqlite = await engine;
    const { table, queries, download, benchmark } = message.data;
    self.postMessage({
      data: benchmark
        ? measureIndex(sqlite, table, benchmark)
        : download
          ? exportDatabase(sqlite, table, queries)
          : executeSQL(sqlite, table, queries),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "SQL 运行失败。",
    });
  }
};
