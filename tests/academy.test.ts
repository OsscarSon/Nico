import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { academyTracks, curriculum, coursesFor, filterCourses, liveLessonFor, stageSummary } from "../src/content/academy";
import { lessons } from "../src/content";
import { loadTheme } from "../src/progress/theme";

describe("Academy catalog compatibility", () => {
  it("uses the full supplied catalog with honest, computed stage counts", () => {
    expect(new Set(curriculum.map(c => c.id)).size).toBe(212);
    expect(coursesFor("Foundation")).toHaveLength(100);
    expect(coursesFor("Intermediate")).toHaveLength(46);
    expect(coursesFor("Advanced")).toHaveLength(66);
    expect(stageSummary("Foundation")).toBe("已上线 " + Object.values(lessons).filter(lesson => !lesson.stage).length + " / 100");
    expect(stageSummary("Intermediate")).toBe("已上线 16 / 46");
    expect(stageSummary("Advanced")).toBe("精选 16 · 资料路径 50");
    expect(coursesFor("Foundation", "M")).toEqual([]);
  });
  it("maps every live course bijectively onto existing lesson IDs, and never launches planned content", () => {
    const mapped = curriculum.flatMap(c => {
      const lesson = liveLessonFor(c);
      if (c.status === "live") expect(lesson, c.id).toBeDefined();
      else expect(lesson, c.id).toBeUndefined();
      return lesson ? [lesson.id] : [];
    });
    expect(mapped.sort()).toEqual(Object.keys(lessons).sort());
    for (const [code, oldId] of [["A01", "a01-binary"], ["B01", "b01-variables"], ["C05", "c05-prompt-structure"]]) {
      expect(liveLessonFor(curriculum.find(c => c.id === code)!)?.id).toBe(oldId);
    }
  });
  it("searches case-insensitive titles and IDs and combines filters", () => {
    expect(filterCourses(curriculum, " c-i04 ", "live").map(c => c.id)).toEqual(["C-I04"]);
    expect(filterCourses(curriculum, " c-i04 ", "next")).toEqual([]);
    expect(filterCourses(coursesFor("Foundation", "A"), "二进制", "live").map(c => c.id)).toEqual(["A01"]);
    expect(filterCourses(curriculum, "A01", "planned")).toEqual([]);
    expect(filterCourses(curriculum, "no such course", "all")).toEqual([]);
  });
  it("keeps track image bytes (A–E baseline 8e16933, F/M added later) (baseline 8e16933)", () => {
    const hashes: Record<string, string> = {
      "track-a-network.png": "fae722f8e2ca8773831362abf7460c210da098677eb34b81b81f033b36ec7dad",
      "track-b-code.png": "0e6692ba24c452da7a1f5d080e21bbd61a3c60de3c9f64e4e627df3222591ff8",
      "track-d-games.png": "59300ca681c09980369c54242fa66433e159fe6dbbfdaa7f417bc281a852134e",
      "track-e-google.png": "461039ea8890a7c2486e10a9bda65db3c5ddaefd6f1f4285ced3066e2bdc3d1b",
      "track-c-ai.png": "34bfa7c45ae5d24f35b7f05ce4efa32026962c71b06da796df774ed067c9a6eb",
      "track-f-hardware.png": "1bb028fde00619817a571b62afd1c0c2c2ca5987165a6bb69a288e6396547a77",
      "track-m-math.png": "a443639270825294df48ad3ae0321e07d6ca2fa249e7bbba03dc766319f5570c",
};
    expect(academyTracks.filter(t => t.art)).toHaveLength(7);
    for (const t of academyTracks) {
      if (t.art) expect(createHash("sha256").update(readFileSync(`public/art/${t.art}`)).digest("hex")).toBe(hashes[t.art]);
    }
    expect(academyTracks.filter(t => !t.art).map(t => t.id)).toEqual([]);
  });
});

describe("theme preference", () => {
  const storage = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });
  it("defaults to dark with no preference, invalid settings, or unavailable storage", () => {
    expect(loadTheme(storage({}))).toBe("dark");
    expect(loadTheme(storage({ "nico-theme": "system", "nico-settings": "broken" }))).toBe("dark");
    expect(loadTheme({ getItem: () => { throw Error("disabled"); } })).toBe("dark");
  });
  it("preserves explicit current and legacy preferences", () => {
    expect(loadTheme(storage({ "nico-theme": "light" }))).toBe("light");
    expect(loadTheme(storage({ "nico-settings": '{"font":"large","theme":"light"}' }))).toBe("light");
    expect(loadTheme(storage({ "nico-theme": "dark", "nico-settings": '{"theme":"light"}' }))).toBe("dark");
  });
});
