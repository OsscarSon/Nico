// User-selected lossless pixel rearrangement, never generative redrawing.
// Existing originals are retained. --write creates new files exclusively; default verifies them.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
const targets = [
  ["a01-binary", "lesson-a01-bits.png", "lesson-a01-bits-centered-audit.png"],
  ["a06-memory", "lesson-a06-memory-layers.png", "lesson-a06-memory-layers-centered-audit.png"],
  ["b15-git-branches", "lesson-b10-git-branches.png", "lesson-b10-git-branches-centered-audit.png"],
  ["c05-prompt-structure", "lesson-c05-prompt-structure.png", "lesson-c05-prompt-structure-centered-audit.png"],
];
const write = process.argv.includes("--write");
const OUT = process.env.ART_VERIFY_OUT ?? "test-results/art-audit/pixel-preservation.json";
const hash = data => createHash("sha256").update(data).digest("hex");
const browser = await chromium.launch(); const records = [];
try {
  const page = await browser.newPage();
  for (const [id, original, centered] of targets) {
    const source = readFileSync(`public/art/${original}`);
    const actual = write ? null : readFileSync(`public/art/${centered}`);
    const result = await page.evaluate(async ({ source, actual }) => {
      const load = async url => { const im = document.createElement("img"); im.src = url; await im.decode(); return im; };
      const image = await load(source), w = image.naturalWidth, h = image.naturalHeight;
      if (w !== 1600 || h !== 900) throw Error("Unexpected source dimensions; inspect before changing assets.");
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
      const original = ctx.getImageData(0, 0, w, h).data;
      const tileIndex = (x, y) => ((y % 32) * w + (x % 32)) * 4;
      const sameBackground = (x, y) => { const a = (y * w + x) * 4, b = tileIndex(x, y); return [0, 1, 2, 3].every(k => original[a + k] === original[b + k]); };
      // All four known source images have an unobstructed 32px repeating grid here.
      for (let y = 0; y < h; y++) for (let x = 0; x < 128; x++) if (!sameBackground(x, y)) throw Error("Grid template differs from original: manual review required.");
      let left = w, right = -1, top = h, bottom = -1, foregroundPixels = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!sameBackground(x, y)) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); foregroundPixels++; }
      if (!foregroundPixels) throw Error("No artwork detected.");
      const dx = Math.floor((w - 1 - left - right) / 2);
      if (left + dx < 0 || right + dx >= w) throw Error("Translation would discard source pixels.");
      const expected = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, t = tileIndex(x, y);
        for (let k = 0; k < 4; k++) expected.data[i + k] = original[t + k];
      }
      // Move every non-background pixel exactly once, at integer coordinates. No scaling/antialiasing.
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (!sameBackground(x, y)) {
        const from = (y * w + x) * 4, to = (y * w + x + dx) * 4;
        for (let k = 0; k < 4; k++) expected.data[to + k] = original[from + k];
      }
      ctx.putImageData(expected, 0, 0);
      const png = canvas.toDataURL("image/png");
      if (actual) {
        const im = await load(actual); if (im.naturalWidth !== w || im.naturalHeight !== h) throw Error("Derivative changed dimensions.");
        ctx.clearRect(0, 0, w, h); ctx.drawImage(im, 0, 0); const pixels = ctx.getImageData(0, 0, w, h).data;
        if (!pixels.every((value, index) => value === expected.data[index])) throw Error("Derivative is not pixel-identical to the expected lossless rearrangement.");
      }
      return { width: w, height: h, oldBounds: { left, right, top, bottom }, dx, newBounds: { left: left + dx, right: right + dx, top, bottom }, foregroundPixels, allForegroundPixelsPreserved: true, onlyBackgroundAndIntegerPlacementChanged: true, verified: Boolean(actual), png };
    }, { source: `data:image/png;base64,${source.toString("base64")}`, actual: actual ? `data:image/png;base64,${actual.toString("base64")}` : null });
    const { png, ...metrics } = result;
    if (write) writeFileSync(`public/art/${centered}`, Buffer.from(png.split(",")[1], "base64"), { flag: "wx" });
    if (hash(readFileSync(`public/art/${original}`)) !== hash(source)) throw Error("Original file changed.");
    records.push({ id, original, centered, originalSHA256: hash(source), derivativeSHA256: hash(readFileSync(`public/art/${centered}`)), ...metrics });
    console.log(`PASS ${id}: ${write ? "created" : "verified"} separate derivative; dx=${metrics.dx}; original retained; ${metrics.foregroundPixels} original foreground pixels preserved`);
  }
} finally { await browser.close(); }
mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(records, null, 2) + "\n");
