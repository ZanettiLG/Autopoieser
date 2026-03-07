# Agent Coder – Guia para agentes de código

Este documento orienta agentes e LLMs a manter, estender e depurar o projeto. Humanas também podem usá-lo como referência.

---

## 1. Visão geral

**Agent Coder** é uma aplicação que:

- Gerencia **tarefas** (CRUD) com conteúdo em Markdown.
- Expõe uma **fila de processos**: tarefas com status `queued` são consumidas por um **worker** que executa uma thread do agente (Cursor) por tarefa, com **contexto isolado** (workspace e “chat” por tarefa).
- **Backend**: Express, SQLite (metadados), arquivos `.md` em `./tasks` (corpo da tarefa).
- **Frontend**: React, MUI, Redux Toolkit, RTK Query (em `frontend/`).

O agente **não** é iniciado em `src/index.js`; esse arquivo só exporta módulos. O agente roda apenas via **worker** (`npm run worker`), uma tarefa por vez.

---

## 2. Estrutura do projeto

```
agent-coder/
├── src/
│   ├── index.js           # Não inicia o agente; exporta createCoder e tasks
│   ├── config/            # Config (ex.: CURSOR_API_KEY)
│   ├── server/            # Express: API REST + servir frontend build
│   │   ├── index.js       # Rotas /api/tasks e estáticos
│   │   └── run.js         # Entry: npm run server
│   ├── tasks/             # Lógica de tarefas
│   │   ├── index.js       # createTask, getTask, listTasks, updateTask, deleteTask, enqueueTask, getNextQueued
│   │   ├── db.js          # SQLite (metadados: id, title, status, created_at, updated_at)
│   │   └── storage.js     # Leitura/escrita de .md em ./tasks/{id}.md
│   ├── worker/            # Consumidor da fila
│   │   └── run.js         # Entry: npm run worker; poll → pega queued → in_progress → agente → done
│   └── coder/             # Integração com agente (Cursor)
│       ├── index.js       # createCoder(options), default coder
│       └── providers/     # BaseCoder, CursorCoder (spawn do CLI)
├── frontend/              # App React (Vite, MUI, Redux Toolkit, RTK Query)
│   └── src/
│       ├── app/           # store, api/tasksApi.js
│       └── features/tasks # Board, Column, TaskCard, DraggableCard, TaskDetailOverlay, TaskFormOverlay, statusLabels
├── tasks/                 # Arquivos .md por tarefa (id.md); workspaces em tasks/workspaces/{id}
├── data/                  # SQLite (tasks.db) – ignorado no git
├── public/                # Fallback estático quando frontend/dist não existe
├── docs/                  # Jornada do usuário, pesquisa, etc.
└── package.json
```

---

## 3. Scripts (raiz)

| Script | Comando | Descrição |
|--------|---------|-----------|
| `start` / `server` | `node src/server/run.js` | Sobe a API Express; serve `frontend/dist` se existir. |
| `worker` | `node src/worker/run.js` | Worker que consome a fila e executa o agente por tarefa. |
| `build:frontend` | `cd frontend && npm run build` | Gera `frontend/dist` para produção. |

**Desenvolvimento**: em um terminal `npm run server` (porta 3000); em outro `cd frontend && npm run dev` (Vite com proxy `/api` → Express).

---

## 4. API de tarefas

- `GET /api/tasks` – lista (metadados, sem body).
- `GET /api/tasks/:id` – uma tarefa (com body).
- `POST /api/tasks` – criar; body: `{ title, body?, status? }`.
- `PUT /api/tasks/:id` – atualizar; body: `{ title?, body?, status? }`.
- `DELETE /api/tasks/:id` – excluir.
- `POST /api/tasks/:id/queue` – enfileirar (status → `queued`).

Status: `open`, `queued`, `in_progress`, `done`.

---

## 5. Fila e worker

- Tarefas com status **`queued`** são consumidas pelo worker (polling; intervalo configurável por `WORKER_POLL_MS`).
- Para cada tarefa: status → `in_progress`, workspace `tasks/workspaces/{taskId}` criado, **novo coder** via `createCoder({ workspace })`, prompt = corpo da tarefa (ou título); ao terminar → `done`, em erro → `open`.
- Cada execução do agente é **contexto limpo** (outro “chat”): um coder por tarefa, workspace isolado.

---

## 6. Coder (agente)

- `src/coder/index.js`: exporta o coder default e **`createCoder(options)`**.
- `createCoder({ workspace })` é usado pelo worker para isolar por tarefa.
- O coder usa o CLI do Cursor (`agent --trust ...`); ver `src/coder/providers/cursor.js` e `base.js`.

---

## 7. Frontend

- **Stack**: React, MUI, Redux Toolkit, RTK Query, react-router-dom, react-markdown, remark-gfm, @dnd-kit (core, sortable, utilities) para drag-and-drop.
- **Vista principal**: **Board Kanban** (rota `/`) com 4 colunas por status (Aberta, Na fila, Em progresso, Concluída). Cards arrastáveis entre colunas; clique no card abre **detalhe em drawer**; “Adicionar card” por coluna abre **formulário em modal**. Mover card = `PUT /api/tasks/:id` com novo `status`.
- **Rotas**: `/` (board), `/tasks/:id` (board com detalhe da tarefa aberto – deep link).
- **API**: `frontend/src/app/api/tasksApi.js` (baseUrl `/`; em dev o Vite faz proxy para o Express).
- **Status**: labels e chips para `open`, `queued`, `in_progress`, `done`; botão “Enfileirar” no overlay de detalhe quando status é `open`.
- **Componentes**: `Board.jsx` (DndContext, colunas), `Column.jsx` (useDroppable), `DraggableCard.jsx` / `TaskCard.jsx`, `TaskDetailOverlay.jsx` (drawer), `TaskFormOverlay.jsx` (modal). Agrupamento por status: `groupTasksByStatus` e `STATUS_ORDER` em `statusLabels.js`.

---

## 8. Convenções para agentes

- **Backend (Node)**: CommonJS; preferir **funções e composição** em vez de classes onde fizer sentido; manter `src/tasks` e `src/worker` sem side-effects desnecessários no load.
- **Frontend (React)**: seguir padrões do projeto em `frontend/src` (features, app/store, app/api); evitar proliferação de boolean props; usar RTK Query para dados da API.
- **Testes**: no frontend há Vitest e testes em `frontend/src` (ex.: `statusLabels.test.js`, `tasksApi.test.js`). Novas regras de negócio devem ter testes quando fizer sentido; não criar arquivos de exemplo em vez de testes.
- **Documentação**: planos e decisões em `docs/`; não editar o plano em `.cursor/plans/` a menos que o usuário peça.
- **Causa raiz**: ao corrigir bugs, identificar e corrigir a causa exata; não apenas contornar com fallbacks.
- **Uso de código**: usar variáveis e funções já criadas ou removê-las se ficarem obsoletas.

---

## 9. Ambiente

- **Variáveis**: `CURSOR_API_KEY` (config do coder); `PORT` (servidor); `WORKER_POLL_MS` (opcional, intervalo do worker em ms).
- **Arquivo `.env`** na raiz (não versionado).

---

## 10. Referências no repositório

- Jornada do usuário (lista): `docs/jornada-usuario-tarefas.md`.
- Jornada Kanban: `docs/jornada-usuario-kanban.md`.
- Pesquisa e decisões (RTK Query, MUI, etc.): `docs/pesquisa-jornada-tarefas.md`.
