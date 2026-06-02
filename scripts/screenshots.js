const { chromium } = require("playwright");
const path = require("path");

const BASE = "https://noted-app-eight.vercel.app";
const OUT = path.join(__dirname, "../public/screenshots");

const EMAIL = process.env.NOTED_EMAIL;
const PASSWORD = process.env.NOTED_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set NOTED_EMAIL and NOTED_PASSWORD env vars before running.");
  process.exit(1);
}

async function shot(page, name) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`  saved ${name}`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // ── Log in ──────────────────────────────────────────────────────────────
  console.log("Logging in...");
  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);

  // Submit the form and wait for client-side navigation away from /auth
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log("Logged in, now at:", page.url());

  // ── Home ────────────────────────────────────────────────────────────────
  console.log("Home...");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "home.png");

  // ── Library ─────────────────────────────────────────────────────────────
  console.log("Library...");
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  await shot(page, "library.png");

  // ── Moods ───────────────────────────────────────────────────────────────
  console.log("Moods...");
  await page.goto(`${BASE}/moods`, { waitUntil: "networkidle" });
  await shot(page, "moods.png");

  // ── Profile ─────────────────────────────────────────────────────────────
  console.log("Profile...");
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await shot(page, "profile.png");

  // ── Album detail — Library → Albums tab → first album ───────────────────
  console.log("Album...");
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Click the Albums tab (labeled "albums (N)")
  await page.locator("button", { hasText: /^albums/i }).click();
  await page.waitForTimeout(1200);

  // Album cards are divs with onClick → router.push. Click first one.
  const firstAlbumCard = page.locator("div.cursor-pointer").first();
  if (await firstAlbumCard.count() > 0) {
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith("/album/"), { timeout: 15000 }),
      firstAlbumCard.click(),
    ]);
    await shot(page, "album.png");
  } else {
    console.log("  No album cards found — skipping album.png");
  }

  await browser.close();
  console.log("\nAll done. Screenshots saved to public/screenshots/");
})();
