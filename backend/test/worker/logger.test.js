"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const { logInfo, logError, getRecentLogLines } = require("../../src/worker/logger");

describe("worker logger", () => {
  it("getRecentLogLines returns array", () => {
    const lines = getRecentLogLines();
    assert.ok(Array.isArray(lines));
  });

  it("logInfo and logError add to recent lines", () => {
    const before = getRecentLogLines().length;
    logInfo("test info message");
    logError("test error message");
    const after = getRecentLogLines();
    assert.ok(after.length >= before + 2);
    assert.ok(after.some((l) => l.includes("test info message")));
    assert.ok(after.some((l) => l.includes("test error message")));
  });

  it("log lines contain [worker] and level", () => {
    logInfo("info-level");
    const lines = getRecentLogLines();
    const last = lines[lines.length - 1];
    assert.ok(last.includes("[worker]"));
    assert.ok(last.includes("info"));
    assert.ok(last.includes("info-level"));
  });
});
