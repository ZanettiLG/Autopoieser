const {
  getDb,
  ensureTasksDir,
  insertTask,
  updateTaskMeta,
  getTaskMeta,
  listTasksMeta,
  getNextQueuedTask,
  deleteTaskMeta,
} = require("./db");
const { readTaskBody, writeTaskBody, deleteTaskFile } = require("./storage");

function createTask({ title, body = "", status = "open" }) {
  const db = getDb();
  ensureTasksDir();
  const id = insertTask(db, { title, status });
  writeTaskBody(id, body);
  const meta = getTaskMeta(db, id);
  return { ...meta, body: readTaskBody(id) };
}

function getTask(id) {
  const db = getDb();
  const meta = getTaskMeta(db, Number(id));
  if (!meta) return null;
  const body = readTaskBody(meta.id);
  return { ...meta, body };
}

function listTasks() {
  const db = getDb();
  return listTasksMeta(db);
}

function updateTask(id, { title, body, status }) {
  const db = getDb();
  const meta = getTaskMeta(db, Number(id));
  if (!meta) return null;
  if (title !== undefined || status !== undefined) {
    updateTaskMeta(db, id, { title, status });
  }
  if (body !== undefined) {
    writeTaskBody(meta.id, body);
  }
  return getTask(meta.id);
}

function deleteTask(id) {
  const db = getDb();
  const meta = getTaskMeta(db, Number(id));
  if (!meta) return false;
  deleteTaskMeta(db, meta.id);
  deleteTaskFile(meta.id);
  return true;
}

function enqueueTask(id) {
  return updateTask(id, { status: "queued" });
}

function getNextQueued() {
  const db = getDb();
  const meta = getNextQueuedTask(db);
  if (!meta) return null;
  const body = readTaskBody(meta.id);
  return { ...meta, body };
}

module.exports = {
  createTask,
  getTask,
  listTasks,
  updateTask,
  deleteTask,
  enqueueTask,
  getNextQueued,
};
