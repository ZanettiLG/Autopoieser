"use strict";

/**
 * Discovers all *.test.js files under test/ and runs them with node --test.
 * Usage: node test/run-tests.js (run from backend root)
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const testDir = path.join(__dirname);
const testFiles = [];

function collect(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      collect(full);
    } else if (e.isFile() && e.name.endsWith(".test.js")) {
      testFiles.push(full);
    }
  }
}

collect(testDir);
testFiles.sort();

const { run } = require("node:test");
const { spec } = require("node:test/reporters");

run({ files: testFiles })
  .on("test:fail", () => {
    process.exitCode = 1;
  })
  .compose(spec)
  .pipe(process.stdout);
