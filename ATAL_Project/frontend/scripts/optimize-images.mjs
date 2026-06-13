import { readdirSync, unlinkSync, existsSync } from "fs";
import { join, parse } from "path";
import sharp from "sharp";

const PUBLIC_DIR = new URL("../public", import.meta.url).pathname;

const LOSSLESS_FILES = new Set(["ground_sprite.png", "grass.png"]);

const pngFiles = readdirSync(PUBLIC_DIR).filter(
  (f) => f.endsWith(".png") && existsSync(join(PUBLIC_DIR, f))
);

let totalSaved = 0;

for (const file of pngFiles) {
  const inputPath = join(PUBLIC_DIR, file);
  const webpName = parse(file).name + ".webp";
  const outputPath = join(PUBLIC_DIR, webpName);

  const { size: originalSize } = await sharp(inputPath).metadata();

  const isLossless = LOSSLESS_FILES.has(file);

  await sharp(inputPath)
    .webp(
      isLossless
        ? { lossless: true, quality: 100, effort: 2 }
        : { quality: 85, effort: 4 }
    )
    .toFile(outputPath);

  const { size: webpSize } = await sharp(outputPath).metadata();

  const saved = originalSize - webpSize;
  totalSaved += saved;

  const pct = ((1 - webpSize / originalSize) * 100).toFixed(1);
  console.log(
    `${file}  ${(originalSize / 1024).toFixed(0)}K → ${(webpSize / 1024).toFixed(0)}K  (-${pct}%)  ${isLossless ? "lossless" : "q85"}`
  );

  unlinkSync(inputPath);
  console.log(`  → deleted ${file}`);
}

console.log(`\nTotal saved: ${(totalSaved / 1024 / 1024).toFixed(1)} MB`);
