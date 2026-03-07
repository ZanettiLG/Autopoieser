const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const tasks = require("../tasks");

const app = express();
app.use(express.json());

function isLocalhost(req) {
  const addr = req.socket?.remoteAddress || "";
  return addr === "127.0.0.1" || addr === "::ffff:127.0.0.1" || addr === "::1";
}

app.get("/api/tasks", (_req, res) => {
  try {
    const list = tasks.listTasks();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tasks/:id", (req, res) => {
  try {
    const task = tasks.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const { title, body, status } = req.body ?? {};
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title é obrigatório" });
    }
    const task = tasks.createTask({
      title: title.trim(),
      body: typeof body === "string" ? body : "",
      status: status || "open",
    });
    res.status(201).json(task);
    const io = req.app.get("io");
    if (io) io.emit("task:updated", { id: task.id, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tasks/:id", (req, res) => {
  try {
    const { title, body, status, failure_reason } = req.body ?? {};
    const task = tasks.updateTask(req.params.id, {
      ...(title !== undefined && { title: typeof title === "string" ? title.trim() : "" }),
      ...(body !== undefined && { body: typeof body === "string" ? body : "" }),
      ...(status !== undefined && { status }),
      ...(failure_reason !== undefined && { failure_reason: typeof failure_reason === "string" ? failure_reason : null }),
    });
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(task);
    const io = req.app.get("io");
    if (io) io.emit("task:updated", { id: task.id, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const deleted = tasks.deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Tarefa não encontrada" });
    const id = Number(req.params.id);
    res.status(204).send();
    const io = req.app.get("io");
    if (io) io.emit("task:deleted", { id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks/:id/queue", (req, res) => {
  try {
    const task = tasks.enqueueTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(task);
    const io = req.app.get("io");
    if (io) io.emit("task:updated", { id: task.id, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tasks/:id/log", (req, res) => {
  try {
    const task = tasks.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    const log = tasks.getTaskLog(req.params.id);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tasks/:id/comments", (req, res) => {
  try {
    const task = tasks.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    const comments = tasks.getTaskComments(req.params.id);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks/:id/comments", (req, res) => {
  try {
    const task = tasks.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    const { content, author } = req.body ?? {};
    const authorVal = author === "agent" ? "agent" : "user";
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content é obrigatório (string)" });
    }
    const comment = tasks.addComment(req.params.id, {
      content: typeof content === "string" ? content : "",
      author: authorVal,
    });
    res.status(201).json(comment);
    const io = req.app.get("io");
    if (io) io.emit("task:updated", { id: task.id, task: tasks.getTask(task.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const workerStatusPath = path.join(process.cwd(), "data", "worker-status.json");
app.get("/api/worker/status", (_req, res) => {
  try {
    if (!fs.existsSync(workerStatusPath)) {
      return res.json({
        alive: false,
        lastPollAt: null,
        lastTaskId: null,
        lastTaskStatus: null,
        lastTaskAt: null,
        lastError: null,
        recentLogLines: [],
      });
    }
    const content = fs.readFileSync(workerStatusPath, "utf8");
    const data = JSON.parse(content);
    const lastPollAt = data.lastPollAt || null;
    const staleMs = 60000;
    const alive = lastPollAt
      ? Date.now() - new Date(lastPollAt).getTime() < staleMs
      : false;
    res.json({
      alive,
      lastPollAt: data.lastPollAt ?? null,
      lastTaskId: data.lastTaskId ?? null,
      lastTaskStatus: data.lastTaskStatus ?? null,
      lastTaskAt: data.lastTaskAt ?? null,
      lastError: data.lastError ?? null,
      recentLogLines: Array.isArray(data.recentLogLines) ? data.recentLogLines : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/internal/broadcast", (req, res) => {
  if (!isLocalhost(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { event, data } = req.body ?? {};
  if (!event || typeof event !== "string") {
    return res.status(400).json({ error: "event is required" });
  }
  const io = req.app.get("io");
  if (io) io.emit(event, data);
  res.status(204).send();
});

const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
const publicDir = path.join(__dirname, "..", "..", "public");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.use(express.static(publicDir));
}

function startServer(port = 3000, host = process.env.HOST || "0.0.0.0") {
  const server = http.createServer(app);
  const { Server } = require("socket.io");
  const io = new Server(server);
  app.set("io", io);
  return server.listen(port, host, () => {
    console.log(`Servidor em http://localhost:${port} (rede: http://${host}:${port})`);
  });
}

module.exports = { app, startServer };
