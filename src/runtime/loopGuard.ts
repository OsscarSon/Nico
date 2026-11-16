// 给学习者的 JavaScript 加「死循环保护」：在每个循环体开头插入 __nicoG()。
// 为什么需要：JS 要在页面里的 iframe 里运行才能操作 DOM，而 iframe 里的死循环会卡死整个页面，
// 没法像 Python 那样直接终止 Worker。所以改写代码：同一次同步执行超过时间预算就抛出错误。
// 解析用 acorn（开源、MIT）；这里只依赖一个 parse 函数，方便单元测试。

export type Parse = (
  code: string,
  options: { ecmaVersion: "latest"; sourceType: "script"; allowAwaitOutsideFunction?: boolean },
) => unknown;

export class JsSyntaxError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(message);
    this.name = "SyntaxError";
  }
}

type Node = { type: string; start: number; end: number; body?: Node; [k: string]: unknown };

const LOOPS = new Set([
  "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement",
]);

function walk(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, visit);
    return;
  }
  if (!node || typeof node !== "object") return;
  const n = node as Node;
  if (typeof n.type === "string") visit(n);
  for (const key of Object.keys(n)) {
    if (key === "loc") continue;
    const v = n[key];
    if (v && typeof v === "object") walk(v, visit);
  }
}

/** 返回加了保护的代码。换行数不变（只在行内插入），所以报错的行号仍然对得上。语法错误会抛 JsSyntaxError。 */
export function instrumentLoops(code: string, parse: Parse): string {
  let ast: unknown;
  try {
    ast = parse(code, { ecmaVersion: "latest", sourceType: "script", allowAwaitOutsideFunction: true });
  } catch (e) {
    const err = e as { message?: string; loc?: { line: number; column: number } };
    const msg = (err.message ?? "语法错误").replace(/\s*\(\d+:\d+\)\s*$/, "");
    throw new JsSyntaxError(msg, err.loc?.line ?? 1, err.loc?.column ?? 0);
  }
  const edits: { pos: number; text: string; idx: number }[] = [];
  walk(ast, (n) => {
    if (!LOOPS.has(n.type) || !n.body) return;
    const b = n.body;
    if (b.type === "BlockStatement") edits.push({ pos: b.start + 1, text: "__nicoG();", idx: edits.length });
    else {
      edits.push({ pos: b.start, text: "{__nicoG();", idx: edits.length });
      edits.push({ pos: b.end, text: "}", idx: edits.length });
    }
  });
  // 从后往前插入，位置不会错乱；同一位置时后访问到的（更内层的）先插入，这样外层的在最前面
  edits.sort((a, b) => b.pos - a.pos || b.idx - a.idx);
  let out = code;
  for (const e of edits) out = out.slice(0, e.pos) + e.text + out.slice(e.pos);
  return out;
}
