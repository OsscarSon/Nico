export type Cell = number | string | boolean | null;
export type Sheet = Readonly<Record<string, Cell>>;
type Scalar = Cell | Date;
type Grid = { rows: Scalar[][] };
type Value = Scalar | Grid;
type Atom = { type: "number" | "text" | "word" | "symbol"; text: string };
type Node =
  | { type: "literal"; value: Scalar }
  | { type: "reference"; name: string }
  | { type: "range"; from: string; to: string }
  | { type: "call"; name: string; args: Node[] }
  | { type: "binary"; op: string; left: Node; right: Node }
  | { type: "negative"; value: Node };

const refPattern = /^(\$?)([A-Z])(\$?)([1-9]\d?)$/;
function fail(message: string): never { throw new Error(message); }

function tokenize(source: string): Atom[] {
  const input = source.trim();
  if (!input.startsWith("=") || input.length > 280) fail("请用 = 开始，并在 280 字符内写公式。");
  const tokens: Atom[] = [];
  const lex = /\s+|"(?:[^"]|"")*"|\d+(?:\.\d+)?|\$?[A-Za-z]+\$?\d*|>=|<=|<>|[+*/&=><():,-]/gy;
  let position = 1;
  while (position < input.length) {
    lex.lastIndex = position;
    const match = lex.exec(input);
    if (!match) fail("无法识别位置 " + (position + 1) + " 附近的符号。");
    const value = match[0];
    position = lex.lastIndex;
    if (/^\s+$/.test(value)) continue;
    const type = value[0] === '"' ? "text" : /^\d/.test(value) ? "number" : /^[$a-z]/i.test(value) ? "word" : "symbol";
    tokens.push({ type, text: type === "word" ? value.toUpperCase() : value });
  }
  if (!tokens.length) fail("等号后还需要表达式。");
  return tokens;
}

const precedence: Record<string, number> = { "=": 1, "<>": 1, "<": 1, "<=": 1, ">": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4 };
class Parser {
  private position = 0;
  constructor(private readonly tokens: Atom[]) {}
  private peek = () => this.tokens[this.position];
  private take = () => this.tokens[this.position++];
  private match(text: string) {
    if (this.peek()?.text !== text) return false;
    this.take();
    return true;
  }
  private expect(text: string) {
    if (!this.match(text)) fail("公式缺少 " + text + "。");
  }
  parse() {
    const node = this.expression(1);
    if (this.peek()) fail("公式尾部还有未解析的内容。");
    return node;
  }
  private expression(minimum: number): Node {
    let left = this.primary();
    let token = this.peek();
    while (token && (precedence[token.text] ?? 0) >= minimum) {
      const op = token.text;
      this.take();
      left = { type: "binary", op, left, right: this.expression(precedence[op]! + 1) };
      token = this.peek();
    }
    return left;
  }
  private primary(): Node {
    const token = this.take();
    if (!token) fail("表达式未写完。");
    if (token.text === "-") return { type: "negative", value: this.primary() };
    if (token.text === "(") {
      const node = this.expression(1);
      this.expect(")");
      return node;
    }
    if (token.type === "number") return { type: "literal", value: Number(token.text) };
    if (token.type === "text") return { type: "literal", value: token.text.slice(1, -1).replace(/""/g, '"') };
    if (token.type !== "word") fail("应输入数值、单元格或支持的函数。");
    if (this.match("(")) {
      const args: Node[] = [];
      if (!this.match(")")) {
        do { args.push(this.expression(1)); } while (this.match(","));
        this.expect(")");
      }
      return { type: "call", name: token.text, args };
    }
    if (token.text === "TRUE" || token.text === "FALSE") return { type: "literal", value: token.text === "TRUE" };
    if (!refPattern.test(token.text)) fail("不识别此名称：" + token.text + "。");
    if (!this.match(":")) return { type: "reference", name: token.text };
    const end = this.take();
    if (!end || !refPattern.test(end.text)) fail("范围的末尾必须是单元格地址。");
    return { type: "range", from: token.text, to: end.text };
  }
}

