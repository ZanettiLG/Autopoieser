const { execSync } = require("node:child_process");
const path = require("path");
require("dotenv").config();

const tasks = require("../tasks");
const { createCoder } = require("../coder");
const { createWorktree, mergeWorktree, removeWorktree, findGitRoot } = require("../coder/worktree");
const { DEFAULT_TASKS_DIR } = require("../tasks/db");
const { cursorApiKey } = require("../config");
const { logInfo, logError, getRecentLogLines } = require("./logger");
const { writeStatus } = require("./workerStatus");
const { createNotifier } = require("./notifier");
const { createTaskProcessor } = require("./taskProcessor");

const POLL_MS = Number(process.env.WORKER_POLL_MS) || 5000;
const SERVER_URL =
  process.env.SERVER_URL ||
  `http://localhost:${Number(process.env.PORT) || 3000}`;

function isAgentInPath() {
  try {
    execSync("which agent", { encoding: "utf8" });
    return true;
  } catch (_) {
    return false;
  }
}

function getWorkspacePathForTask(taskId) {
  return path.join(DEFAULT_TASKS_DIR, "workspaces", String(taskId));
}

const notifier = createNotifier(SERVER_URL, (id) => tasks.getTask(id), logError);
const taskProcessor = createTaskProcessor({
  taskService: tasks,
  createCoder,
  worktree: { createWorktree, mergeWorktree, removeWorktree },
  notifier,
  logger: { logInfo, logError, getRecentLogLines },
  writeStatus,
  cursorApiKey,
  isAgentInPath,
  getWorkspacePath: getWorkspacePathForTask,
  repoRoot: findGitRoot(process.cwd()),
});

function run() {
  logInfo(`Listening for queued tasks (poll every ${POLL_MS} ms)`);
  setInterval(() => {
    taskProcessor.processNextTask().catch((err) => {
      logError("setInterval processNextTask threw", err);
    });
  }, POLL_MS);
  taskProcessor.processNextTask().catch((err) => {
    logError("initial processNextTask threw", err);
  });
}

run();
