/**
 * Estado do worker persistido em data/worker-status.json para GET /api/worker/status.
 * O worker chama writeStatus(); o servidor lê o arquivo diretamente.
 */

const path = require("path");
const fs = require("fs");

const STATUS_FILE = path.join(process.cwd(), "data", "worker-status.json");

function ensureDataDir() {
  const dir = path.dirname(STATUS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {object} update - lastPollAt, lastTaskId?, lastTaskStatus?, lastTaskAt?, lastError?, recentLogLines?
 */
function writeStatus(update) {
  ensureDataDir();
  const existing = readStatusRaw();
  const merged = { ...existing, ...update };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(merged, null, 0), "utf8");
}

function readStatusRaw() {
  if (!fs.existsSync(STATUS_FILE)) return {};
  try {
    const content = fs.readFileSync(STATUS_FILE, "utf8");
    return JSON.parse(content);
  } catch (_) {
    return {};
  }
}

module.exports = { writeStatus, readStatusRaw, STATUS_FILE };
