/**
 * Logger estruturado do worker: prefixo [worker], timestamp ISO, nível (info/error).
 * Mantém buffer circular das últimas linhas para GET /api/worker/status.
 */

const RECENT_LINES = 100;
const recentLines = [];

function timestamp() {
  return new Date().toISOString();
}

function formatLine(level, message) {
  return `[worker] ${timestamp()} ${level} ${message}`;
}

function appendRecent(line) {
  recentLines.push(line);
  if (recentLines.length > RECENT_LINES) recentLines.shift();
}

function logInfo(message) {
  const line = formatLine("info", message);
  console.log(line);
  appendRecent(line);
}

function logError(message, err) {
  const detail = err ? ` ${err.message || err}` : "";
  const line = formatLine("error", message + detail);
  console.error(line);
  if (err && err.stack) console.error(err.stack);
  appendRecent(line);
}

function getRecentLogLines() {
  return [...recentLines];
}

module.exports = { logInfo, logError, getRecentLogLines };
