# Direcionamento do produto – Agent Coder

Documento de pesquisa e decisões para o sistema de tarefas pessoal em que o programador entende o estado de cada processo e os pensamentos do agente.

---

## 1. Escopo do produto

- **O quê**: Sistema de tarefas pessoal para o programador, com execução assíncrona por um agente (Cursor).
- **Quem**: Programador que enfileira tarefas, acompanha o pipeline (status) e quer ver o progresso e o raciocínio do agente por tarefa.
- **Visibilidade**: (1) Pipeline no board Kanban (open → queued → in_progress → done | rejected); em falha do agente a tarefa vai para a coluna Rejeitada e o usuário vê o motivo em `failure_reason` no detalhe; (2) Log/progresso do agente por tarefa (pensamentos, etapas, conclusão ou erro).

---

## 2. Pesquisa resumida

- **Cursor / IDEs**: O estado do agente costuma ser exposto na própria UI do editor (chat, painel de execução). Em nosso caso o agente roda via CLI em processo separado; a saída (stdout/stderr) é a única fonte de “pensamentos”.
- **Alternativas**: (a) só status (já temos); (b) log em tempo real (stream de stdout persistido e exposto); (c) eventos estruturados (NDJSON por linha) se o CLI suportar. Decisão: começar com (b) – persistir saída em stream e exibir como log; evoluir para (c) se o CLI passar a emitir formato estruturado.
- **Benchmark**: Tarefas assíncronas em IDEs (ex.: VS Code Tasks) mostram output em painel; nosso equivalente é “log do agente” no detalhe da tarefa.

---

## 3. Decisões

| Decisão | Escolha |
|--------|---------|
| Onde exibir | No detalhe da tarefa (drawer), seção “Progresso do agente” / “Log”. |
| Formato | Log em tempo real (texto/linhas) persistido por tarefa; leitura via `GET /api/tasks/:id/log`. |
| `-p` (debug) | Manter como flag opcional no coder; usar apenas para debug local (mais verbosidade no CLI). Documentar em AGENTS.md. |
| `response_format` / stream | O coder deve suportar modo “stream”: ler stdout por linhas (ou NDJSON), emitir eventos (chunk/step/done) para o worker persistir. Modo “json” (batch) permanece padrão até stream estável. |
| Persistência de eventos | Um repositório por tarefa: arquivo `tasks/workspaces/{taskId}/agent.log` (append de linhas). Simples e alinhado ao workspace já usado pelo worker. |
| Real-time no frontend | Primeira versão: polling de `GET /api/tasks/:id/log` quando status = in_progress (ex.: a cada 3 s). SSE em fase posterior se necessário. |

---

## 4. Referências

- Tarefa de origem: [tasks/2.md](../tasks/2.md).
- Plano de implementação: `.cursor/plans/` (direcionamento produto e visibilidade do agente).
- Arquitetura do coder/worker: [AGENTS.md](../AGENTS.md).
