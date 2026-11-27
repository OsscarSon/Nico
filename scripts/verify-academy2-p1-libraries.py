"""Execute the exact Python examples displayed in P1. Requires NumPy, SciPy, SymPy and scikit-learn."""
import ast
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src/content/academy2/p1"
EXAMPLE = re.compile(r"(?:library:|(?:const|export const) (?:abPython|quantilePython|polynomialLibrary)\s*=)\s*`([^`]+)`")

def examples():
    for name in ["mathBenches.ts", "statBenches.ts", "projects.ts"]:
        for index, code in enumerate(EXAMPLE.findall((DATA / name).read_text(encoding="utf8")), 1):
            yield f"{name}:{index}", code

def main():
    executed = 0
    for name, code in examples():
        dest = StringIO()
        with redirect_stdout(dest):
            exec(compile(ast.parse(code), name, "exec"), {})
        result = dest.getvalue().strip()
        if not result:
            raise RuntimeError(f"No output in {name}")
        print(f"PASS {name}: {result.splitlines()[0]}")
        executed += 1
    if executed != 17:
        raise SystemExit(f"Expected 17 different displayed library examples, executed {executed}")
    print(f"{executed} examples executed.")

if __name__ == "__main__":
    sys.exit(main())
