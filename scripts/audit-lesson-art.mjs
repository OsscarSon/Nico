// Enumerate actual available content; audit original pixels and real course pages.
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/art-audit";
const PHASE = process.env.AUDIT_PHASE ?? "after";
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
let courses;
try {
  const { lessons, allCatalogLessons, validateContent } = await server.ssrLoadModule("/src/content/index.ts");
  if (validateContent().length) throw Error(validateContent().join("\n"));
  courses = allCatalogLessons().filter(l => l.status === "available").map(l => ({ id: l.id, title: lessons[l.id].title, art: lessons[l.id].art ?? null }));
} finally { await server.close(); }
const files = courses.filter(c => c.art).map(c => ({ ...c, sha256: createHash("sha256").update(readFileSync(`public/art/${c.art}`)).digest("hex") }));
const browser = await chromium.launch();
const records = []; const failures = []; let checks = 0;
const check = (label, ok) => { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failures.push(label); };
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : width === 390 ? 844 : 800 }, colorScheme: "light", hasTouch: width < 900, isMobile: width < 900 });
    for (const c of courses) {
      const page = await context.newPage(); const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${BASE}/#/lesson/${c.id}`); await page.locator(".hook").waitFor(); await page.evaluate(() => document.fonts.ready);
      const label = `${width}/${c.id}`;
      check(`${label} actual lesson, default dark`, (await page.locator(".lesson-head h1").innerText()) === c.title && await page.locator("html").getAttribute("data-theme") === "dark");
      if (c.art) {
        const img = page.locator(".lesson-art"); await img.waitFor(); await img.evaluate(im => im.decode());
        const m = await img.evaluate(im => {
          const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, center: r.x + r.width / 2 }; };
          const s = getComputedStyle(im), parent = im.closest(".lesson-body"), hook = document.querySelector(".hook");
          const canvas = document.createElement("canvas"); canvas.width = im.naturalWidth; canvas.height = im.naturalHeight;
          const ctx = canvas.getContext("2d"); ctx.drawImage(im, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let left = canvas.width, right = -1, sum = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const lo = Math.min(data[i], data[i + 1], data[i + 2]), hi = Math.max(data[i], data[i + 1], data[i + 2]);
            if (data[i + 3] && lo < 100 && (hi - lo > 30 || hi < 140)) { const x = (i / 4) % canvas.width; left = Math.min(left, x); right = Math.max(right, x); sum += x + 0.5; count++; }
          }
          const bottom = document.querySelector(".bottomnav"), limit = bottom && getComputedStyle(bottom).display !== "none" ? bottom.getBoundingClientRect().top : window.innerHeight;
          return { image: rect(im), body: rect(parent), hook: rect(hook), natural: [im.naturalWidth, im.naturalHeight], file: new URL(im.src).pathname.split("/").at(-1),
            css: { display: s.display, objectFit: s.objectFit, objectPosition: s.objectPosition, transform: s.transform, position: s.position, filter: s.filter, clipPath: s.clipPath },
            subject: { left, right: canvas.width - right - 1, boundsErrorPct: ((left + right + 1) / 2 - canvas.width / 2) / canvas.width * 100, inkErrorPct: count ? (sum / count - canvas.width / 2) / canvas.width * 100 : null }, limit, viewportWidth: window.innerWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
        });
        records.push({ ...c, width, ...m });
        check(`${label} referenced original dimensions loaded`, m.file === c.art && m.natural[0] > 0 && m.natural[1] > 0);
        check(`${label} image centered in reading column, hook edges aligned`, Math.abs(m.image.center - m.body.center) < 1 && Math.abs(m.image.x - m.hook.x) < 1 && Math.abs(m.image.right - m.hook.right) < 1);
        check(`${label} natural aspect ratio without stretching`, Math.abs((m.image.height - 2) - (m.image.width - 2) * m.natural[1] / m.natural[0]) < 1);
        check(`${label} no crop, offset, positioning trick or filter`, m.css.display === "block" && m.css.objectFit !== "cover" && m.css.objectPosition === "50% 50%" && m.css.transform === "none" && m.css.position === "static" && m.css.clipPath === "none" && m.css.filter === "none");
        check(`${label} full art visible without horizontal scroll or nav overlap`, !m.overflow && m.image.x >= 0 && m.image.right <= m.viewportWidth && m.image.y >= 0 && m.image.bottom <= m.limit);
        if (PHASE === "after") check(`${label} subject group within 5% of canvas center`, Math.abs(m.subject.boundsErrorPct) <= 5);
      } else {
        check(`${label} no invented art where no source exists`, await page.locator(".lesson-art").count() === 0);
        check(`${label} no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
        records.push({ ...c, width, image: null });
      }
      await page.screenshot({ path: `${OUT}/${c.id}-${width}.png` });
      check(`${label} no JavaScript errors`, errors.length === 0);
      await page.close();
    }
    await context.close();
  }
} finally {
  writeFileSync(`${OUT}/audit.json`, JSON.stringify({ phase: PHASE, courses, files, records, checks, failures }, null, 2) + "\n");
  await browser.close();
}
console.log(`${checks} checks, ${failures.length} failures; ${courses.length} available lessons, ${files.length} images`);
if (failures.length) process.exitCode = 1;
