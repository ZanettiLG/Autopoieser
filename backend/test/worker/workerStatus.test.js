"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const { writeStatus, createWorkerStatusReader } = require("../../src/worker/workerStatus");
const { createTempDir, removeTempDir } = require("../setup");

describe("workerStatus", () => {
  let tmpDir;
  let statusPath;
  const origCwd = process.cwd();

  before(() => {
    tmpDir = createTempDir("worker-status-test-");
    process.chdir(tmpDir);
    statusPath = path.join(tmpDir, "data", "worker-status.json");
  });

  after(() => {
    process.chdir(origCwd);
    removeTempDir(tmpDir);
  });

  it("createWorkerStatusReader returns alive false when file does not exist", () => {
    const reader = createWorkerStatusReader(path.join(tmpDir, "nonexistent.json"));
    const status = reader.read();
    assert.strictEqual(status.alive, false);
    assert.strictEqual(status.lastPollAt, null);
    assert.deepStrictEqual(status.recentLogLines, []);
  });

  it("createWorkerStatusReader reads written status file", () => {
    const customPath = path.join(tmpDir, "custom-status.json");
    fs.mkdirSync(path.dirname(customPath), { recursive: true });
    fs.writeFileSync(
      customPath,
      JSON.stringify({
        lastPollAt: new Date().toISOString(),
        lastTaskId: 1,
        lastTaskStatus: "done",
        recentLogLines: ["line1"],
      }),
      "utf8"
    );
    const reader = createWorkerStatusReader(customPath);
    const status = reader.read();
    assert.strictEqual(status.alive, true);
    assert.ok(status.lastPollAt);
    assert.strictEqual(status.lastTaskId, 1);
    assert.strictEqual(status.lastTaskStatus, "done");
    assert.deepStrictEqual(status.recentLogLines, ["line1"]);
  });

  it("createWorkerStatusReader returns recentLogLines as array", () => {
    const customPath = path.join(tmpDir, "status-array.json");
    fs.mkdirSync(path.dirname(customPath), { recursive: true });
    fs.writeFileSync(
      customPath,
      JSON.stringify({
        lastPollAt: new Date().toISOString(),
        recentLogLines: ["a", "b"],
      }),
      "utf8"
    );
    const reader = createWorkerStatusReader(customPath);
    const status = reader.read();
    assert.strictEqual(Array.isArray(status.recentLogLines), true);
    assert.strictEqual(status.recentLogLines.length, 2);
  });
});
