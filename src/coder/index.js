const { exec } = require("node:child_process");
const { cursorApiKey } = require("../config");

const defaultOptions = {model: "auto", debug: false};

const coder = async (prompt, {model="auto", debug=false} = defaultOptions) => {
    const debugFlag = debug ? " -p" : " ";
    const modelFlag = model ? ` --model "${model}"` : "";
    const command = `agent --trust${debugFlag} "${prompt}"${modelFlag} --api-key "${cursorApiKey}"`;
    const response = await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve({stdout, stderr});
        });
    });
    return response;
}

module.exports = coder;