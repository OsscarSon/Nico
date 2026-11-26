import type { CodeSpec } from "../../schema";

const imports = ["from pathlib import Path", "from tempfile import TemporaryDirectory", "import csv", "", ""];
const declaration = ["class StudyLog:", "    def __init__(self, path: Path) -> None:", "        self.path = path", "", "    def total(self) -> int:"];
export const starter = [...imports, ...declaration,
  '        with self.path.open(encoding="utf-8", newline="") as source:',
  "            return len(list(csv.DictReader(source)))",
].join("\n");

export const solution = [...imports, ...declaration,
  "        try:",
  '            with self.path.open(encoding="utf-8", newline="") as source:',
  '                return sum(int(row["minutes"]) for row in csv.DictReader(source))',
  "        except FileNotFoundError:",
  "            return 0",
].join("\n");

const create = (varName: string, filename: string, csv: string) => [
  "    " + varName + " = Path(directory) / " + JSON.stringify(filename),
  "    " + varName + ".write_text(" + JSON.stringify(csv) + ', encoding="utf-8")',
];
const fixture = (lines: string[]) => ['with TemporaryDirectory() as directory:', ...lines].join("\n");

export const pythonFree: CodeSpec = {
  starter: [solution, "", fixture([
    ...create("path", "demo.csv", 'name,minutes\n"社团,阅读",12\nNico,5\n'),
    "    print(StudyLog(path).total())",
    '    print(StudyLog(Path(directory) / "missing.csv").total())',
  ])].join("\n"),
};

export const pythonChallenge: CodeSpec = {
  starter,
  solution,
  checks: [
    { label: "CSV 引号与两笔时长", harness: fixture([...create("path", "study.csv", 'name,minutes\n"A,B",12\nC,5\n'), "    print(StudyLog(path).total())"]),
      expect: "17", hint: "用 DictReader 解析带引号的列，读取 minutes 数值并求和。" },
    { label: "两个实例使用独立文件与不同表头顺序", harness: fixture([
      ...create("first", "morning.csv", "minutes,name\n3,A\n8,B\n"),
      ...create("second", "evening.csv", "name,minutes\nC,40\n"),
      "    left, right = StudyLog(first), StudyLog(second)",
      "    print(left.total(), right.total(), left.total())",
    ]), expect: "11 40 11", hint: "从 self.path 读取当前对象的数据，匹配列名而非列号。" },
    { label: "只有表头时合计为零", harness: fixture([...create("path", "empty.csv", "name,minutes\n"), "    print(StudyLog(path).total())"]), expect: "0" },
    { label: "缺少文件时视为尚无记录", harness: fixture(['    print(StudyLog(Path(directory) / "missing.csv").total())']), expect: "0", hint: "只捕获 FileNotFoundError。" },
    { label: "有坏数值时将 ValueError 留给调用者", harness: fixture([
      ...create("path", "broken.csv", "name,minutes\nA,abc\n"),
      "    try:",
      "        StudyLog(path).total()",
      "    except ValueError:",
      '        print("INVALID")',
    ]), expect: "INVALID", hint: "坏值和缺文件不同，别用大范围的 except 吞掉它。" },
  ],
  requires: [
    { pattern: "class\\s+StudyLog\\s*:", message: "保留 StudyLog 类和每个实例自己的路径。" },
    { pattern: "\\bwith\\b", message: "用 with 管理文件句柄。" },
  ],
};
