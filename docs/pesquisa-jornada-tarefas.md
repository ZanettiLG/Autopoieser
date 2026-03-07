# Pesquisa baseada no mapa da jornada – Sistema de Tarefas

Pesquisa orientada pela jornada do usuário documentada em `jornada-usuario-tarefas.md`.

## 2.1 Tópicos pesquisados e documentados

### React + Redux Toolkit

- **Store**: `configureStore` com reducer root; middleware do RTK Query registrado automaticamente.
- **Slice**: opcional para estado de UI (ex.: filtro por status); a lista e a tarefa selecionada vêm dos endpoints RTK Query (cache).
- **RTK Query**: `createApi` com `baseQuery: fetchBaseQuery({ baseUrl: '/' })` (ou proxy). Endpoints: `getTasks` (query), `getTask` (query com id), `createTask` (mutation), `updateTask` (mutation), `deleteTask` (mutation). Tag types para invalidação de cache após create/update/delete.

### MUI (Material UI)

- **Lista**: `AppBar` + `Button` "Nova tarefa"; `List` / `ListItem` ou `Card` para cada tarefa; `Chip` ou `Typography` para status.
- **Formulário**: `TextField` (título), `Select` / `MenuItem` (status), `TextField` multiline (corpo Markdown), `Button` Salvar/Cancelar.
- **Detalhe**: `Typography` (título), `Chip` (status), corpo renderizado com `react-markdown`; `Button` Editar e Excluir.
- **Exclusão**: `Dialog` com título e ações (Cancelar / Excluir).
- **Feedback**: `Snackbar` (ou `Alert` dentro) para sucesso/erro; estado de abertura controlado.

### Estrutura de pastas

- **app/**: `store.js` (configureStore), `api/tasksApi.js` (createApi), `App.jsx`, `main.jsx`.
- **features/tasks/**: `TaskList.jsx`, `TaskDetail.jsx`, `TaskForm.jsx`; opcional `tasksSlice.js` para UI.
- **Rotas**: definidas em `App.jsx` com `react-router-dom` (Routes, Route, Navigate).

### Markdown no detalhe

- **react-markdown**: componente que recebe o texto e renderiza HTML.
- **remark-gfm**: plugin para GitHub Flavored Markdown (tabelas, listas de tarefas, etc.).

### Integração com o backend

- **Desenvolvimento**: Vite proxy em `vite.config.js`: `/api` → `http://localhost:3000` (Express).
- **Produção**: Express serve `frontend/dist` com `express.static`; rota catch-all para SPA (`index.html`). Mesma origem, sem CORS.

## 2.2 Decisões registradas

| Decisão | Escolha |
| ------- | ------- |
| Chamadas à API | **RTK Query** (`createApi`) – menos boilerplate, cache, estados loading/error |
| Servir frontend em produção | **Express** serve `frontend/dist` – mesma origem, sem CORS |
| Renderização do corpo da tarefa | **react-markdown** + **remark-gfm** (tabelas, listas) |
| Roteamento | **react-router-dom**: `/`, `/tasks/new`, `/tasks/:id`, `/tasks/:id/edit` |
