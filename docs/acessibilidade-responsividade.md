# Responsividade e acessibilidade – Board Kanban

Notas sobre o comportamento atual e melhorias recomendadas para o frontend do Agent Coder.

## Responsividade (estado atual)

- **Board:** O container do board usa `overflowX: 'auto'`; as colunas têm `minWidth: 280px` e `flexShrink: 0`. Em viewports menores que a soma das colunas, o board exibe **scroll horizontal**.
- **Colunas:** Cada coluna usa `maxHeight: calc(100vh - 120px)` e `overflowY: 'auto'` para scroll vertical do conteúdo quando há muitos cards.
- **Overlays:** Detalhe e formulário usam MUI `Drawer`/modal, que se adaptam ao viewport.

**Recomendação:** Validar em dispositivos móveis e tablets; garantir que o scroll horizontal seja óbvio (ex.: sombra ou indicador de mais conteúdo).

## Acessibilidade (recomendações)

- **ARIA:** Colunas e cards podem receber `aria-label` ou `role="region"` com nome do status; botões "Adicionar card", "Enfileirar", "Editar", "Excluir" já são elementos nativos ou MUI com texto visível.
- **Foco:** Ao abrir/fechar overlays, o foco deve ir para o primeiro elemento interativo (ex.: campo título no formulário, botão fechar no detalhe). MUI Drawer/Modal costumam gerenciar trap de foco.
- **Teclado:** Navegação por Tab entre colunas e cards; drag-and-drop por mouse/toque hoje não tem equivalente por teclado (ação alternativa: abrir detalhe e usar "Editar" para mudar status).
- **Contraste e labels:** Chips de status e botões seguem tema MUI; garantir contraste adequado em temas claro/escuro.

## Referências

- Jornada Kanban: [jornada-usuario-kanban.md](jornada-usuario-kanban.md) (§ Responsividade).
- Melhorias e divergências: [melhorias-e-divergencias.md](melhorias-e-divergencias.md) (§ 4.4).
