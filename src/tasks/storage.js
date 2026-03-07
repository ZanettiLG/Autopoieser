const fs = require("fs");
const path = require("path");
const { DEFAULT_TASKS_DIR } = require("./db");

function getTaskFilePath(id, tasksDir = DEFAULT_TASKS_DIR) {
  return path.join(tasksDir, `${id}.md`);
}

function readTaskBody(id, tasksDir = DEFAULT_TASKS_DIR) {
  const filePath = getTaskFilePath(id, tasksDir);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

function writeTaskBody(id, body, tasksDir = DEFAULT_TASKS_DIR) {
  const filePath = getTaskFilePath(id, tasksDir);
  fs.writeFileSync(filePath, body ?? "", "utf-8");
}

function deleteTaskFile(id, tasksDir = DEFAULT_TASKS_DIR) {
  const filePath = getTaskFilePath(id, tasksDir);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  getTaskFilePath,
  readTaskBody,
  writeTaskBody,
  deleteTaskFile,
};
