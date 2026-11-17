import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import protectedArt from "../docs/p2-final/PROTECTED_ART.json";
import reference from "../docs/p2-final/AI_REFERENCE_COMPARISON.json";

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
describe("P2 final protected baseline and user-uploaded AI reference", () => {
  it("preserves every original art asset, including previous centering, logos and P2 assets", () => {
    for (const [file, hash] of Object.entries(protectedArt)) expect(sha256(file), file).toBe(hash);
  });
  it("keeps the already-identical Claude reference behavior, not a fabricated rollback", () => {
    expect(reference.files.filter(f => !f.same).map(f => f.file)).toEqual(["src/features/settings/SettingsPage.tsx"]);
    for (const entry of reference.files.filter(f => f.same)) {
      expect(sha256(entry.file), entry.file).toBe(entry.reference_sha256);
      expect(entry.main_sha256).toBe(entry.reference_sha256);
      expect(entry.matching_history_commits.length).toBeGreaterThan(0);
    }
  });
});
