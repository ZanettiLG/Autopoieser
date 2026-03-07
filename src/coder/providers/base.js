const { spawn } = require("node:child_process");

const defaultOptions = { model: "auto", debug: false, outputFormat: "json" };

class BaseCoder {
  constructor(options = defaultOptions) {
    this.options = { ...defaultOptions, ...options };
  }

  command(prompt) {
    throw new Error("Not implemented");
  }

  /**
   * Run the agent. Returns { response, abort }.
   * response: Promise that resolves with the final result (batch mode: parsed JSON; stream mode: undefined or last result).
   * callbacks: { onChunk?(text), onDone?(result) } – observer for stream/batch output.
   */
  code(prompt, callbacks = {}) {
    const abortController = new AbortController();
    const abort = () => abortController.abort("Aborted");

    const command = this.command(prompt);
    const isStream = this.options.outputFormat === "stream";

    const response = new Promise((resolve, reject) => {
      const child = spawn("bash", ["-c", command], {
        signal: abortController.signal,
        stdio: "pipe",
      });
      let resolved = false;
      let stderrBuf = "";

      child.stderr.on("data", (data) => {
        const text = data.toString();
        stderrBuf += text;
        console.error(text);
        if (!isStream) {
          const err = new Error(text);
          err.stderr = text;
          reject(err);
        }
      });

      if (isStream) {
        let buffer = "";
        child.stdout.on("data", (data) => {
          buffer += data.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              try {
                const parsed = JSON.parse(trimmed);
                callbacks.onDone?.(parsed);
              } catch (_) {
                callbacks.onChunk?.(trimmed);
              }
            }
          }
        });
        child.on("close", (code) => {
          if (buffer.trim()) callbacks.onChunk?.(buffer.trim());
          callbacks.onDone?.();
          if (code !== 0) {
            const stderrTrimmed = stderrBuf.trim();
            const stdoutTrimmed = buffer.trim();
            const detail = stderrTrimmed || stdoutTrimmed;
            const err = new Error(
              detail
                ? `Command failed with code ${code}: ${detail.slice(0, 500)}`
                : `Command failed with code ${code}`
            );
            if (stderrBuf) err.stderr = stderrBuf;
            if (stdoutTrimmed) err.stdout = stdoutTrimmed;
            reject(err);
          } else resolve();
        });
      } else {
        child.stdout.on("data", (data) => {
          if (resolved) return;
          resolved = true;
          try {
            const result = JSON.parse(data.toString());
            callbacks.onDone?.(result);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
      }

      child.on("error", (error) => {
        reject(error);
      });
      if (!isStream) {
        child.on("close", (code) => {
          if (!resolved) {
            if (code !== 0) reject(new Error(`Command failed with code ${code}`));
            else reject(new Error("Command exited without output"));
          }
        });
      }
    });

    return { response, abort };
  }
}

module.exports = BaseCoder;
