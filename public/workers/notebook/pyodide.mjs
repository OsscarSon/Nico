/* global self */
// Initialize only the packages selected by the notebook. The existing Python Worker
// reports ready after this promise resolves and then applies its ordinary code deadline.
const allowed = new Set([
  "numpy",
  "pandas",
  "matplotlib",
  "polars",
  "seaborn",
  "scikit-learn",
]);

const initialize = {
  numpy: "import numpy",
  pandas: "import pandas",
  polars: "import polars",
  matplotlib:
    "import matplotlib\nmatplotlib.use('svg')\nimport matplotlib.pyplot",
  seaborn: "import seaborn",
  "scikit-learn": "from sklearn import linear_model, metrics",
};

export async function loadPyodide() {
  const settings = new self.URL(self.location.href).searchParams;
  const indexURL = settings.get("runtime");
  if (
    !indexURL ||
    !/^https:\/\/cdn\.jsdelivr\.net\/pyodide\/v[0-9.]+\/full\/$/.test(indexURL)
  ) {
    throw Error("Pyodide 运行时地址无效。");
  }
  const chosen = (settings.get("packages") ?? "").split(",").filter(Boolean);
  if (chosen.some((name) => !allowed.has(name)))
    throw Error("未支持的教学库。");
  const official = await import(indexURL + "pyodide.mjs");
  const runtime = await official.loadPyodide({ indexURL });
  const packages = chosen.filter((name) => name !== "seaborn");
  if (chosen.includes("seaborn")) {
    packages.push("matplotlib", "pandas");
    packages.push(
      new self.URL(
        "../../third-party/seaborn-0.13.2-py3-none-any.whl",
        import.meta.url,
      ).href,
    );
  }
  if (packages.length) {
    await runtime.loadPackage([...new Set(packages)]);
    if (chosen.includes("seaborn") && !chosen.includes("matplotlib"))
      chosen.unshift("matplotlib");
    await runtime.runPythonAsync(
      chosen.map((name) => initialize[name]).join("\n"),
    );
  }
  return runtime;
}
