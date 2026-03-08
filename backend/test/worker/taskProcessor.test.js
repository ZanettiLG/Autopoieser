"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const { createTaskProcessor } = require("../../src/worker/taskProcessor");

describe("taskProcessor", () => {
  it("processNextTask does nothing when getNextQueued returns null", async () => {
    const updates = [];
    const taskService = {
      getNextQueued: () => null,
      updateTask: () => {},
      appendEvent: () => {},
      addComment: () => {},
      getTask: () => ({}),
    };
    const writeStatus = (u) => updates.push(u);
    const processor = createTaskProcessor({
      taskService,
      createCoder: () => ({}),
      worktree: { createWorktree: () => {}, mergeWorktree: () => {}, removeWorktree: () => {} },
      notifier: { notifyTaskUpdated: () => {} },
      logger: { logInfo: () => {}, logError: () => {}, getRecentLogLines: () => [] },
      writeStatus,
      cursorApiKey: "key",
      isAgentInPath: () => true,
      getWorkspacePath: () => "/tmp/ws",
      repoRoot: "/tmp",
    });
    await processor.processNextTask();
    assert.ok(updates.length >= 1);
    assert.ok(updates.some((u) => u.lastPollAt));
  });

  it("processNextTask rejects task when isAgentInPath returns false", async () => {
    let taskStatus;
    let commentContent;
    const task = { id: 1, title: "T", body: "", status: "queued" };
    const taskService = {
      getNextQueued: () => task,
      updateTask: (id, fields) => {
        if (fields.status) taskStatus = fields.status;
      },
      appendEvent: () => {},
      addComment: (id, c) => {
        commentContent = c.content;
      },
      getTask: (id) => (id === 1 ? task : null),
    };
    const processor = createTaskProcessor({
      taskService,
      createCoder: () => ({}),
      worktree: { createWorktree: () => {}, mergeWorktree: () => {}, removeWorktree: () => {} },
      notifier: { notifyTaskUpdated: () => {} },
      logger: { logInfo: () => {}, logError: () => {}, getRecentLogLines: () => [] },
      writeStatus: () => {},
      cursorApiKey: "key",
      isAgentInPath: () => false,
      getWorkspacePath: () => "/tmp/ws",
      repoRoot: "/tmp",
    });
    await processor.processNextTask();
    assert.strictEqual(taskStatus, "rejected");
    assert.ok(commentContent && commentContent.includes("agent"));
  });

  it("processNextTask returns early when cursorApiKey is missing", async () => {
    let logged;
    const logger = {
      logInfo: (msg) => { logged = msg; },
      logError: () => {},
      getRecentLogLines: () => [],
    };
    const processor = createTaskProcessor({
      taskService: { getNextQueued: () => ({ id: 1, title: "T", body: "" }) },
      createCoder: () => ({}),
      worktree: { createWorktree: () => {}, mergeWorktree: () => {}, removeWorktree: () => {} },
      notifier: { notifyTaskUpdated: () => {} },
      logger,
      writeStatus: () => {},
      cursorApiKey: undefined,
      isAgentInPath: () => true,
      getWorkspacePath: () => "/tmp",
      repoRoot: "/tmp",
    });
    await processor.processNextTask();
    assert.ok(logged && logged.includes("CURSOR_API_KEY"));
  });
});
