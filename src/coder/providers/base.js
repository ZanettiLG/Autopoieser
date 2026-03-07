const { exec, spawn } = require("node:child_process");

const defaultOptions = {model: "auto", debug: false, outputFormat: "json"};

class BaseCoder {
    constructor(options = defaultOptions) {
        this.options = options;
    }

    command(prompt) {
        throw new Error("Not implemented");
    }

    code(prompt) {
        const abortController = new AbortController();

        const abort = () => {
            abortController.abort("Aborted");
        };

        const command = this.command(prompt);
        const response = new Promise((resolve, reject) => {
            const child = spawn("bash", ["-c", command], { signal: abortController.signal, stdio: "pipe" });
            
            child.stdout.on("data", (data) => {
                console.log(data.toString());
                resolve(JSON.parse(data.toString()));
            });
            child.stderr.on("data", (data) => {
                console.error(data.toString());
                reject(new Error(data.toString()));
            });
            child.on("error", (error) => {
                console.error(error.toString());
                reject(new Error(error.toString()));
            });
            child.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });
        });
        return {
            response,
            abort,
        };
    }
}

module.exports = BaseCoder;