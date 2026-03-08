/**
 * TaskProcessor: runs one cycle of the queue (get next queued task → worktree → coder → merge/remove → notify).
 * All dependencies are injected for testability (DIP).
 *
 * @param {object} deps
 * @param {object} deps.taskService - createTask, getTask, listTasks, updateTask, deleteTask, enqueueTask, getNextQueued, appendEvent, getTaskLog, getTaskComments, addComment
 * @param {(options: object) => object} deps.createCoder
 * @param {{ createWorktree: function, mergeWorktree: function, removeWorktree: function }} deps.worktree
 * @param {{ notifyTaskUpdated: (taskId: number | string) => void }} deps.notifier
 * @param {{ logInfo: (msg: string) => void, logError: (msg: string, err?: Error) => void, getRecentLogLines: () => string[] }} deps.logger
 * @param {(update: object) => void} deps.writeStatus
 * @param {string | undefined} deps.cursorApiKey
 * @param {() => boolean} deps.isAgentInPath
 * @param {(taskId: number | string) => string} deps.getWorkspacePath
 * @param {string} deps.repoRoot
 */
function createTaskProcessor(deps) {
  const {
    taskService,
    createCoder,
    worktree,
    notifier,
    logger,
    writeStatus,
    cursorApiKey,
    isAgentInPath,
    getWorkspacePath,
    repoRoot,
  } = deps;

  async function processNextTask() {
    writeStatus({ lastPollAt: new Date().toISOString(), recentLogLines: logger.getRecentLogLines() });

    let task = null;
    const startedAt = Date.now();
    try {
      if (!cursorApiKey) {
        logger.logInfo("CURSOR_API_KEY not set; agent runs will fail");
        return;
      }

      task = taskService.getNextQueued();
      if (!task) return;

      logger.logInfo(`Processing task ${task.id}: ${task.title}`);
      taskService.updateTask(task.id, { status: "in_progress" });
      taskService.appendEvent(task.id, { type: "worker_start", text: "Worker started task." });
      taskService.appendEvent(task.id, { type: "started", text: "Agent started." });
      notifier.notifyTaskUpdated(task.id);

      if (!isAgentInPath()) {
        logger.logError("Binary 'agent' not found in PATH");
        const msg = "Binary 'agent' not found in PATH";
        taskService.appendEvent(task.id, { type: "error", text: msg });
        taskService.updateTask(task.id, { status: "rejected", failure_reason: msg });
        taskService.addComment(task.id, { author: "agent", content: msg });
        notifier.notifyTaskUpdated(task.id);
        writeStatus({
          lastPollAt: new Date().toISOString(),
          lastTaskId: task.id,
          lastTaskStatus: "rejected",
          lastTaskAt: new Date().toISOString(),
          lastError: "Binary 'agent' not found in PATH",
          recentLogLines: logger.getRecentLogLines(),
        });
        taskService.appendEvent(task.id, { type: "worker_end", durationMs: Date.now() - startedAt });
        return;
      }

      const workspacePath = getWorkspacePath(task.id);
      try {
        worktree.createWorktree(repoRoot, workspacePath, task.id);
      } catch (worktreeErr) {
        const msg = worktreeErr.message || "Failed to create git worktree";
        logger.logError("createWorktree failed", worktreeErr);
        taskService.appendEvent(task.id, { type: "error", text: msg });
        taskService.updateTask(task.id, { status: "rejected", failure_reason: msg });
        taskService.addComment(task.id, { author: "agent", content: msg });
        notifier.notifyTaskUpdated(task.id);
        writeStatus({
          lastPollAt: new Date().toISOString(),
          lastTaskId: task.id,
          lastTaskStatus: "rejected",
          lastTaskAt: new Date().toISOString(),
          lastError: msg,
          recentLogLines: logger.getRecentLogLines(),
        });
        taskService.appendEvent(task.id, { type: "worker_end", durationMs: Date.now() - startedAt });
        return;
      }

      const coder = createCoder({ workspace: workspacePath, outputFormat: "stream" });
      const prompt = task.body?.trim() || task.title || "Execute this task.";

      if (typeof coder.command === "function") {
        const rawCmd = coder.command(prompt);
        const safeCmd = rawCmd.replace(/--api-key "[^"]*"/, '--api-key "***"');
        logger.logInfo(`Agent command (api-key redacted): ${safeCmd}`);
      }

      const callbacks = {
        onChunk(text) {
          taskService.appendEvent(task.id, { type: "chunk", text });
        },
        onDone(result) {
          taskService.appendEvent(task.id, { type: "done", result: result ?? null });
        },
      };

      const { response } = coder.code(prompt, callbacks);
      await response;
      const durationMs = Date.now() - startedAt;
      try {
        worktree.mergeWorktree(repoRoot, workspacePath, task.id);
      } catch (mergeErr) {
        logger.logError("mergeWorktree failed", mergeErr);
        taskService.appendEvent(task.id, { type: "error", text: mergeErr.message });
        worktree.removeWorktree(repoRoot, workspacePath, task.id);
        taskService.updateTask(task.id, {
          status: "rejected",
          failure_reason: `Merge falhou: ${mergeErr.message}`,
        });
        taskService.addComment(task.id, { author: "agent", content: mergeErr.message });
        notifier.notifyTaskUpdated(task.id);
        writeStatus({
          lastPollAt: new Date().toISOString(),
          lastTaskId: task.id,
          lastTaskStatus: "rejected",
          lastTaskAt: new Date().toISOString(),
          lastError: mergeErr.message,
          recentLogLines: logger.getRecentLogLines(),
        });
        taskService.appendEvent(task.id, { type: "worker_end", durationMs });
        return;
      }
      taskService.appendEvent(task.id, { type: "worker_end", durationMs });
      taskService.updateTask(task.id, { status: "done" });
      taskService.addComment(task.id, { author: "agent", content: "Tarefa concluída com sucesso." });
      notifier.notifyTaskUpdated(task.id);
      logger.logInfo(`Task ${task.id} done (${durationMs}ms).`);
      writeStatus({
        lastPollAt: new Date().toISOString(),
        lastTaskId: task.id,
        lastTaskStatus: "done",
        lastTaskAt: new Date().toISOString(),
        recentLogLines: logger.getRecentLogLines(),
      });
    } catch (err) {
      logger.logError("processNextTask error", err);
      const durationMs = Date.now() - startedAt;
      if (task && task.id) {
        const workspacePath = getWorkspacePath(task.id);
        try {
          worktree.removeWorktree(repoRoot, workspacePath, task.id);
        } catch (_) {}
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
        taskService.appendEvent(task.id, errorPayload);
        taskService.appendEvent(task.id, { type: "worker_end", durationMs });
        taskService.updateTask(task.id, {
          status: "rejected",
          failure_reason: detail || err.message,
        });
        taskService.addComment(task.id, { author: "agent", content: detail || err.message });
        notifier.notifyTaskUpdated(task.id);
      }
      writeStatus({
        lastPollAt: new Date().toISOString(),
        lastTaskId: task?.id ?? null,
        lastTaskStatus: "rejected",
        lastTaskAt: new Date().toISOString(),
        lastError: err.message,
        recentLogLines: logger.getRecentLogLines(),
      });
    }
  }

  return { processNextTask };
}

module.exports = { createTaskProcessor };
