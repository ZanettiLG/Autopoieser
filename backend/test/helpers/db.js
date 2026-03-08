"use strict";

/**
 * Helper to create a test DB and tasks dir. Use with temp dir from setup.js.
 * Returns { db, dbPath, tasksDir }.
 */

const path = require("path");
const { getDb, ensureTasksDir } = require("../../src/tasks/db");

function createTestDb(tempDir) {
  const dataDir = path.join(tempDir, "data");
  const tasksDir = path.join(tempDir, "tasks");
  const dbPath = path.join(dataDir, "tasks.db");
  require("fs").mkdirSync(dataDir, { recursive: true });
  require("fs").mkdirSync(tasksDir, { recursive: true });
  const db = getDb(dbPath);
  ensureTasksDir(tasksDir);
  return { db, dbPath, tasksDir };
}

module.exports = { createTestDb };
