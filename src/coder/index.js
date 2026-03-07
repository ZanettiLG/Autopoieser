const path = require("path");
const CursorCoder = require("./providers/cursor");

const defaultWorkspace = path.join(process.cwd(), "..", "test");

const defaultCoder = new CursorCoder({
  model: "auto",
  debug: false,
  outputFormat: "json",
  workspace: defaultWorkspace,
});

function createCoder(options = {}) {
  return new CursorCoder({
    model: "auto",
    debug: false,
    outputFormat: "json",
    workspace: defaultWorkspace,
    ...options,
  });
}

module.exports = defaultCoder;
module.exports.createCoder = createCoder;