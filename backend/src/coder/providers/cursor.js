const BaseCoder = require("./base");
const { cursorApiKey } = require("../../config");

/** Escape string for safe use inside double quotes in bash -c "..." */
function escapeForBashDoubleQuotes(s) {
  if (s == null || typeof s !== "string") return "";
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

class CursorCoder extends BaseCoder {
  constructor(options) {
    super(options);
  }

  command(prompt) {
    const debugFlag = this.options.debug ? " -p" : " ";
    const modelFlag = this.options.model ? ` --model "${escapeForBashDoubleQuotes(this.options.model)}"` : "";
    // CLI aceita: text, json, stream-json (não "stream")
    const cliOutputFormat =
      this.options.outputFormat === "stream" ? "stream-json" : (this.options.outputFormat || "json");
    const outputFormatFlag = ` --output-format "${escapeForBashDoubleQuotes(cliOutputFormat)}"`;
    const workspaceFlag = this.options.workspace ? ` --workspace "${escapeForBashDoubleQuotes(this.options.workspace)}"` : "";
    const safePrompt = escapeForBashDoubleQuotes(prompt);
    const safeApiKey = escapeForBashDoubleQuotes(cursorApiKey);
    return `agent --trust${debugFlag}${modelFlag} "${safePrompt}" --api-key "${safeApiKey}"${outputFormatFlag}${workspaceFlag}`;
  }

  code(prompt, callbacks = {}) {
    return super.code(prompt, callbacks);
  }
}

module.exports = CursorCoder;