import { existsSync } from "node:fs";
import { basename, join } from "node:path";

export const pythonAssetsRoute = "https://cdn.jsdelivr.net/pyodide/v314.0.8/full/**";

export async function serveCachedPython(context) {
  const directory = process.env.PYODIDE_ASSET_DIR;
  if (!directory) return;
  await context.route(pythonAssetsRoute, (route) => {
    const file = basename(new URL(route.request().url()).pathname);
    const path = join(directory, file);
    const contentType = file.endsWith(".wasm")
      ? "application/wasm"
      : /\.m?js$/.test(file)
        ? "text/javascript"
        : file.endsWith(".json")
          ? "application/json"
          : "application/octet-stream";
    return existsSync(path)
      ? route.fulfill({
          path,
          contentType,
          headers: { "access-control-allow-origin": "*" },
        })
      : route.abort();
  });
}
