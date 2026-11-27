import { quantile } from "../p1/statistics";

export type Cell = string | number | boolean | null;
export type Table = { columns: string[]; rows: Cell[][] };
export const maxRows = 2500,
  maxColumns = 24,
  maxImport = 300_000;

function headers(names: string[]) {
  const columns = names.map((name) => name.trim());
  if (
    !columns.length ||
    columns.length > maxColumns ||
    columns.some(
      (name) =>
        !name ||
        name.length > 64 ||
        [...name].some((char) => char.charCodeAt(0) < 32),
    ) ||
    new Set(columns.map((name) => name.toLowerCase())).size !== columns.length
  ) {
    throw Error("列名应互异且非空，最多 24 列，每列名称至多 64 字。");
  }
  return columns;
}
function cell(value: unknown): Cell {
  if (value === null || typeof value === "boolean") return value;
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= 1e100
  )
    return value;
  if (
    typeof value === "string" &&
    value.length <= 2000 &&
    !value.includes("\0")
  )
    return value;
  throw Error("字段只接受有限数值、文本、布尔值或 null。嵌套 JSON 需先展开。");
}
export function validateTable(source: Table): Table {
  const columns = headers(source.columns);
  if (source.rows.length > maxRows) throw Error("每个表最多 2500 条记录。");
  return {
    columns,
    rows: source.rows.map((row, i) => {
      if (row.length !== columns.length)
        throw Error("第 " + (i + 1) + " 条记录字段数与表头不符。");
      return row.map(cell);
    }),
  };
}

export function parseCSV(text: string, numeric = true): Table {
  if (text.length > maxImport) throw Error("文件超过 300,000 字符。");
  const rows: string[][] = [];
  let line: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const add = () => {
    line.push(field);
    field = "";
    closed = false;
  };
  const end = () => {
    add();
    if (line.length > 1 || line[0] !== "") rows.push(line);
    line = [];
    if (rows.length > maxRows + 1) throw Error("每个表最多 2500 条记录。");
  };
  const input = text.replace(/^\ufeff/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === ",") add();
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      end();
    } else if (closed || (char === '"' && field))
      throw Error("CSV 双引号的位置不正确。");
    else if (char === '"') quoted = true;
    else field += char;
  }
  if (quoted) throw Error("CSV 字段缺少闭合引号。");
  end();
  const columns = headers(rows.shift() ?? []);
  return validateTable({
    columns,
    rows: rows.map((row) =>
      row.map((item) => {
        if (item === "") return null;
        // Preserve leading-zero identifiers. Keep ambiguous values as strings for explicit conversion.
        if (
          numeric &&
          /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(item) &&
          Number.isFinite(Number(item)) &&
          (item.includes(".") ||
            /e/i.test(item) ||
            Number.isSafeInteger(Number(item)))
        ) {
          return Number(item);
        }
        return item;
      }),
    ),
  });
}

export function parseJSON(text: string): Table {
  if (text.length > maxImport) throw Error("文件超过 300,000 字符。");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Error("JSON 无法解析。检查引号和逗号。");
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.length ||
    parsed.length > maxRows ||
    parsed.some((row) => !row || typeof row !== "object" || Array.isArray(row))
  ) {
    throw Error("需要 1–2500 个记录对象组成的 JSON 数组。");
  }
  const records = parsed as Record<string, unknown>[];
  const keys = [...new Set(records.flatMap((row) => Object.keys(row)))];
  return validateTable({
    columns: keys,
    rows: records.map((row) =>
      keys.map((key) => (Object.hasOwn(row, key) ? cell(row[key]) : null)),
    ),
  });
}

export function columnIndex(data: Table, column: string) {
  const index = data.columns.indexOf(column);
  if (index < 0) throw Error("选择有效的数据列。");
  return index;
}
export const numericValues = (data: Table, key: string) => {
  const index = columnIndex(data, key);
  return data.rows.flatMap((row) =>
    typeof row[index] === "number" ? [row[index]] : [],
  );
};
export function numberSummary(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    n = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  const sd =
    n > 1
      ? Math.sqrt(
          values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1),
        )
      : null;
  const min = sorted[0]!,
    max = sorted[n - 1]!;
  const q1 = quantile(sorted, 0.25),
    median = quantile(sorted, 0.5),
    q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1,
    low = q1 - 1.5 * iqr,
    high = q3 + 1.5 * iqr;
  const inside = sorted.filter((value) => value >= low && value <= high);
  return {
    n,
    mean,
    sd,
    min,
    q1,
    median,
    q3,
    max,
    low,
    high,
    whiskers: [inside[0]!, inside.at(-1)!] as const,
    outliers: sorted.filter((value) => value < low || value > high),
  };
}
export function profile(table: Table) {
  return table.columns.map((name, i) => {
    const column = table.rows.map((row) => row[i]!);
    return {
      name,
      missing: column.filter((x) => x === null).length,
      types: [
        ...new Set(column.filter((x) => x !== null).map((x) => typeof x)),
      ].join(", "),
      unique: new Set(column.filter((x) => x !== null)).size,
      summary: numberSummary(
        column.filter((x): x is number => typeof x === "number"),
      ),
    };
  });
}
const compare = (a: Cell, b: Cell) => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
};
export function filterSort(
  table: Table,
  key: string,
  text: string,
  order: "none" | "asc" | "desc",
) {
  const index = columnIndex(table, key),
    search = text.trim().toLowerCase();
  const rows = table.rows.filter(
    (row) =>
      !search ||
      String(row[index] ?? "")
        .toLowerCase()
        .includes(search),
  );
  if (order !== "none")
    rows.sort((a, b) => {
      const left = a[index]!,
        right = b[index]!;
      return left === null || right === null
        ? compare(left, right)
        : (order === "asc" ? 1 : -1) * compare(left, right);
    });
  return { columns: table.columns, rows };
}
export type Cleaning =
  | "trim"
  | "drop-missing"
  | "median"
  | "dedupe"
  | "as-number"
  | "scale"
  | "drop-outliers";
