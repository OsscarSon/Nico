// 代码挑战的判分：全部是纯函数，不依赖浏览器、Pyodide 或 React。
// 约定：每个检查项（check）是一次**独立运行**——学习者的代码 + 可选的检查程序（harness），
// 喂入该项自己的输入（stdin），比较标准输出。这样既能测输出，也能测边界值（比如 60 分）。

export type CodeCheck = {
  /** 给学习者看的检查名，例如"输入 60，应输出 及格" */
  label: string;
  /** 这次运行喂给 input() 的内容，多行用换行分隔 */
  stdin?: string;
  /** 接在学习者代码后面运行的检查程序，例如 print(double(4)) */
  harness?: string;
  /** 期望的标准输出（比较时忽略行尾空白和末尾空行） */
  expect: string;
  /** 这一项失败时额外给的提示 */
  hint?: string;
};

/** 源码必须满足的写法，例如"必须用 for 循环"，避免学习者直接把答案写死。 */
export type SourceRule = { pattern: string; message: string };

/** 一次运行的结果（由运行器给出）。 */
export type RunOutcome = {
  stdout: string;
  error: string | null;
  timedOut: boolean;
};

export type CheckResult = {
  label: string;
  ok: boolean;
  expected: string;
  actual: string;
  /** 失败原因，一句话 */
  detail: string;
};

export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

/** 把学习者代码和检查项拼成一次要运行的完整程序。 */
export function programFor(code: string, check: CodeCheck): string {
  if (!check.harness) return code;
  return `${code.replace(/\s+$/, "")}\n${check.harness}\n`;
}

/** 返回第一条没满足的源码规则的提示；全满足返回 null。非法正则视为内容错误，直接抛出。 */
export function checkSource(code: string, rules: SourceRule[] | undefined): string | null {
  for (const r of rules ?? []) {
    if (!new RegExp(r.pattern, "m").test(code)) return r.message;
  }
  return null;
}

const show = (s: string) => (s === "" ? "（没有输出）" : s);

/** 找出两段输出第一处不同，写成一句话。 */
export function firstDiff(expected: string, actual: string): string {
  const e = expected.split("\n");
  const a = actual === "" ? [] : actual.split("\n");
  if (e.length === 1 && a.length <= 1)
    return `期望输出「${expected}」，你的程序输出「${show(actual)}」。`;
  const n = Math.max(e.length, a.length);
  for (let i = 0; i < n; i++) {
    if (e[i] !== a[i])
      return `第 ${i + 1} 行不一样：期望「${e[i] ?? "（没有这一行）"}」，你的是「${a[i] ?? "（没有这一行）"}」。`;
  }
  return "输出不一样。";
}

export type PythonErrorInfo = {
  /** 错误类型，例如 NameError；解析不出来时为空 */
  type: string;
  /** 错误信息（最后一行冒号后面的部分） */
  message: string;
  /** 出错的行（学习者代码里的行号）；出在检查程序里或解析不出来时为空 */
  line: number | null;
  /** 给初学者看的中文提示 */
  hint: string;
};

const HINTS: Record<string, (msg: string) => string> = {
  SyntaxError: () => "语法错误：检查括号和引号是否成对、行尾有没有漏掉冒号，以及关键字有没有拼错。",
  IndentationError: () => "缩进不对：同一块代码要缩进相同的空格数，冒号后面的下一行要缩进。",
  TabError: () => "缩进里混用了 Tab 和空格，统一用空格。",
  NameError: (m) => {
    const name = /name '([^']+)'/.exec(m)?.[1];
    return `${name ? `名字 ${name}` : "有个名字"}还没有定义：是不是拼错了（注意大小写），或者用它之前没有先赋值？`;
  },
  TypeError: () => "类型不匹配：比如把文字和数字直接相加。需要时用 str() 或 int() 转换。",
  ValueError: () => "值的格式不对：比如 int(\"abc\") 没法转成数字。",
  ZeroDivisionError: () => "不能除以 0。",
  EOFError: () => "程序想用 input() 读输入，但这里没有输入可读。",
  IndexError: () => "下标超出范围：列表里没有那么多项。",
  KeyError: () => "字典里没有这个键。",
  AttributeError: () => "这个对象没有这个属性或方法：检查拼写，以及它是不是你以为的那种类型。",
};

/**
 * 解析 Python 的报错文本（Pyodide 抛出的 PythonError 文本，格式同标准回溯）。
 * learnerLines：学习者代码的行数，用来区分错误出在他的代码里，还是出在后面拼接的检查程序里。
 */
export function explainPythonError(raw: string, learnerLines: number): PythonErrorInfo {
  const lines = raw.split("\n").map((l) => l.trimEnd());
  const last = [...lines].reverse().find((l) => l.trim() !== "") ?? "";
  const m = /^([A-Za-z_][\w.]*)(?::\s?(.*))?$/.exec(last.trim());
  const type = m?.[1]?.split(".").pop() ?? "";
  const message = m?.[2] ?? "";

  let line: number | null = null;
  for (const l of lines) {
    const f = /File "<exec>", line (\d+)/.exec(l);
    if (f) line = Number(f[1]);
  }
  const inHarness = line !== null && line > learnerLines;
  const hintFn = HINTS[type];
  let hint = hintFn ? hintFn(message) : "运行出错了。读最后一行，它说明了错误类型。";
  if (inHarness) hint = "检查程序运行时出错：通常是因为你的代码没有定义它需要的名字，或者返回值的类型不对。" + hint;
  return { type, message, line: inHarness ? null : line, hint };
}

export function describeError(error: string, learnerLines: number): string {
  const e = explainPythonError(error, learnerLines);
  const where = e.line ? `第 ${e.line} 行：` : "";
  const what = e.type ? `${e.type}${e.message ? `: ${e.message}` : ""}` : "运行出错";
  return `${where}${what}。${e.hint}`;
}

/** 判一组检查。outcomes[i] 对应 checks[i]；少于 checks 的部分视为没运行。 */
export function gradeChecks(
  checks: CodeCheck[],
  outcomes: RunOutcome[],
  learnerLines: number,
  /** 把运行出错的文本变成给学习者看的话；默认按 Python 的报错来解析，JavaScript 传入自己的 */
  describe: (error: string, learnerLines: number) => string = describeError,
): { ok: boolean; results: CheckResult[] } {
  const results = checks.map((c, i): CheckResult => {
    const o = outcomes[i];
    const expected = normalizeOutput(c.expect);
    if (!o)
      return { label: c.label, ok: false, expected, actual: "", detail: "这一项没有运行。" };
    const actual = normalizeOutput(o.stdout);
    if (o.timedOut)
      return { label: c.label, ok: false, expected, actual, detail: "运行太久被停止了：检查有没有写出停不下来的循环。" };
    if (o.error)
      return { label: c.label, ok: false, expected, actual, detail: describe(o.error, learnerLines) };
    const ok = actual === expected;
    return {
      label: c.label,
      ok,
      expected,
      actual,
      detail: ok ? "通过。" : `${firstDiff(expected, actual)}${c.hint ? ` ${c.hint}` : ""}`,
    };
  });
  return { ok: results.length > 0 && results.every((r) => r.ok), results };
}

export function countLines(code: string): number {
  return code === "" ? 0 : code.replace(/\n+$/, "").split("\n").length;
}
