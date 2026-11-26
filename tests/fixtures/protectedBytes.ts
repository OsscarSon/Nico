import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const teachingPackages = {
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

  // Authorize just the P1.5 addition and compare the remaining original lock against both original baselines.
  const lock = JSON.parse(raw.toString());
  assert.equal(lock.packages[""].dependencies.katex, "^0.19.1");
  for (const [path, [version, integrity]] of Object.entries(teachingPackages)) {
    assert.equal(lock.packages[path]?.version, version, path);
    assert.equal(lock.packages[path]?.integrity, integrity, path);
    delete lock.packages[path];
  }
  delete lock.packages[""].dependencies.katex;
  return JSON.stringify(lock, null, 2) + "\n";
}
