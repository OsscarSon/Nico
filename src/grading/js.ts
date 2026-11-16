// JavaScript 报错的中文提示（纯函数）。运行器把 iframe 里捕获到的错误整理成 JsError 再交给这里。

export type JsError = { name: string; message: string; line: number | null };

const HINTS: Record<string, (m: string) => string> = {
  SyntaxError: () => "语法错误：检查括号、引号、花括号是否成对，逗号和分号有没有漏。",
  ReferenceError: (m) => {
    const name = /^(\S+) is not defined/.exec(m)?.[1];
    return `${name ? `名字 ${name}` : "有个名字"}还没有定义：是不是拼错了（注意大小写），或者用它之前没有先用 let / const 声明？`;
  },
  TypeError: (m) =>
    /is not a function/.test(m)
      ? "你把一个不是函数的东西当函数调用了：检查名字拼写，以及它到底是不是函数。"
      : /null|undefined/.test(m)
        ? "对 null 或 undefined 取属性了：多半是 querySelector 没找到元素（选择器写错），或者变量还没有值。"
        : "类型不对：检查你操作的值是不是你以为的那种类型。",
  RangeError: () => "数值或递归超出范围：检查有没有无限递归的函数。",
  LoopTimeout: () => "运行太久被停止了：检查有没有停不下来的循环（比如忘了让循环条件变化）。",
};

/** 变成一句话：「第 N 行：TypeError: xxx。提示」。line 为 null 时不写行号。 */
export function describeJsError(e: JsError): string {
  if (e.name === "LoopTimeout") return `${HINTS.LoopTimeout!("")}`;
  const hint = (HINTS[e.name] ?? (() => "运行出错了。读错误类型和说明，再看出错的行。"))(e.message);
  const where = e.line ? `第 ${e.line} 行：` : "";
  return `${where}${e.name}: ${e.message}。${hint}`;
}
