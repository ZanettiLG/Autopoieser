"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const createCoder = require("../../src/coder/index").createCoder;

describe("coder index", () => {
  it("createCoder returns object with code function", () => {
    const coder = createCoder({ workspace: "/tmp", outputFormat: "stream" });
    assert.ok(coder);
    assert.strictEqual(typeof coder.code, "function");
  });

  it("createCoder merges options with defaults", () => {
    const coder = createCoder({ workspace: "/custom/ws" });
    assert.ok(coder);
    assert.ok(coder.code);
  });
});
