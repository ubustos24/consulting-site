// scripts/check-backups.js
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "src");
const bad = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.tsx$/i.test(entry.name) && /backup/i.test(entry.name)) {
      bad.push(p);
    }
  }
}
if (fs.existsSync(ROOT)) walk(ROOT);

if (bad.length) {
  console.log("\n⚠️  Backup .tsx files found inside src/:\n");
  for (const f of bad) console.log("  •", path.relative(process.cwd(), f));
  console.log("\nPlease move these out of src/ or add tsconfig exclude rules.\n");
  process.exit(1);
} else {
  console.log("✅ No backup .tsx files found in src/. You're good to build.");
}
