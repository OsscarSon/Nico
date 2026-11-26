type Level = "HIGH" | "LOW";
type Command = { action: "write"; level: Level } | { action: "delay"; ms: number };
type Span = { start: number; end: number; level: Level };
type Sketch = { ok: true; spans: Span[]; period: number; elapsed: number } | { ok: false; reason: string };
const bad = (reason: string): Sketch => ({ ok: false, reason });

export const starter = [
  "void setup() {",
  "  pinMode(LED_BUILTIN, OUTPUT);",
  "}",
  "void loop() {",
  "  digitalWrite(LED_BUILTIN, HIGH);",
  "  delay(500);",
  "  digitalWrite(LED_BUILTIN, LOW);",
  "  delay(500);",
  "}",
].join("\n");

export function runSketch(source: string): Sketch {
  if (source.length > 600) return bad("这块教学板只处理 600 字符以内的程序。");
  const code = source.replace(/\/\/[^\n]*/g, "").trim();
  const match = /^void\s+setup\s*\(\s*\)\s*\{([^{}]*)\}\s*void\s+loop\s*\(\s*\)\s*\{([^{}]*)\}$/.exec(code);
  if (!match) return bad("请保留 void setup() 与 void loop()，并配齐括号和大括号。");
  if (!/^\s*pinMode\s*\(\s*LED_BUILTIN\s*,\s*OUTPUT\s*\)\s*;\s*$/.test(match[1]!)) {
    return bad("请在 setup 中用 pinMode(LED_BUILTIN, OUTPUT); 设置教学板灯为输出。");
  }
  const statements = match[2]!.trim().split(";");
  if (statements.pop()?.trim() !== "" || !statements.length || statements.length > 16) return bad("loop 需要 1–16 条以分号结尾的指令。");
  const commands: Command[] = [];
  for (const statement of statements) {
    const write = /^\s*digitalWrite\s*\(\s*LED_BUILTIN\s*,\s*(HIGH|LOW)\s*\)\s*$/.exec(statement);
    if (write) {
      commands.push({ action: "write", level: write[1] === "HIGH" ? "HIGH" : "LOW" });
      continue;
    }
    const delay = /^\s*delay\s*\(\s*(\d{1,4})\s*\)\s*$/.exec(statement);
    if (!delay || Number(delay[1]) > 5000) return bad("loop 只支持 digitalWrite(LED_BUILTIN, HIGH 或 LOW) 与 0–5000ms 的 delay。");
    commands.push({ action: "delay", ms: Number(delay[1]) });
  }

  let timestamp = 0;
  let level: Level = "LOW";
  const spans: Span[] = [];
  let period = 0;
  for (let repeat = 0; repeat < 2; repeat++) {
    for (const command of commands) {
      if (command.action === "write") level = command.level;
      else if (command.ms > 0) {
        const end = timestamp + command.ms;
        const previous = spans.at(-1);
        if (previous?.level === level) previous.end = end;
        else spans.push({ start: timestamp, end, level });
        timestamp = end;
      }
    }
    if (repeat === 0) period = timestamp;
  }
  if (!period) return bad("程序没有产生可观察的时间区间。");
  return { ok: true, spans, period, elapsed: timestamp };
}

export const sketchPassed = (sketch: Sketch | null) => Boolean(sketch?.ok && sketch.period === 1000 && sketch.elapsed === 2000
  && sketch.spans.map(span => span.level + ":" + (span.end - span.start)).join(",") === "HIGH:250,LOW:750,HIGH:250,LOW:750");
