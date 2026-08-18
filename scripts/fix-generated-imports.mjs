import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve("generated/prisma");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!entry.name.endsWith(".ts")) {
      continue;
    }

    const original = await readFile(fullPath, "utf8");
    const updated = original.replace(/(from\s+['"].*?)\.ts(['"])/g, "$1.js$2");

    if (updated !== original) {
      await writeFile(fullPath, updated);
    }
  }
}

await walk(rootDir);