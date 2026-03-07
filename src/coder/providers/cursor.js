const BaseCoder = require("./base");
const { cursorApiKey } = require("../../config");

class CursorCoder extends BaseCoder {
    constructor(options = defaultOptions) {
        super(options);
    }

    command(prompt) {
        const debugFlag = this.options.debug ? " -p" : " ";
        const modelFlag = this.options.model ? ` --model "${this.options.model}"` : "";
        const outputFormatFlag = this.options.outputFormat ? ` --output-format "${this.options.outputFormat}"` : "";
        const workspaceFlag = this.options.workspace ? ` --workspace "${this.options.workspace}"` : "";
        return `agent --trust${debugFlag}${modelFlag} "${prompt}" --api-key "${cursorApiKey}"${outputFormatFlag}${workspaceFlag}`;
    }

    code(prompt) {
        return super.code(prompt);
    }
}

module.exports = CursorCoder;