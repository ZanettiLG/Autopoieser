"use strict";

/**
 * Test setup: creates a temporary directory for DB and task files.
 * Use createTempDir() in before() and cleanup in after().
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

function createTempDir(prefix = "agent-coder-test-") {
  const dir = path.join(os.tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureTasksDir(parentDir) {
  const tasksDir = path.join(parentDir, "tasks");
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
  return tasksDir;
}

function removeTempDir(dir) {
  try {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (_) {
    // ignore
  }
}

module.exports = {
  createTempDir,
  ensureTasksDir,
  removeTempDir,
};
