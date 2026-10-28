import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const source =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE,
    "Desktop",
    "frames_Camera_panning_around_sports_car_70b05187",
  );
const files = (await readdir(source))
  .filter((f) => /^frame_\d+\.webp$/.test(f))
  .sort();
if (files.length < 100)
  throw new Error("Sao necessarios pelo menos 100 frames.");
const selected = Array.from(
  { length: 100 },
  (_, i) => files[Math.round((i * (files.length - 1)) / 99)],
);
for (const [variant, width, quality] of [
  ["desktop", 1280, 75],
  ["mobile", 768, 65],
]) {
  await mkdir(`public/sequence/${variant}`, { recursive: true });
  for (let i = 0; i < 100; i++)
    await sharp(path.join(source, selected[i]))
      .resize({ width })
      .webp({ quality })
      .toFile(
        `public/sequence/${variant}/${String(i + 1).padStart(3, "0")}.webp`,
      );
}
await writeFile(
  "public/sequence/manifest.json",
  JSON.stringify(
    { sourceCount: files.length, frameCount: 100, selected },
    null,
    2,
  ),
);
console.log("100 frames preparados para desktop e mobile.");
