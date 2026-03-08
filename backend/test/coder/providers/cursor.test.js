"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert");
const BaseCoder = require("../../../src/coder/providers/base");
const CursorCoder = require("../../../src/coder/providers/cursor");

const originalCode = BaseCoder.prototype.code;

describe("CursorCoder", () => {
  let codeCalls;

  afterEach(() => {
    BaseCoder.prototype.code = originalCode;
  });

  it("repassa prompt e callbacks para BaseCoder.code", () => {
    codeCalls = [];
    BaseCoder.prototype.code = function (prompt, callbacks = {}) {
      codeCalls.push({ prompt, callbacks });
      return { response: Promise.resolve(), abort: () => {} };
    };

    const coder = new CursorCoder({
      workspace: "/tmp",
      outputFormat: "stream",
    });
    const onChunk = () => {};
    const onDone = () => {};
    coder.code("do something", { onChunk, onDone });

    assert.strictEqual(codeCalls.length, 1);
    assert.strictEqual(codeCalls[0].prompt, "do something");
    assert.strictEqual(codeCalls[0].callbacks.onChunk, onChunk);
    assert.strictEqual(codeCalls[0].callbacks.onDone, onDone);
  });

  it("repassa callbacks vazio quando segundo argumento omitido", () => {
    codeCalls = [];
    BaseCoder.prototype.code = function (prompt, callbacks = {}) {
      codeCalls.push({ prompt, callbacks });
      return { response: Promise.resolve(), abort: () => {} };
    };

    const coder = new CursorCoder({ workspace: "/tmp" });
    coder.code("only prompt");

    assert.strictEqual(codeCalls.length, 1);
    assert.strictEqual(codeCalls[0].prompt, "only prompt");
    assert.deepStrictEqual(codeCalls[0].callbacks, {});
  });
});
