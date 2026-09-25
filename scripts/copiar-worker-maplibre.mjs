import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pacote = require.resolve("maplibre-gl/package.json");
const origem = path.join(path.dirname(pacote), "dist");
const destino = path.join(process.cwd(), "public", "maplibre");

await mkdir(destino, { recursive: true });
for (const arquivo of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(path.join(origem, arquivo), path.join(destino, arquivo));
}
