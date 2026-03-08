/**
 * Lista arquivos e pastas do repositório para a API GET /api/repo/files.
 * Garante que todos os caminhos ficam dentro do repoRoot (path traversal).
 */
const fs = require("fs");
const path = require("path");

/**
 * Resolve subPath relativamente a repoRoot e garante que o resultado está dentro de repoRoot.
 * @param {string} repoRoot - Caminho absoluto da raiz do repo
 * @param {string} [subPath] - Caminho relativo (ex: "src" ou "src/components")
 * @returns {string|null} Caminho absoluto seguro ou null se fora do repo
 */
function resolveWithinRepo(repoRoot, subPath) {
  const root = path.resolve(repoRoot);
  if (!subPath || subPath === "." || subPath === "/") {
    return root;
  }
  const resolved = path.resolve(root, subPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

/**
 * Lista entradas (arquivos e pastas) em dirPath. Ignora .git.
 * @param {string} repoRoot - Raiz do repositório (absoluto)
 * @param {string} dirPath - Caminho absoluto do diretório a listar
 * @returns {{ path: string, type: 'file'|'folder', name: string }[]}
 */
function listRepoFiles(repoRoot, dirPath) {
  const root = path.resolve(repoRoot);
  const safe = resolveWithinRepo(root, dirPath);
  if (!safe || !fs.existsSync(safe) || !fs.statSync(safe).isDirectory()) {
    return [];
  }
  const prefix = path.relative(root, safe) || ".";
  const entries = fs.readdirSync(safe, { withFileTypes: true });
  const result = [];
  for (const ent of entries) {
    if (ent.name === ".git") continue;
    const rel = path.join(prefix, ent.name);
    result.push({
      path: rel.split(path.sep).join("/"),
      type: ent.isDirectory() ? "folder" : "file",
      name: ent.name,
    });
  }
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

module.exports = {
  resolveWithinRepo,
  listRepoFiles,
};
