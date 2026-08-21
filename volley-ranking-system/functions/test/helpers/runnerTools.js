"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const EXCLUDED_FUNCTIONS_ENTRIES = new Set([
  ".secret.local",
  "node_modules",
  "test",
]);

function listTestFiles(directory) {
  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
    .map((entry) => path.resolve(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, "en"));

  if (files.length === 0) {
    throw new Error(`No test files found in ${directory}`);
  }

  return files;
}

function copyFunctionsSource(sourceDirectory, destinationDirectory) {
  if (fs.existsSync(destinationDirectory)) {
    throw new Error(`Isolated Functions destination already exists: ${destinationDirectory}`);
  }

  fs.mkdirSync(destinationDirectory);

  const entries = fs
    .readdirSync(sourceDirectory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const entry of entries) {
    if (
      EXCLUDED_FUNCTIONS_ENTRIES.has(entry.name)
      || entry.name.endsWith(".log")
    ) {
      continue;
    }

    fs.cpSync(
      path.join(sourceDirectory, entry.name),
      path.join(destinationDirectory, entry.name),
      {
        recursive: entry.isDirectory(),
        filter(currentSource) {
          return !currentSource.endsWith(".log");
        },
      }
    );
  }
}

function linkNodeModules(sourceDirectory, destinationDirectory) {
  if (!fs.statSync(sourceDirectory).isDirectory()) {
    throw new Error(`Functions node_modules source is not a directory: ${sourceDirectory}`);
  }
  if (fs.existsSync(destinationDirectory)) {
    throw new Error(`Isolated node_modules destination already exists: ${destinationDirectory}`);
  }

  fs.symlinkSync(
    path.resolve(sourceDirectory),
    destinationDirectory,
    process.platform === "win32" ? "junction" : "dir"
  );
}

function removeTemporaryDirectory(directory) {
  const retryableCodes = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);
  const waitBuffer = new Int32Array(new SharedArrayBuffer(4));

  for (let attempt = 0; attempt <= 120; attempt += 1) {
    try {
      fs.rmSync(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!retryableCodes.has(error.code) || attempt === 120) throw error;
      Atomics.wait(waitBuffer, 0, 0, 250);
    }
  }
}

function resolveFirebaseCliEntrypoint(environment = process.env) {
  const pathDirectories = String(environment.PATH || "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const directory of pathDirectories) {
    const npmGlobalCandidate = path.join(
      directory,
      "node_modules",
      "firebase-tools",
      "lib",
      "bin",
      "firebase.js"
    );
    if (fs.existsSync(npmGlobalCandidate)) {
      return fs.realpathSync(npmGlobalCandidate);
    }

    const posixGlobalCandidate = path.resolve(
      directory,
      "..",
      "lib",
      "node_modules",
      "firebase-tools",
      "lib",
      "bin",
      "firebase.js"
    );
    if (fs.existsSync(posixGlobalCandidate)) {
      return fs.realpathSync(posixGlobalCandidate);
    }

    const executableNames = process.platform === "win32"
      ? ["firebase.cmd", "firebase.exe", "firebase"]
      : ["firebase"];
    for (const executableName of executableNames) {
      const executable = path.join(directory, executableName);
      if (!fs.existsSync(executable)) continue;

      const resolvedExecutable = fs.realpathSync(executable);
      if (
        resolvedExecutable.endsWith(path.join("lib", "bin", "firebase.js"))
        && fs.existsSync(resolvedExecutable)
      ) {
        return resolvedExecutable;
      }
    }
  }

  throw new Error("Unable to resolve the effective Firebase CLI entrypoint from PATH");
}

function spawnFirebaseCli(args, options) {
  const entrypoint = resolveFirebaseCliEntrypoint(options.env);
  return spawnSync(process.execPath, [entrypoint, ...args], {
    ...options,
    shell: false,
  });
}

function exitCodeForSpawnResult(result) {
  if (result.error) throw result.error;
  if (result.signal) return 1;
  return result.status ?? 1;
}

module.exports = {
  copyFunctionsSource,
  exitCodeForSpawnResult,
  linkNodeModules,
  listTestFiles,
  removeTemporaryDirectory,
  resolveFirebaseCliEntrypoint,
  spawnFirebaseCli,
};
