"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  exitCodeForSpawnResult,
  listTestFiles,
} = require("./helpers/runnerTools");

const unitTestDirectory = path.join(__dirname, "unit");
const testFiles = listTestFiles(unitTestDirectory);
const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
  shell: false,
});

process.exit(exitCodeForSpawnResult(result));