export function clean(table: Table, kind: Cleaning, key: string): Table {
  const index = columnIndex(table, key);
  if (kind === "dedupe") {
    const seen = new Set<string>();
    return {
      ...table,
      rows: table.rows.filter((row) => {
        const signature = JSON.stringify(row);
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      }),
    };
  }
  if (kind === "drop-missing")
    return { ...table, rows: table.rows.filter((row) => row[index] !== null) };
  const statistics = numberSummary(numericValues(table, key));
  if (kind === "drop-outliers") {
    if (!statistics) throw Error("所选列没有有限数值。");
    return {
      ...table,
      rows: table.rows.filter((row) => {
        const value = row[index];
        return (
          typeof value !== "number" ||
          (value >= statistics.low && value <= statistics.high)
        );
      }),
    };
  }
  const rows = table.rows.map((row) => {
    const output = [...row],
      value = output[index]!;
    if (kind === "trim" && typeof value === "string")
      output[index] = value.trim() || null;
    if (kind === "median" && value === null) {
      if (!statistics) throw Error("整列缺失或没有数值，无法计算中位数。");
      output[index] = statistics.median;
    }
    if (kind === "as-number" && typeof value === "string") {
      const raw = value.trim();
      if (
        !raw ||
        !/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) ||
        !Number.isFinite(Number(raw))
      )
        throw Error("存在不能转换成数值的字段。请先检查原始值。");
      output[index] = Number(raw);
    }
    if (kind === "scale" && typeof value === "number") {
      if (!statistics?.sd) throw Error("标准化至少需要两个不同数值。");
      output[index] = (value - statistics.mean) / statistics.sd;
    }
    return output;
  });
  return validateTable({ ...table, rows });
}

export function pairsFor(table: Table, x: string, y: string) {
  const a = columnIndex(table, x),
    b = columnIndex(table, y);
  return table.rows.flatMap((row) => {
    const u = row[a],
      v = row[b];
    return typeof u === "number" && typeof v === "number"
      ? [[u, v] as const]
      : [];
  });
}
export function correlation(pairs: readonly (readonly [number, number])[]) {
  if (pairs.length < 2) return null;
  const mean = (i: 0 | 1) => pairs.reduce((s, p) => s + p[i], 0) / pairs.length;
  const x = mean(0),
    y = mean(1);
  let xx = 0,
    yy = 0,
    xy = 0;
  for (const [a, b] of pairs) {
    xx += (a - x) ** 2;
    yy += (b - y) ** 2;
    xy += (a - x) * (b - y);
  }
  return xx && yy
    ? Math.max(-1, Math.min(1, xy / (Math.sqrt(xx) * Math.sqrt(yy))))
    : null;
}
export function histogram(values: number[], bins = 10) {
  if (!values.length) return [];
  const lo = Math.min(...values),
    hi = Math.max(...values);
  if (lo === hi) return [{ edge: lo, end: hi, count: values.length }];
  const span = (hi - lo) / bins,
    counts = Array<number>(bins).fill(0);
  for (const value of values)
    counts[Math.min(bins - 1, Math.floor((value - lo) / span))]!++;
  return counts.map((count, i) => ({
    edge: lo + i * span,
    end: i === bins - 1 ? hi : lo + (i + 1) * span,
    count,
  }));
}
export function grouped(table: Table, group: string, key: string) {
  const g = columnIndex(table, group),
    i = columnIndex(table, key);
  const groups = new Map<Cell, { rows: number; measure: number[] }>();
  for (const row of table.rows) {
    const name = row[g]!,
      item = groups.get(name) ?? { rows: 0, measure: [] };
    const value = row[i];
    item.rows++;
    if (typeof value === "number") item.measure.push(value);
    groups.set(name, item);
  }
  return [...groups].map(([name, item]) => ({
    group: name,
    rows: item.rows,
    valid: item.measure.length,
    mean: item.measure.length
      ? item.measure.reduce((a, b) => a + b, 0) / item.measure.length
      : null,
  }));
}

export function tableCSV(table: Table) {
  const quote = (value: Cell) => {
    if (value === null) return "";
    const raw = String(value);
    const text =
      typeof value === "string" && /^[=+\-@]/.test(raw.trimStart())
        ? "'" + raw
        : raw;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return [table.columns, ...table.rows]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
export const tableJSON = (table: Table) =>
  JSON.stringify(
    table.rows.map((row) =>
      Object.fromEntries(table.columns.map((key, i) => [key, row[i]])),
    ),
    null,
    2,
  );
