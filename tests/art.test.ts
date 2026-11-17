import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tracks } from "../src/content/catalog";
import { lessons } from "../src/content";
import { badges } from "../src/progress/badges";

const art = (f: string) => existsSync(join(process.cwd(), "public", "art", f));

describe("art files referenced by the app exist", () => {
  it("every track emblem exists", () => {
    for (const t of tracks) expect(art(t.art)).toBe(true);
  });
  it("every lesson header image exists", () => {
    for (const l of Object.values(lessons)) if (l.art) expect(art(l.art)).toBe(true);
  });
  it("every badge image exists", () => {
    for (const b of badges) expect(art(b.art)).toBe(true);
  });
  it("shared images used in pages exist", () => {
    for (const f of ["hero-home-1600x900.png", "empty-no-projects.png", "error-404.png", "app-icon-180.png", "track-f-hardware.png", "track-m-math.png", "lab-prompt-banner.png"])
      expect(art(f)).toBe(true);
  });
});
