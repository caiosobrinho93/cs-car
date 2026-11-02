import sharp from "sharp";
import { readdir, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
const source =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE,
    "Desktop",
    "frames_test2",
  );
const files = (await readdir(source))
  .filter((f) => /^frame_\d+\.webp$/.test(f))
  .sort();
if (files.length < 2)
  throw new Error("Sao necessarios pelo menos 2 frames.");
const selected = files;
const frameCount = selected.length;
const firstFrame = path.join(source, selected[0]);
const { width: sourceWidth, height: sourceHeight } = await sharp(firstFrame).metadata();
// The source sequence has cinematic black bars baked into every frame.
const barHeight = Math.round(sourceHeight * 0.121);
const contentHeight = sourceHeight - barHeight * 2;
for (const [variant, width, quality] of [
  ["desktop", 1280, 75],
  ["mobile", 768, 65],
]) {
  await mkdir(`public/sequence/${variant}`, { recursive: true });
  for (let i = 0; i < frameCount; i++) {
    const output = path.join(
      `public/sequence/${variant}`,
      `${String(i + 1).padStart(3, "0")}.webp`,
    );
    const temporary = output.replace(/\.webp$/, ".tmp.webp");
    await sharp(path.join(source, selected[i]))
      .extract({ left: 0, top: barHeight, width: sourceWidth, height: contentHeight })
      .resize({ width })
      .webp({ quality })
      .toFile(temporary);
    await rename(temporary, output);
  }
}
await writeFile(
  "public/sequence/manifest.json",
  JSON.stringify(
    { sourceCount: files.length, frameCount, selected },
    null,
    2,
  ),
);
console.log(`${frameCount} frames preparados para desktop e mobile.`);
