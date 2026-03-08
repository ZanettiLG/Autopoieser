# Roadmap

Itens derivados do documento [melhorias-e-divergencias.md](melhorias-e-divergencias.md). Prioridade a definir com o time/produto.

**Última atualização:** Março 2026 – itens do plano "Melhorias e divergências" implementados (documentação, indicador worker, optimistic update, feedback enfileirar, doc acessibilidade-responsividade). Vista lista removida (TaskList, TaskDetail, TaskForm).

---

## Documentação (alinhar doc ↔ implementação)

- [x] **jornada-usuario-kanban.md:** Atualizar para 5 colunas; incluir Rejeitada em cenários, regras e fluxo; descrever Comentários, Progresso do agente e deep link.
- [x] **jornada-usuario-tarefas.md:** Nota ou atualização sobre os 5 status (doc legado lista).
- [x] **direcionamento-produto.md:** Incluir `rejected` no pipeline e na visibilidade (onde o usuário vê falha).
- [x] **pesquisa-jornada-tarefas.md:** Rotas e estrutura (Board + overlays); TaskList/TaskDetail/TaskForm removidos.

---

## Código (consistência)

- [x] **Vista lista:** TaskList, TaskDetail e TaskForm removidos; criação/edição apenas por overlay no Board.

---

## Produto / UX

- [x] **Indicador do worker na UI:** Exibir no board (barra superior ou rodapé) status "Worker ativo" / "Worker inativo" via `GET /api/worker/status` (opcional: último processamento, último erro).
- [x] **Otimistic update no drag-and-drop:** Ao mover card entre colunas, atualizar o cache RTK Query antes da resposta e reverter em caso de erro.
- [x] **Feedback ao enfileirar:** Garantir que, ao clicar "Enfileirar" no detalhe, a UI reflita de imediato a mudança; drawer fecha ao enfileirar com sucesso.
- [x] **Responsividade e acessibilidade:** Documentar comportamento atual e recomendações em [acessibilidade-responsividade.md](acessibilidade-responsividade.md).

---

## Referência

- Detalhes, impacto e checklist: [melhorias-e-divergencias.md](melhorias-e-divergencias.md).
