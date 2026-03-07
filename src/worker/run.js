require("dotenv").config();
const path = require("path");
const fs = require("fs");
const tasks = require("../tasks");
const { createCoder } = require("../coder");
const { DEFAULT_TASKS_DIR } = require("../tasks/db");

const POLL_MS = Number(process.env.WORKER_POLL_MS) || 5000;

function getWorkspaceForTask(taskId) {
  const dir = path.join(DEFAULT_TASKS_DIR, "workspaces", String(taskId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function processNextTask() {
  const task = tasks.getNextQueued();
  if (!task) return;

  console.log(`[worker] Processing task ${task.id}: ${task.title}`);
  tasks.updateTask(task.id, { status: "in_progress" });

  const workspace = getWorkspaceForTask(task.id);
  const coder = createCoder({ workspace });
  const prompt = task.body?.trim() || task.title || "Execute this task.";

  try {
    const { response } = coder.code(prompt);
    await response;
    tasks.updateTask(task.id, { status: "done" });
    console.log(`[worker] Task ${task.id} done.`);
  } catch (err) {
    console.error(`[worker] Task ${task.id} failed:`, err.message);
    tasks.updateTask(task.id, { status: "open" });
  }
}

function run() {
  console.log("[worker] Listening for queued tasks (poll every %d ms)", POLL_MS);
  setInterval(processNextTask, POLL_MS);
  processNextTask();
}

run();
