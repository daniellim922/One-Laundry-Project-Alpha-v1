// /**
//  * CLI: Read AttendRecord.xls, parse via shared module, write AttendRecord.json
//  * Run: npx tsx scripts/extract-attendrecord-json.ts
//  */
// import fs from "node:fs";
// import path from "node:path";
// import { createRequire } from "node:module";
// import { parseAttendRecord } from "../lib/parse-attendrecord";

// const require = createRequire(import.meta.url);
// // eslint-disable-next-line @typescript-eslint/no-require-imports
// const XLSX = require("xlsx");

// const inputPath = path.resolve("AttendRecord.xls");
// const outputPath = path.resolve("AttendRecord.json");

// if (!fs.existsSync(inputPath)) {
//     console.error(`Input file not found: ${inputPath}`);
//     process.exit(1);
// }

// const wb = XLSX.readFile(inputPath, { cellDates: true });
// const sheetName = wb.SheetNames[0];
// if (!sheetName) {
//     console.error("Workbook has no sheets.");
//     process.exit(1);
// }

// const ws = wb.Sheets[sheetName];
// const rows = XLSX.utils.sheet_to_json(ws, {
//     header: 1,
//     defval: null,
//     raw: false,
// }) as (string | number | null)[][];

// const output = parseAttendRecord(rows);

// fs.writeFileSync(outputPath, JSON.stringify(output, null, 4), "utf8");

// console.log(`Wrote ${outputPath} (workers: ${output.workers.length})`);
