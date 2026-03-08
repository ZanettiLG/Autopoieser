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

const STALE_MS = 60000;

/**
 * Creates a reader for worker status (for GET /api/worker/status).
 * @param {string} [statusFilePath] - Path to worker-status.json (default: data/worker-status.json)
 * @returns {{ read(): { alive: boolean, lastPollAt: string | null, lastTaskId: number | null, lastTaskStatus: string | null, lastTaskAt: string | null, lastError: string | null, recentLogLines: string[] } }}
 */
function createWorkerStatusReader(statusFilePath = STATUS_FILE) {
  return {
    read() {
      if (!fs.existsSync(statusFilePath)) {
        return {
          alive: false,
          lastPollAt: null,
          lastTaskId: null,
          lastTaskStatus: null,
          lastTaskAt: null,
          lastError: null,
          recentLogLines: [],
        };
      }
      try {
        const content = fs.readFileSync(statusFilePath, "utf8");
        const data = JSON.parse(content);
        const lastPollAt = data.lastPollAt || null;
        const alive = lastPollAt
          ? Date.now() - new Date(lastPollAt).getTime() < STALE_MS
          : false;
        return {
          alive,
          lastPollAt: data.lastPollAt ?? null,
          lastTaskId: data.lastTaskId ?? null,
          lastTaskStatus: data.lastTaskStatus ?? null,
          lastTaskAt: data.lastTaskAt ?? null,
          lastError: data.lastError ?? null,
          recentLogLines: Array.isArray(data.recentLogLines) ? data.recentLogLines : [],
        };
      } catch (_) {
        return {
          alive: false,
          lastPollAt: null,
          lastTaskId: null,
          lastTaskStatus: null,
          lastTaskAt: null,
          lastError: null,
          recentLogLines: [],
        };
      }
    },
  };
}

module.exports = { writeStatus, readStatusRaw, STATUS_FILE, createWorkerStatusReader };
