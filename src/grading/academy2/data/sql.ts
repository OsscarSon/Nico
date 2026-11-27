import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { type Table, type Cell, validateTable } from "./table";

export type SQLResult = { result: Table[]; elapsedMs: number; changes: number };
export const quoteIdentifier = (value: string) =>
  '"' + value.replaceAll('"', '""') + '"';

function createDB(engine: SqlJsStatic, data: Table): Database {
  const table = validateTable(data);
  const rows = table.rows.map((row) =>
    row.map((value) => (typeof value === "boolean" ? Number(value) : value)),
  );
  const definitions = table.columns.map((key, i) => {
    const vals = rows.map((row) => row[i]).filter((value) => value !== null);
    const affinity =
      vals.length && vals.every((value) => typeof value === "number")
        ? vals.every((value) => Number.isSafeInteger(value))
          ? "INTEGER"
          : "REAL"
        : vals.every((value) => typeof value === "string")
          ? "TEXT"
          : "";
    return quoteIdentifier(key) + " " + affinity;
  });
  const db = new engine.Database();
  try {
    db.run("PRAGMA foreign_keys=ON; PRAGMA temp_store=MEMORY");
    db.run("CREATE TABLE dataset (" + definitions.join(",") + ")");
    const statement = db.prepare(
      "INSERT INTO dataset VALUES (" +
        definitions.map(() => "?").join(",") +
        ")",
    );
    try {
      db.run("BEGIN");
      for (const row of rows) statement.run(row);
      db.run("COMMIT");
    } finally {
      statement.free();
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
function statements(db: Database, queries: string[]): Table[] {
  if (
    !queries.length ||
    queries.length > 10 ||
    queries.some((q) => q.length > 16_000)
  )
    throw Error("每次执行最多十个 SQL 单元，每个单元至多 16000 字。");
  let result: Table[] = [];
  for (const query of queries) {
    result = [];
    const iter = db.iterateStatements(query);
    for (const statement of iter) {
      const rows: Cell[][] = [];
      let columns: string[] = [];
      while (statement.step()) {
        if (!columns.length) columns = statement.getColumnNames();
        if (rows.length >= 5000)
          throw Error("查询输出超过 5000 行。可以先添加 LIMIT 或聚合。");
        rows.push(
          statement
            .get()
            .map((value) =>
              value instanceof Uint8Array
                ? "[BLOB " + value.byteLength + " bytes]"
                : value,
            ),
        );
      }
      if (!columns.length) columns = statement.getColumnNames();
      if (columns.length) result.push({ columns, rows });
    }
  }
  return result;
}
export function executeSQL(
  engine: SqlJsStatic,
  data: Table,
  queries: string[],
): SQLResult {
  const started = performance.now(),
    db = createDB(engine, data);
  try {
    return {
      result: statements(db, queries),
      elapsedMs: performance.now() - started,
      changes: db.getRowsModified(),
    };
  } finally {
    db.close();
  }
}
export const loadSQLite = (locateFile?: (name: string) => string) =>
  initSqlJs(locateFile ? { locateFile } : undefined);
export function exportDatabase(
  engine: SqlJsStatic,
  data: Table,
  queries: string[],
) {
  const db = createDB(engine, data);
  try {
    statements(db, queries);
    return db.export();
  } finally {
    db.close();
  }
}

export function measureIndex(engine: SqlJsStatic, data: Table, column: string) {
  const constIndex = data.columns.indexOf(column);
  if (constIndex < 0) throw Error("索引比较需要有效列。");
  const sample = data.rows.find((row) => row[constIndex] !== null)?.[
    constIndex
  ];
  if (sample === undefined) throw Error("该列没有可比较的值。");
  const db = createDB(engine, data),
    key = quoteIdentifier(column);
  const query =
    "SELECT COUNT(*) AS matching_rows FROM dataset WHERE " + key + " = ?";
  const bind = [typeof sample === "boolean" ? Number(sample) : sample];
  function probe() {
    const statement = db.prepare(query);
    try {
      statement.bind(bind);
      statement.step();
      return Number(statement.get()[0]);
    } finally {
      statement.free();
    }
  }
  function measure() {
    const result = probe(),
      plan = String(
        db.exec("EXPLAIN QUERY PLAN " + query, bind)[0]?.values[0]?.at(-1) ??
          "",
      );
    const start = performance.now();
    for (let i = 0; i < 200; i++)
      if (probe() !== result) throw Error("同一查询的重复输出发生变化。");
    return { elapsed: performance.now() - start, result, plan };
  }
  try {
    const scan = measure();
    const start = performance.now();
    db.run("CREATE INDEX ix_nico ON dataset(" + key + ")");
    const build = performance.now() - start,
      index = measure();
    if (scan.result !== index.result) throw Error("行数核对失败。");
    return { sample, scan, index, build, queries: 200 };
  } finally {
    db.close();
  }
}
