import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const teachingPackages = {
  "node_modules/sql.js": [
    "1.17.0",
    "sha512-HNdo5+2eSTEm7iLcfXUd2mjZX3Oe+5mJ0uDgIpirS7gSLHhZIw9kWDWxNcDVeFGEIBxJlkgo525g0CZJoH8GgA==",
  ],
  "node_modules/@types/sql.js": [
    "1.16.1",
    "sha512-HiSyYuJLkt+CINX+0wSLVgmwhLfwJQY8h9sxwJjb42E9/Vj1ssrdmn4BZRIqJEZPXWizy3YtUoiNsZysduBlzA==",
  ],
  "node_modules/@types/emscripten": [
    "1.41.6",
    "sha512-uN+9i8bFT5CUcZfyIEYDrSueACEyKGbUs5kC/72DGlZZoinh84sJfVV0i8UOJD1asdzkvLPBRrKs41kZ8MdEXg==",
  ],
  "node_modules/katex": [
    "0.19.1",
    "sha512-jG8uKntjSEcm2EpQOh0XturpPuuC9r3Sq5HLHdsFdWZT27E672SF19QEi+of0/YeOy15lDgRhKvr5614uRrEfA==",
  ],
  "node_modules/commander": [
    "15.1.0",
    "sha512-cgnQ88TRrWcC7pVq46RzJVRMktu3W2RcbnoidnfBsl1bmDCBwJS/udcIZpKoCrbAYYaCqsz1yZCVIgbIaU3ddQ==",
  ],
} as const;

export function protectedBytes(file: string): Buffer | string {
  const raw = readFileSync(file);
  if (file !== "package-lock.json") return raw;

  // Validate fixed versions and integrity for the P1.5 and P3 additions before checking both original baselines.
  const lock = JSON.parse(raw.toString());
  assert.equal(lock.packages[""].dependencies.katex, "^0.19.1");
  assert.equal(lock.packages[""].dependencies["sql.js"], "1.17.0");
  assert.equal(lock.packages[""].devDependencies["@types/sql.js"], "1.16.1");
  for (const [path, [version, integrity]] of Object.entries(teachingPackages)) {
    assert.equal(lock.packages[path]?.version, version, path);
    assert.equal(lock.packages[path]?.integrity, integrity, path);
    delete lock.packages[path];
  }
  delete lock.packages[""].dependencies.katex;
  delete lock.packages[""].dependencies["sql.js"];
  delete lock.packages[""].devDependencies["@types/sql.js"];
  return JSON.stringify(lock, null, 2) + "\n";
}
