import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const basesDir = path.resolve(__dirname, "..", "public", "bases");
const outFile = path.resolve(__dirname, "..", "public", "bases.json");
const csvDir = path.resolve(__dirname, "..", "public", "csv");

if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}

const files = fs.existsSync(basesDir)
  ? fs
      .readdirSync(basesDir)
      .filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls"))
  : [];

console.log(`📄 Found ${files.length} Excel file(s)`);

files.forEach((file) => {
  const filePath = path.resolve(basesDir, file);
  const workbook = XLSX.readFile(filePath);
  const baseName = path.parse(file).name;

  const fileCsvDir = path.join(csvDir, baseName);
  fs.mkdirSync(fileCsvDir, { recursive: true });

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    const csvData = XLSX.utils.sheet_to_csv(worksheet, {
      FS: ";",
      RS: "\n",
      blankrows: false,
      strip: true,
      skipHidden: true,
    });

    const outPath = path.join(fileCsvDir, `${sheetName}.csv`);
    fs.writeFileSync(outPath, csvData, "utf8");
    console.log(`  ✔ Sheet "${sheetName}" → ${baseName}/${sheetName}.csv`);
  });

  console.log(`✅ Finished generating CSV for ${file}`);
});

const categories = fs
  .readdirSync(csvDir)
  .map((categoryName) => {
    const categoryPath = path.join(csvDir, categoryName);
    if (!fs.statSync(categoryPath).isDirectory()) return null;

    const subcategories = fs
      .readdirSync(categoryPath)
      .filter((f) => f.endsWith(".csv"))
      .map((f) => path.parse(f).name);

    return {
      category: categoryName,
      subcategories,
    };
  })
  .filter(Boolean);

fs.writeFileSync(outFile, JSON.stringify(categories, null, 2), "utf8");
console.log(`📁 Generated ${outFile} with ${categories.length} categories`);

console.log("🎉 All CSV files and bases.json generated successfully.");
