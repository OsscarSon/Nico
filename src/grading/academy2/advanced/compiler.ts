type Operator = "+" | "-" | "*";
export type Expression =
  | { kind: "constant"; value: number }
  | { kind: "symbol"; name: string }
  | { kind: "binary"; op: Operator; left: Expression; right: Expression };
type Token = { text: string; offset: number };

export function scan(text: string): Token[] {
  if (text.length > 400) throw Error("表达式最多 400 个字符。");
  const parts = /\s+|[0-9]+|[A-Za-z_][A-Za-z0-9_]*|[()+*-]|./gy;
  const tokens: Token[] = [];
  for (let token = parts.exec(text); token; token = parts.exec(text)) {
    const value = token[0];
    if (/^\s/.test(value)) continue;
    if (!/^[0-9A-Za-z_()+*-]+$/.test(value))
      throw Error("第 " + (token.index + 1) + " 列有未知符号。");
    tokens.push({ text: value, offset: token.index });
  }
  return tokens;
}

export function parse(tokens: Token[]): Expression {
  let index = 0;
  function atom(): Expression {
    const token = tokens[index++];
    if (!token) throw Error("表达式缺少操作数。");
    if (token.text === "(") {
      const inside = expression(0);
      if (tokens[index++]?.text !== ")") throw Error("缺少右括号。");
      return inside;
    }
    if (/^\d/.test(token.text)) {
      const value = Number(token.text);
      if (!Number.isSafeInteger(value)) throw Error("常量超出安全整数范围。");
      return { kind: "constant", value };
    }
    if (/^[a-z_]/i.test(token.text))
      return { kind: "symbol", name: token.text };
    throw Error("第 " + (token.offset + 1) + " 列需要操作数。");
  }
  function expression(minPrecedence: number): Expression {
    let left = atom();
    for (;;) {
      const op = tokens[index]?.text;
      if (op !== "+" && op !== "-" && op !== "*") break;
      const precedence = op === "*" ? 2 : 1;
      if (precedence < minPrecedence) break;
      index++;
      left = { kind: "binary", op, left, right: expression(precedence + 1) };
    }
    return left;
  }
  const root = expression(0);
  if (index !== tokens.length) throw Error("操作数之间需要运算符。");
  return root;
}

function operation(op: Operator, a: number, b: number) {
  const value = op === "+" ? a + b : op === "-" ? a - b : a * b;
  if (!Number.isSafeInteger(value)) throw Error("运算超出安全整数范围。");
  return value;
}

export function fold(root: Expression): Expression {
  if (root.kind !== "binary") return root;
  const left = fold(root.left),
    right = fold(root.right);
  return left.kind === "constant" && right.kind === "constant"
    ? { kind: "constant", value: operation(root.op, left.value, right.value) }
    : { ...root, left, right };
}
export function interpret(
  root: Expression,
  bindings: ReadonlyMap<string, number>,
): number {
  if (root.kind === "constant") return root.value;
  if (root.kind === "symbol") {
    const value = bindings.get(root.name);
    if (value === undefined) throw Error("未定义的变量 " + root.name);
    return value;
  }
  return operation(
    root.op,
    interpret(root.left, bindings),
    interpret(root.right, bindings),
  );
}
type Instruction =
  | { op: "push"; operand: number }
  | { op: "load"; operand: string }
  | { op: Operator };
export function emit(root: Expression): Instruction[] {
  if (root.kind === "constant") return [{ op: "push", operand: root.value }];
  if (root.kind === "symbol") return [{ op: "load", operand: root.name }];
  return [...emit(root.left), ...emit(root.right), { op: root.op }];
}

export function run(
  instructions: Instruction[],
  variables: ReadonlyMap<string, number>,
) {
  const stack: number[] = [];
  const trace: { instruction: Instruction; stack: number[] }[] = [];
  for (const instruction of instructions) {
    if (instruction.op === "push") stack.push(instruction.operand);
    else if (instruction.op === "load") {
      const value = variables.get(instruction.operand);
      if (value === undefined)
        throw Error("未定义的变量 " + instruction.operand);
      stack.push(value);
    } else {
      const right = stack.pop(),
        left = stack.pop();
      if (left === undefined || right === undefined) throw Error("栈下溢。");
      stack.push(operation(instruction.op, left, right));
    }
    trace.push({ instruction, stack: [...stack] });
  }
  if (stack.length !== 1) throw Error("表达式结束时栈必须有一个值。");
  return { value: stack[0]!, trace };
}
