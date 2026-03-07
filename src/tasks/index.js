const {
  getDb,
  ensureTasksDir,
  insertTask,
  updateTaskMeta,
  getTaskMeta,
  listTasksMeta,
  getNextQueuedTask,
  deleteTaskMeta,
  insertComment,
  listCommentsByTaskId,
  deleteCommentsByTaskId,
} = require("./db");
const { readTaskBody, writeTaskBody, deleteTaskFile } = require("./storage");
const { appendEvent, getTaskLog } = require("./taskLog");

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

function updateTask(id, { title, body, status, failure_reason }) {
  const db = getDb();
  const meta = getTaskMeta(db, Number(id));
  if (!meta) return null;
  if (title !== undefined || status !== undefined || failure_reason !== undefined) {
    updateTaskMeta(db, id, { title, status, failure_reason });
  }
  if (body !== undefined) {
    writeTaskBody(meta.id, body);
  }
  return getTask(meta.id);
}

function getTaskComments(taskId) {
  const db = getDb();
  return listCommentsByTaskId(db, Number(taskId));
}

function addComment(taskId, { content, author = "user" }) {
  const db = getDb();
  const meta = getTaskMeta(db, Number(taskId));
  if (!meta) return null;
  const id = insertComment(db, {
    task_id: meta.id,
    author: author === "agent" ? "agent" : "user",
    content: typeof content === "string" ? content : String(content),
  });
  const rows = listCommentsByTaskId(db, meta.id);
  return rows.find((r) => r.id === id) || rows[rows.length - 1];
}

function deleteTask(id) {
  const db = getDb();
  const meta = getTaskMeta(db, Number(id));
  if (!meta) return false;
  deleteCommentsByTaskId(db, meta.id);
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
  appendEvent,
  getTaskLog,
  getTaskComments,
  addComment,
};
