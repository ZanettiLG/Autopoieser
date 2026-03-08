"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert");
const { createNotifier } = require("../../src/worker/notifier");

const originalFetch = globalThis.fetch;

describe("notifier", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("notifyTaskUpdated calls fetch with correct URL and body when getTask returns task", async () => {
    const serverUrl = "http://localhost:3000";
    const task = { id: 42, title: "Task", status: "open" };
    const getTask = (id) => (Number(id) === 42 ? task : null);
    let capturedUrl;
    let capturedBody;
    globalThis.fetch = (url, options) => {
      capturedUrl = url;
      capturedBody = options?.body ? JSON.parse(options.body) : null;
      return Promise.resolve({ ok: true });
    };
    const notifier = createNotifier(serverUrl, getTask);
    notifier.notifyTaskUpdated(42);
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(capturedUrl, "http://localhost:3000/api/internal/broadcast");
    assert.strictEqual(capturedBody.event, "task:updated");
    assert.strictEqual(capturedBody.data.id, 42);
    assert.strictEqual(capturedBody.data.task.id, 42);
  });

  it("notifyTaskUpdated does not call fetch when getTask returns null", async () => {
    let called = false;
    globalThis.fetch = () => {
      called = true;
      return Promise.resolve();
    };
    const notifier = createNotifier("http://localhost:3000", () => null);
    notifier.notifyTaskUpdated(999);
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(called, false);
  });
});
