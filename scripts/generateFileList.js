import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const basesDir = path.resolve(__dirname, "..", "public", "bases");
const outFile = path.resolve(__dirname, "..", "public", "bases.json");

const files = fs.existsSync(basesDir)
  ? fs
      .readdirSync(basesDir)
      .filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls"))
  : [];

fs.writeFileSync(outFile, JSON.stringify(files, null, 2), "utf8");
console.log("✅ bases.json generated with", files.length, "files");
