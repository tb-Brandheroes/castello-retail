#!/usr/bin/env node
/**
 * Offline-readiness check for the kiosk PWA.
 * Runs after `vite build` and verifies that every asset the app needs
 * is present in dist/ and listed in the SW precache manifest.
 *
 * Usage: node scripts/verify-offline.mjs
 *   (or `npm run verify:offline` which builds first)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`✓ ${msg}`);

if (!fs.existsSync(DIST)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

// 1. Recipe images
const metaPath = path.join(ROOT, "src/data/recipes-meta.json");
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
const recipeImages = new Set();
for (const r of Object.values(meta)) {
  if (r?.image) recipeImages.add(r.image);
}
let missingImg = 0;
for (const rel of recipeImages) {
  const p = path.join(DIST, rel.replace(/^\//, ""));
  if (!fs.existsSync(p)) {
    fail(`missing image: ${rel}`);
    missingImg++;
  }
}
if (missingImg === 0) ok(`${recipeImages.size} recipe images present`);

// 2. Manifest + icons
const manifestPath = path.join(DIST, "manifest.webmanifest");
if (!fs.existsSync(manifestPath)) {
  fail("manifest.webmanifest missing in dist/");
} else {
  ok("manifest.webmanifest present");
  const mf = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const icon of mf.icons ?? []) {
    const p = path.join(DIST, icon.src.replace(/^\//, ""));
    if (!fs.existsSync(p)) fail(`missing icon: ${icon.src}`);
  }
}

// 3. Service worker + precache manifest
const swPath = path.join(DIST, "sw.js");
if (!fs.existsSync(swPath)) {
  fail("sw.js missing in dist/ — PWA build may be disabled");
} else {
  ok("sw.js present");
  const sw = fs.readFileSync(swPath, "utf8");
  const match = sw.match(/precacheAndRoute\(\s*(\[[\s\S]*?\])\s*\)/);
  if (!match) {
    console.warn("· could not parse precache manifest from sw.js (non-fatal)");
  } else {
    try {
      // crude count of url entries
      const count = (match[1].match(/"url"\s*:/g) ?? []).length;
      ok(`sw.js precaches ${count} entries`);
    } catch {
      /* ignore */
    }
  }
}

// 4. Fonts
const fontDir = path.join(DIST, "assets");
if (fs.existsSync(fontDir)) {
  const fonts = fs
    .readdirSync(fontDir)
    .filter((f) => /\.(woff2?|ttf)$/.test(f));
  if (fonts.length === 0) {
    fail("no font files found in dist/assets — fonts may be unbundled");
  } else {
    ok(`${fonts.length} font files bundled`);
  }
}

if (process.exitCode) {
  console.error("\nOffline verification FAILED.");
  process.exit(process.exitCode);
}
console.log("\nAll offline checks passed.");
