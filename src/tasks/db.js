const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "tasks.db");
const DEFAULT_TASKS_DIR = path.join(process.cwd(), "tasks");

function getDb(dbPath = DEFAULT_DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const hasFailureReason = db.prepare(
    "SELECT 1 FROM pragma_table_info('tasks') WHERE name = 'failure_reason'"
  ).get();
  if (!hasFailureReason) {
    db.exec("ALTER TABLE tasks ADD COLUMN failure_reason TEXT");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      author TEXT NOT NULL DEFAULT 'user',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);
  return db;
}

function ensureTasksDir(tasksDir = DEFAULT_TASKS_DIR) {
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
}

function insertTask(db, { title, status = "open" }) {
  const stmt = db.prepare(
    "INSERT INTO tasks (title, status) VALUES (?, ?)"
  );
  const result = stmt.run(title, status);
  return result.lastInsertRowid;
}

function updateTaskMeta(db, id, { title, status, failure_reason }) {
  const updates = [];
  const values = [];
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }
  if (failure_reason !== undefined) {
    updates.push("failure_reason = ?");
    values.push(failure_reason);
  }
  if (updates.length === 0) return;
  updates.push("updated_at = datetime('now')");
  values.push(id);
  const sql = `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`;
  db.prepare(sql).run(...values);
}

function getTaskMeta(db, id) {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  return row || null;
}

function listTasksMeta(db) {
  return db.prepare("SELECT * FROM tasks ORDER BY updated_at DESC").all();
}

function listTasksByStatus(db, status) {
  return db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY id ASC").all(status);
}

function getNextQueuedTask(db) {
  const row = db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY id ASC LIMIT 1").get("queued");
  return row || null;
}

function deleteTaskMeta(db, id) {
  return db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

function insertComment(db, { task_id, author = "user", content }) {
  const stmt = db.prepare(
    "INSERT INTO task_comments (task_id, author, content) VALUES (?, ?, ?)"
  );
  const result = stmt.run(task_id, author, content);
  return result.lastInsertRowid;
}

function listCommentsByTaskId(db, taskId) {
  return db
    .prepare(
      "SELECT id, task_id, author, content, created_at FROM task_comments WHERE task_id = ? ORDER BY created_at ASC"
    )
    .all(taskId);
}

function deleteCommentsByTaskId(db, taskId) {
  return db.prepare("DELETE FROM task_comments WHERE task_id = ?").run(taskId);
}

module.exports = {
  getDb,
  ensureTasksDir,
  DEFAULT_DB_PATH,
  DEFAULT_TASKS_DIR,
  insertTask,
  updateTaskMeta,
  getTaskMeta,
  listTasksMeta,
  listTasksByStatus,
  getNextQueuedTask,
  deleteTaskMeta,
  insertComment,
  listCommentsByTaskId,
  deleteCommentsByTaskId,
};
