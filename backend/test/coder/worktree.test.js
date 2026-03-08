"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const {
  getWorktreeBranchName,
  findGitRoot,
  ensureIsGitRepo,
} = require("../../src/coder/worktree");

describe("worktree", () => {
  it("getWorktreeBranchName returns agent/task-{taskId}", () => {
    assert.strictEqual(getWorktreeBranchName(1), "agent/task-1");
    assert.strictEqual(getWorktreeBranchName("42"), "agent/task-42");
  });

  it("findGitRoot returns path containing .git when run from repo", () => {
    const root = findGitRoot();
    assert.ok(typeof root === "string");
    assert.ok(root.length > 0);
    const gitDir = path.join(root, ".git");
    const fs = require("fs");
    assert.ok(fs.existsSync(gitDir));
  });

  it("findGitRoot throws when no .git found from given path", () => {
    const os = require("os");
    const tmpDir = path.join(os.tmpdir(), `no-git-${Date.now()}`);
    require("fs").mkdirSync(tmpDir, { recursive: true });
    try {
      assert.throws(
        () => findGitRoot(tmpDir),
        /Not a git repository/
      );
    } finally {
      try { require("fs").rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  it("ensureIsGitRepo throws for non-git path", () => {
    const os = require("os");
    const tmpDir = path.join(os.tmpdir(), `no-git-ensure-${Date.now()}`);
    require("fs").mkdirSync(tmpDir, { recursive: true });
    try {
      assert.throws(
        () => ensureIsGitRepo(tmpDir),
        /Not a git repository/
      );
    } finally {
      try { require("fs").rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
  });
});
