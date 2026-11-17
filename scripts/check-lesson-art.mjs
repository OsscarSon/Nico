// Actual browser checks for the supplied Batch02 artwork; no DOM/style overrides.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/art-batch02";
mkdirSync(OUT, { recursive: true });
const courses = ["a07-os", "a08-command-line", "a11-devices", "a12-packets", "a14-tcp"];
const fileFor = id => id === "a12-packets" ? "lesson-a12-packets-centered-batch02.png" : `lesson-${id}.png`;
const browser = await chromium.launch();
const measurements = []; const failures = []; let checks = 0;
const check = (label, ok) => { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failures.push(label); };
try {
  for (const width of [1440, 390, 360]) {
    // Even on an OS preferring light, Nico must default to dark.
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : width === 390 ? 844 : 800 }, colorScheme: "light", hasTouch: width < 900, isMobile: width < 900 });
    for (const id of courses) {
      const page = await context.newPage(); const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${BASE}/#/lesson/${id}`); const image = page.locator(".lesson-art");
      await image.waitFor(); await image.evaluate(im => im.decode()); await page.evaluate(() => document.fonts.ready);
      const m = await image.evaluate(im => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, center: r.x + r.width / 2 }; };
        const style = getComputedStyle(im); const bottom = document.querySelector(".bottomnav");
        const bottomVisible = bottom && getComputedStyle(bottom).display !== "none";
        // Dark / blue / amber subject pixels, excluding the pale grid and paper.
        // A bounding-box metric supplements visual inspection; it is not a perceptual score.
        const canvas = document.createElement("canvas"); canvas.width = im.naturalWidth; canvas.height = im.naturalHeight;
        const ctx = canvas.getContext("2d"); ctx.drawImage(im, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let left = canvas.width, right = -1, total = 0, sumX = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const min = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]), max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
          if (pixels[i + 3] && min < 100 && (max - min > 30 || max < 140)) { const x = (i / 4) % canvas.width; left = Math.min(left, x); right = Math.max(right, x); total++; sumX += x + 0.5; }
        }
        return { image: rect(im), body: rect(im.closest(".lesson-body")), hook: rect(document.querySelector(".hook")), natural: [im.naturalWidth, im.naturalHeight], file: new URL(im.src).pathname.split("/").at(-1), theme: document.documentElement.dataset.theme,
          css: { display: style.display, objectFit: style.objectFit, objectPosition: style.objectPosition, transform: style.transform, position: style.position, filter: style.filter, clipPath: style.clipPath },
          subject: { leftMargin: left, rightMargin: canvas.width - right - 1, boundsCenterErrorPct: Math.abs((left + right + 1) / 2 - canvas.width / 2) / canvas.width * 100, inkCenterErrorPct: total ? Math.abs(sumX / total - canvas.width / 2) / canvas.width * 100 : null },
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          viewport: { width: window.innerWidth, height: window.innerHeight, contentBottom: bottomVisible ? bottom.getBoundingClientRect().top : window.innerHeight } };
      });
      measurements.push({ id, width, ...m });
      const label = `${width}/${id}`;
      check(`${label} supplied 1672x941 art loaded`, m.file === fileFor(id) && m.natural[0] === 1672 && m.natural[1] === 941);
      check(`${label} default dark, draft, no pending placeholder`, m.theme === "dark" && await page.locator(".pill.draft").count() === 1 && await page.locator(".foundation-art-pending").count() === 0);
      check(`${label} image and readable hook share center, hook contained in wider art column`, Math.abs(m.image.center - m.body.center) < 1 && Math.abs(m.image.center - m.hook.center) < 1 && m.hook.x >= m.image.x - 1 && m.hook.right <= m.image.right + 1);
      check(`${label} subject bounds and ink center within 5%`, m.subject.boundsCenterErrorPct <= 5 && m.subject.inkCenterErrorPct !== null && m.subject.inkCenterErrorPct <= 5);
      check(`${label} original aspect ratio, no crop, offset or filter`, Math.abs((m.image.height - 2) - (m.image.width - 2) * 941 / 1672) < 1 && m.css.objectFit !== "cover" && m.css.objectPosition === "50% 50%" && m.css.transform === "none" && m.css.position === "static" && m.css.filter === "none" && m.css.clipPath === "none");
      check(`${label} full art visible, no horizontal overflow or bottom-nav obstruction`, !m.overflow && m.image.x >= 0 && m.image.right <= m.viewport.width && m.image.y >= 0 && m.image.bottom <= m.viewport.contentBottom);
      await page.screenshot({ path: `${OUT}/${id}-${width}.png` });
      await page.screenshot({ path: `${OUT}/${id}-${width}-full.png`, fullPage: true });
      if (width === 390) {
        await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
        check(`${label} light mode keeps complete unfiltered art`, await page.locator("html").getAttribute("data-theme") === "light" && await image.evaluate(im => im.complete && im.naturalWidth === 1672 && getComputedStyle(im).filter === "none"));
        // Restore the default for the next course in this same context.
        await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
      }
      check(`${label} no JavaScript errors`, errors.length === 0); await page.close();
    }
    await context.close();
  }
} finally {
  writeFileSync(`${OUT}/measurements.json`, JSON.stringify(measurements, null, 2) + "\n");
  await browser.close();
}
console.log(`${checks} checks, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
