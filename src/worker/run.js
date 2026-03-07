const fs = require("fs");
const { execSync } = require("node:child_process");
require("dotenv").config();
const path = require("path");
const tasks = require("../tasks");
const { createCoder } = require("../coder");
const { DEFAULT_TASKS_DIR } = require("../tasks/db");
const { cursorApiKey } = require("../config");
const { logInfo, logError, getRecentLogLines } = require("./logger");
const { writeStatus } = require("./workerStatus");

const POLL_MS = Number(process.env.WORKER_POLL_MS) || 5000;
const SERVER_URL =
  process.env.SERVER_URL ||
  `http://localhost:${Number(process.env.PORT) || 3000}`;

function broadcastTaskUpdated(taskId) {
  const updated = tasks.getTask(taskId);
  if (!updated) return;
  fetch(`${SERVER_URL}/api/internal/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "task:updated",
      data: { id: updated.id, task: updated },
    }),
  }).catch((err) => {
    logError("broadcast failed", err);
  });
}

function isAgentInPath() {
  try {
    execSync("which agent", { encoding: "utf8" });
    return true;
  } catch (_) {
    return false;
  }
}

function getWorkspaceForTask(taskId) {
  const dir = path.join(DEFAULT_TASKS_DIR, "workspaces", String(taskId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function processNextTask() {
  writeStatus({ lastPollAt: new Date().toISOString(), recentLogLines: getRecentLogLines() });

  let task = null;
  const startedAt = Date.now();
  try {
    if (!cursorApiKey) {
      logInfo("CURSOR_API_KEY not set; agent runs will fail");
      return;
    }

    task = tasks.getNextQueued();
    if (!task) return;

    logInfo(`Processing task ${task.id}: ${task.title}`);
    tasks.updateTask(task.id, { status: "in_progress" });
    tasks.appendEvent(task.id, { type: "worker_start", text: "Worker started task." });
    tasks.appendEvent(task.id, { type: "started", text: "Agent started." });

    if (!isAgentInPath()) {
      logError("Binary 'agent' not found in PATH");
      tasks.appendEvent(task.id, { type: "error", text: "Binary 'agent' not found in PATH" });
      tasks.updateTask(task.id, { status: "rejected", failure_reason: "Binary 'agent' not found in PATH" });
      broadcastTaskUpdated(task.id);
      writeStatus({
        lastPollAt: new Date().toISOString(),
        lastTaskId: task.id,
        lastTaskStatus: "rejected",
        lastTaskAt: new Date().toISOString(),
        lastError: "Binary 'agent' not found in PATH",
        recentLogLines: getRecentLogLines(),
      });
      tasks.appendEvent(task.id, { type: "worker_end", durationMs: Date.now() - startedAt });
      return;
    }

    const workspace = getWorkspaceForTask(task.id);
    const coder = createCoder({ workspace, outputFormat: "stream" });
    const prompt = task.body?.trim() || task.title || "Execute this task.";

    if (typeof coder.command === "function") {
      const rawCmd = coder.command(prompt);
      const safeCmd = rawCmd.replace(/--api-key "[^"]*"/, '--api-key "***"');
      logInfo(`Agent command (api-key redacted): ${safeCmd}`);
    }

    const callbacks = {
      onChunk(text) {
        tasks.appendEvent(task.id, { type: "chunk", text });
      },
      onDone(result) {
        tasks.appendEvent(task.id, { type: "done", result: result ?? null });
      },
    };

    const { response } = coder.code(prompt, callbacks);
    await response;
    const durationMs = Date.now() - startedAt;
    tasks.appendEvent(task.id, { type: "worker_end", durationMs });
    tasks.updateTask(task.id, { status: "done" });
    broadcastTaskUpdated(task.id);
    logInfo(`Task ${task.id} done (${durationMs}ms).`);
    writeStatus({
      lastPollAt: new Date().toISOString(),
      lastTaskId: task.id,
      lastTaskStatus: "done",
      lastTaskAt: new Date().toISOString(),
      recentLogLines: getRecentLogLines(),
    });
  } catch (err) {
    logError("processNextTask error", err);
    const durationMs = Date.now() - startedAt;
    if (task && task.id) {
      const stderrText = err.stderr ? String(err.stderr).trim().slice(0, 2000) : "";
      const stdoutText = err.stdout ? String(err.stdout).trim().slice(0, 2000) : "";
      const detail = stderrText || stdoutText;
      const displayMessage = detail
        ? `${err.message}${stderrText ? `\n\nStderr:\n${stderrText}` : ""}${stdoutText ? `\n\nStdout:\n${stdoutText}` : ""}`
        : err.message;
      const errorPayload = {
        type: "error",
        text: displayMessage,
        stack: err.stack,
      };
      if (stderrText) errorPayload.stderr = stderrText;
      if (stdoutText) errorPayload.stdout = stdoutText;
      tasks.appendEvent(task.id, errorPayload);
      tasks.appendEvent(task.id, { type: "worker_end", durationMs });
      tasks.updateTask(task.id, {
        status: "rejected",
        failure_reason: detail || err.message,
      });
      broadcastTaskUpdated(task.id);
    }
    writeStatus({
      lastPollAt: new Date().toISOString(),
      lastTaskId: task?.id ?? null,
      lastTaskStatus: "rejected",
      lastTaskAt: new Date().toISOString(),
      lastError: err.message,
      recentLogLines: getRecentLogLines(),
    });
  }
}

function run() {
  logInfo(`Listening for queued tasks (poll every ${POLL_MS} ms)`);
  setInterval(() => {
    processNextTask().catch((err) => {
      logError("setInterval processNextTask threw", err);
    });
  }, POLL_MS);
  processNextTask().catch((err) => {
    logError("initial processNextTask threw", err);
  });
}

run();
