import { PYODIDE_INDEX_URL } from "./config";
import { PythonRunner, type WorkerLike } from "./python";

export type TeachingPackage =
  "numpy" | "pandas" | "scikit-learn" | "matplotlib" | "polars" | "seaborn";

export function createNotebookPythonRunner(packages: string) {
  return new PythonRunner({
    createWorker() {
      const url = new URL("workers/python-worker.js", document.baseURI);
      url.searchParams.set("runtime", PYODIDE_INDEX_URL);
      url.searchParams.set("packages", packages);
      return new Worker(url, { type: "module" }) as unknown as WorkerLike;
    },
    indexURL: new URL("workers/notebook/", document.baseURI).href,
  });
}