function coordinates(name: string) {
  const match = refPattern.exec(name);
  if (!match) fail("当前教学工作表只支持 A1 到 Z99。");
  return { column: match[2]!.charCodeAt(0) - 65, row: Number(match[4]), colFixed: match[1] === "$", rowFixed: match[3] === "$" };
}
function address(column: number, row: number) {
  if (column < 0 || column >= 26 || row < 1 || row > 99) fail("复制或范围超出工作表。");
  return String.fromCharCode(65 + column) + row;
}
const isGrid = (value: Value): value is Grid => value !== null && typeof value === "object" && "rows" in value;
function scalar(value: Value): Scalar {
  return isGrid(value) ? fail("这里需要一个单元格值。") : value;
}
function numeric(value: Value) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail("这里需要数值；文本、空白与布尔值不自动转换。");
  return value;
}
function grid(value: Value): Grid {
  return isGrid(value) ? value : fail("这里需要一个连续范围。");
}
const asText = (value: Scalar) => value instanceof Date ? value.toISOString().slice(0, 10) : value === null ? "" : typeof value === "boolean" ? String(value).toUpperCase() : String(value);
const equal = (a: Scalar, b: Scalar) => typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b;
function comparison(op: string, a: Scalar, b: Scalar) {
  if (op === "=") return equal(a, b);
  if (op === "<>") return !equal(a, b);
  const x = numeric(a), y = numeric(b);
  switch (op) {
    case "<": return x < y;
    case "<=": return x <= y;
    case ">": return x > y;
    default: return x >= y;
  }
}
function criterion(value: Scalar, wanted: Scalar) {
  const match = typeof wanted === "string" ? /^(<=|>=|<>|=|<|>)(-?\d+(?:\.\d+)?)$/.exec(wanted) : null;
  return match ? typeof value === "number" && comparison(match[1]!, value, Number(match[2])) : equal(value, wanted);
}

function invoke(name: string, args: Node[], sheet: Sheet): Value {
  const arg = (index: number) => {
    const node = args[index];
    return node ? evaluate(node, sheet) : fail(name + " 的参数不完整。");
  };
  const arity = (min: number, max = min) => {
    if (args.length < min || args.length > max) fail(name + " 的参数数量不符。");
  };
  switch (name) {
    case "SUM":
    case "AVERAGE": {
      arity(1, 20);
      const values = args.flatMap((_, i) => { const value = arg(i); return isGrid(value) ? value.rows.flat() : [value]; });
      const numbers = values.filter((n): n is number => typeof n === "number");
      const total = numbers.reduce((a, b) => a + b, 0);
      return name === "SUM" ? total : numbers.length ? total / numbers.length : fail("没有数值，无法求平均。");
    }
    case "VALUE": {
      arity(1);
      const input = scalar(arg(0));
      if (typeof input === "number") return input;
      if (typeof input !== "string" || !/^-?\d+(?:\.\d+)?$/.test(input.trim())) fail("VALUE 需要本课支持的数字文本。");
      return Number(input);
    }
    case "IF": {
      arity(3);
      const test = scalar(arg(0));
      if (typeof test !== "boolean") fail("IF 的第一个参数需要布尔条件。");
      return arg(test ? 1 : 2);
    }
    case "COUNTIF":
    case "SUMIF": {
      arity(name === "COUNTIF" ? 2 : 3);
      const matchRows = grid(arg(0)).rows;
      const matches = matchRows.flat();
      const wanted = scalar(arg(1));
      const flags = matches.map(c => criterion(c, wanted));
      if (name === "COUNTIF") return flags.filter(Boolean).length;
      const sumRows = grid(arg(2)).rows;
      if (sumRows.length !== matchRows.length || sumRows[0]?.length !== matchRows[0]?.length) fail("条件范围和求和范围需要同样形状。");
      const sums = sumRows.flat();
      return sums.reduce<number>((total, cell, i) => total + (flags[i] && typeof cell === "number" ? cell : 0), 0);
    }
    case "XLOOKUP": {
      arity(3, 4);
      const key = scalar(arg(0));
      const lookup = grid(arg(1)).rows;
      const output = grid(arg(2)).rows;
      if (lookup.length !== output.length || [...lookup, ...output].some(row => row.length !== 1)) fail("请使用高度相同的单列范围。");
      const found = lookup.findIndex(row => equal(row[0]!, key));
      return found >= 0 ? output[found]![0]! : args.length === 4 ? arg(3) : fail("没有找到匹配键。");
    }
    case "VLOOKUP": {
      arity(4);
      const key = scalar(arg(0));
      const rows = grid(arg(1)).rows;
      const column = numeric(arg(2));
      if (scalar(arg(3)) !== false) fail("教学模型要求用 FALSE 选择精确匹配。");
      if (!Number.isInteger(column) || column < 1 || column > rows[0]!.length) fail("回传列号超出表格范围。");
      const row = rows.find(row => equal(row[0]!, key));
      return row ? row[column - 1]! : fail("没有找到匹配键。");
    }
    case "DATE": {
      arity(3);
      const y = numeric(arg(0)), m = numeric(arg(1)), d = numeric(arg(2));
      if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2099) fail("使用 1900–2099 范围内的整数日期。");
      const date = new Date(Date.UTC(y, m - 1, d));
      if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) fail("本课要求存在的日历日期。");
      return date;
    }
    case "TEXT": {
      arity(2);
      const date = scalar(arg(0));
      if (!(date instanceof Date) || arg(1) !== "yyyy-mm-dd") fail('本课 TEXT 支持日期格式 "yyyy-mm-dd"。');
      return asText(date);
    }
    case "TRIM": {
      arity(1);
      const value = scalar(arg(0));
      if (typeof value !== "string") fail("TRIM 需要文本。");
      return value.replace(/^ +| +$/g, "").replace(/ {2,}/g, " ");
    }
    default: return fail("本课工作表未实现 " + name + "。");
  }
}

