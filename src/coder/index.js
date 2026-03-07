const CursorCoder = require("./providers/cursor");

const coder = new CursorCoder({
    model: "auto",
    debug: false,
    outputFormat: "json",
    workspace: "../test"
});

module.exports = coder;