import { writeFile } from "node:fs/promises";
import sharp from "sharp";
const photos = {
  hatch: "photo-1549317661-bd32c8ce0db2",
  golf: "photo-1533473359331-0135ef1b58bf",
  bmw: "photo-1555215695-3004980ad54e",
  suv: "photo-1519641471654-76ce0107ad1b",
  polo: "photo-1494976388531-d1058494cdd8",
};
for (const [name, id] of Object.entries(photos)) {
  const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(1000, 650, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(`public/cars/${name}.webp`);
}
await writeFile(
  "public/cars/sources.json",
  JSON.stringify(
    {
      notice:
        "Fotos ilustrativas de demonstração; não identificam os modelos anunciados.",
      sources: photos,
    },
    null,
    2,
  ),
);
