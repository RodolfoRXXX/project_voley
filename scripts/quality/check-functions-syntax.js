"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const functionsRoot = path.resolve(
  __dirname,
  "../../volley-ranking-system/functions"
);
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(absolute);
  }
}

collect(functionsRoot);
files.sort();

const failures = [];
for (const file of files) {
  try {
    new vm.Script(fs.readFileSync(file, "utf8"), { filename: file });
  } catch (error) {
    failures.push(`${path.relative(functionsRoot, file)}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`[functions-syntax] OK: ${files.length}/${files.length} archivos JavaScript.`);
