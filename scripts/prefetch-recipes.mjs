#!/usr/bin/env node
/**
 * Prefetch all recipe metadata + images from the Castello recipe-meta edge
 * function, so the app can run completely offline.
 *
 * Outputs:
 *   - src/data/recipes-meta.json   (url -> { name, description, image })
 *   - public/recipe-images/<slug>.<ext>
 *
 * Runs automatically via `npm run prebuild`. Skips silently on network
 * failure (keeps last successful snapshot in place).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SUPABASE_URL = "https://wqgrusarsvrowaxrxesd.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ3J1c2Fyc3Zyb3dheHJ4ZXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDA3MzIsImV4cCI6MjA5MzcxNjczMn0.FRyOH_aLHi_tqPjk587ZvenneUi5BY9Vqg36vmqQ3Yg";
const BASE = "https://www.castellocheese.com/da/opskrifter/";
const META_URL = `${SUPABASE_URL}/functions/v1/recipe-meta`;
const OUT_JSON = path.join(ROOT, "src/data/recipes-meta.json");
const OUT_IMG_DIR = path.join(ROOT, "public/recipe-images");

async function extractSlugs() {
  const src = await fs.readFile(path.join(ROOT, "src/data/recipes.ts"), "utf8");
  const slugs = new Set();
  // Capture every quoted slug inside the raw{} map
  const re = /"([a-z0-9-]+(?:-[a-z0-9-]+)*)"/g;
  let m;
  while ((m = re.exec(src))) {
    const s = m[1];
    // Heuristic: slugs are long (>=8) and contain at least one dash
    if (s.length >= 8 && s.includes("-") && !["10-15", "20-25", "30-35"].includes(s)) {
      slugs.add(s);
    }
  }
  return [...slugs];
}

async function fetchMeta(url) {
  const res = await fetch(`${META_URL}?url=${encodeURIComponent(url)}`, {
    headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
  });
  if (!res.ok) throw new Error(`meta ${res.status} for ${url}`);
  return res.json();
}

async function downloadImage(url, slug) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`img ${res.status} for ${url}`);
  const ct = res.headers.get("content-type") || "";
  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
  const buf = Buffer.from(await res.arrayBuffer());
  const file = `${slug}.${ext}`;
  await fs.writeFile(path.join(OUT_IMG_DIR, file), buf);
  return `/recipe-images/${file}`;
}

async function main() {
  if (process.env.SKIP_PREFETCH === "1") {
    console.log("[prefetch-recipes] SKIP_PREFETCH=1 → skipping");
    return;
  }
  const slugs = await extractSlugs();
  console.log(`[prefetch-recipes] ${slugs.length} unique recipes`);
  await fs.mkdir(OUT_IMG_DIR, { recursive: true });

  // Load previous snapshot to preserve entries that fail this run
  let out = {};
  try {
    out = JSON.parse(await fs.readFile(OUT_JSON, "utf8"));
  } catch {
    /* first run */
  }

  let ok = 0;
  let failed = 0;
  const concurrency = 6;
  const queue = [...slugs];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const slug = queue.shift();
        const url = `${BASE}${slug}/`;
        try {
          const meta = await fetchMeta(url);
          let localImage = out[url]?.image;
          if (meta.image) {
            try {
              localImage = await downloadImage(meta.image, slug);
            } catch (e) {
              console.warn(`[prefetch-recipes] image failed ${slug}: ${e.message}`);
            }
          }
          out[url] = {
            name: meta.name ?? "",
            description: meta.description ?? "",
            image: localImage ?? "",
          };
          ok++;
        } catch (e) {
          failed++;
          console.warn(`[prefetch-recipes] meta failed ${slug}: ${e.message}`);
        }
      }
    }),
  );

  await fs.writeFile(OUT_JSON, JSON.stringify(out, null, 2) + "\n");
  console.log(`[prefetch-recipes] done: ${ok} ok, ${failed} failed`);
}

main().catch((e) => {
  console.warn("[prefetch-recipes] fatal:", e.message);
  // Never fail the build — fall back to existing snapshot
  process.exit(0);
});
