"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  copyFunctionsSource,
  exitCodeForSpawnResult,
  linkNodeModules,
  listTestFiles,
  removeTemporaryDirectory,
  resolveFirebaseCliEntrypoint,
} = require("../helpers/runnerTools");

function withTemporaryDirectory(prefix, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("enumera tests en orden determinista e ignora otras entradas", () => {
  withTemporaryDirectory("sportexa-runner-unit-", (directory) => {
    fs.writeFileSync(path.join(directory, "z.test.js"), "");
    fs.writeFileSync(path.join(directory, "a.test.js"), "");
    fs.writeFileSync(path.join(directory, "helper.js"), "");
    fs.mkdirSync(path.join(directory, "nested.test.js"));

    assert.deepEqual(
      listTestFiles(directory).map((file) => path.basename(file)),
      ["a.test.js", "z.test.js"]
    );
  });
});

test("falla si el directorio no contiene tests", () => {
  withTemporaryDirectory("sportexa-runner-empty-", (directory) => {
    assert.throws(() => listTestFiles(directory), /No test files found/);
  });
});

test("copia Functions sin materializar node_modules, test, secretos ni logs", () => {
  withTemporaryDirectory("sportexa-runner-copy-", (directory) => {
    const source = path.join(directory, "source");
    const destination = path.join(directory, "destination");
    fs.mkdirSync(source);
    fs.mkdirSync(path.join(source, "node_modules"));
    fs.mkdirSync(path.join(source, "test"));
    fs.mkdirSync(path.join(source, "src"));
    fs.writeFileSync(path.join(source, "node_modules", "dependency.js"), "");
    fs.writeFileSync(path.join(source, "test", "fixture.js"), "");
    fs.writeFileSync(path.join(source, ".secret.local"), "synthetic=false");
    fs.writeFileSync(path.join(source, "debug.log"), "ignored");
    fs.writeFileSync(path.join(source, "src", "index.js"), "module.exports = true;");
    fs.writeFileSync(path.join(source, "package.json"), "{}");

    copyFunctionsSource(source, destination);

    assert.equal(fs.existsSync(path.join(destination, "node_modules")), false);
    assert.equal(fs.existsSync(path.join(destination, "test")), false);
    assert.equal(fs.existsSync(path.join(destination, ".secret.local")), false);
    assert.equal(fs.existsSync(path.join(destination, "debug.log")), false);
    assert.equal(fs.existsSync(path.join(destination, "src", "index.js")), true);
    assert.equal(fs.existsSync(path.join(destination, "package.json")), true);
  });
});

test("enlaza node_modules y rechaza un destino preexistente", () => {
  withTemporaryDirectory("sportexa-runner-link-", (directory) => {
    const source = path.join(directory, "source-node-modules");
    const destination = path.join(directory, "linked-node-modules");
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, "marker.txt"), "ok");

    linkNodeModules(source, destination);
    assert.equal(fs.readFileSync(path.join(destination, "marker.txt"), "utf8"), "ok");
    assert.throws(
      () => linkNodeModules(source, destination),
      /destination already exists/
    );
  });
});

test("elimina un directorio temporal con contenido", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "sportexa-runner-cleanup-")
  );
  fs.writeFileSync(path.join(directory, "marker.txt"), "ok");

  removeTemporaryDirectory(directory);

  assert.equal(fs.existsSync(directory), false);
});

test("resuelve el entrypoint npm de Firebase CLI desde PATH", () => {
  withTemporaryDirectory("sportexa-runner-cli-", (directory) => {
    const entrypoint = path.join(
      directory,
      "node_modules",
      "firebase-tools",
      "lib",
      "bin",
      "firebase.js"
    );
    fs.mkdirSync(path.dirname(entrypoint), { recursive: true });
    fs.writeFileSync(entrypoint, "");

    assert.equal(
      resolveFirebaseCliEntrypoint({ PATH: directory }),
      fs.realpathSync(entrypoint)
    );
  });
});

test("falla si Firebase CLI no puede resolverse", () => {
  withTemporaryDirectory("sportexa-runner-no-cli-", (directory) => {
    assert.throws(
      () => resolveFirebaseCliEntrypoint({ PATH: directory }),
      /Unable to resolve/
    );
  });
});

test("propaga exit code y errores del proceso hijo", () => {
  assert.equal(exitCodeForSpawnResult({ status: 0 }), 0);
  assert.equal(exitCodeForSpawnResult({ status: 7 }), 7);
  assert.equal(exitCodeForSpawnResult({ status: null, signal: "SIGTERM" }), 1);
  assert.throws(
    () => exitCodeForSpawnResult({ error: new Error("spawn failed") }),
    /spawn failed/
  );
});
