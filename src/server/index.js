const express = require("express");
const path = require("path");
const fs = require("fs");
const tasks = require("../tasks");

const app = express();
app.use(express.json());

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tasks/:id", (req, res) => {
  try {
    const { title, body, status } = req.body ?? {};
    const task = tasks.updateTask(req.params.id, {
      ...(title !== undefined && { title: typeof title === "string" ? title.trim() : "" }),
      ...(body !== undefined && { body: typeof body === "string" ? body : "" }),
      ...(status !== undefined && { status }),
    });
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const deleted = tasks.deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks/:id/queue", (req, res) => {
  try {
    const task = tasks.enqueueTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

function startServer(port = 3000) {
  return app.listen(port, () => {
    console.log(`Servidor em http://localhost:${port}`);
  });
}

module.exports = { app, startServer };