function evaluate(node: Node, sheet: Sheet): Value {
  switch (node.type) {
    case "literal": return node.value;
    case "negative": return -numeric(evaluate(node.value, sheet));
    case "reference": return sheet[node.name.replace(/\$/g, "")] ?? null;
    case "range": {
      const from = coordinates(node.from), to = coordinates(node.to);
      if (from.column > to.column || from.row > to.row) fail("范围请从左上写到右下。");
      return { rows: Array.from({ length: to.row - from.row + 1 }, (_, row) =>
        Array.from({ length: to.column - from.column + 1 }, (_, col) => sheet[address(from.column + col, from.row + row)] ?? null)) };
    }
    case "call": return invoke(node.name, node.args, sheet);
    case "binary": {
      const a = scalar(evaluate(node.left, sheet)), b = scalar(evaluate(node.right, sheet));
      switch (node.op) {
        case "&": return asText(a) + asText(b);
        case "+": return numeric(a) + numeric(b);
        case "-": return numeric(a) - numeric(b);
        case "*": return numeric(a) * numeric(b);
        case "/": return numeric(b) === 0 ? fail("除数不能为零。") : numeric(a) / numeric(b);
        default: return comparison(node.op, a, b);
      }
    }
  }
}

export type FormulaResult = { ok: true; value: Cell } | { ok: false; error: string };
export function calculate(source: string, sheet: Sheet): FormulaResult {
  try {
    const result = scalar(evaluate(new Parser(tokenize(source)).parse(), sheet));
    if (typeof result === "number" && !Number.isFinite(result)) fail("计算结果超出有限数值范围。");
    return { ok: true, value: result instanceof Date ? asText(result) : result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "公式计算失败。" };
  }
}

export function copyFormula(source: string, dx: number, dy: number): string {
  const tokens = tokenize(source);
  return "=" + tokens.map(({ type, text }) => {
    if (type !== "word" || !refPattern.test(text)) return text;
    const p = coordinates(text);
    const target = address(p.column + (p.colFixed ? 0 : dx), p.row + (p.rowFixed ? 0 : dy));
    return (p.colFixed ? "$" : "") + target[0] + (p.rowFixed ? "$" : "") + target.slice(1);
  }).join("");
}
