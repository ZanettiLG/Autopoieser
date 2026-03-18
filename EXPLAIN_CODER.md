# Especificação: Módulo Coder e Worktree

Este documento descreve os quatro arquivos centrais do módulo **coder** do Agent Coder e como eles se relacionam.

---

## 1. Visão geral da relação entre os arquivos

```
backend/src/coder/
├── index.js          → Ponto de entrada público; exporta defaultCoder e createCoder
├── providers/
│   ├── base.js       → Classe base: orquestra spawn, stream/batch, callbacks
│   └── cursor.js     → Implementação concreta: monta comando CLI do Cursor (estende BaseCoder)
└── worktree.js       → Utilitários Git worktree (usado pelo worker, não pelo coder)
```

- **index.js** usa **CursorCoder** (cursor.js).
- **CursorCoder** estende **BaseCoder** (base.js); só customiza `command(prompt)`.
- **worktree.js** é independente do coder: usado pelo **worker** para criar o workspace onde o coder roda; o coder recebe o path desse workspace via opção `workspace`.

---

## 2. `backend/src/coder/index.js`

**Papel:** Ponto de entrada do módulo coder. Expõe uma instância padrão e uma factory.

- **defaultWorkspace:** `path.join(process.cwd(), "..", "test")` — usado quando nenhum workspace é passado.
- **defaultCoder:** instância única de `CursorCoder` com opções padrão (model `auto`, outputFormat `json`, etc.).
- **createCoder(options):** factory que retorna um novo `CursorCoder` com `{ model, debug, outputFormat, workspace, ...options }`.

Quem consome o coder (ex.: worker) chama `createCoder({ workspace: pathDoWorktree, outputFormat: 'stream' })` para ter um coder configurado para aquela tarefa.

---

## 3. `backend/src/coder/providers/base.js`

**Papel:** Classe base que define o fluxo de execução do agente (spawn do processo, leitura de stdout/stderr, stream vs batch). A forma do **comando** em si fica para a subclasse.

- **defaultOptions:** `{ model: "auto", debug: false, outputFormat: "json" }`.
- **command(prompt):** lança `"Not implemented"` — deve ser implementado pela subclasse (ex.: CursorCoder).
- **code(prompt, callbacks):**
  - Monta o comando com `this.command(prompt)`.
  - Cria um `AbortController` e retorna `{ response, abort }`.
  - Executa `spawn("bash", ["-c", command])` com `stdio: "pipe"`.
  - **Modo batch** (`outputFormat !== "stream"`): espera uma única linha JSON no stdout, faz parse, chama `onDone(result)` e resolve a Promise com esse resultado. Qualquer stderr em batch causa reject.
  - **Modo stream** (`outputFormat === "stream"`): lê stdout por linhas; cada linha que for JSON válido chama `onDone(parsed)`; linha que não for JSON chama `onChunk(text)`. No `close` do processo chama `onDone()` (sem argumento) e, se `code !== 0`, rejeita com erro contendo stderr/stdout (trecho de 500 chars).
  - Erros de spawn e de parsing são repassados via reject.

Resumo: **BaseCoder** implementa toda a lógica de processo e callbacks; a subclasse só precisa implementar **command(prompt)** para dizer qual comando rodar.

---

## 4. `backend/src/coder/providers/cursor.js`

**Papel:** Implementação concreta do coder que fala com o **CLI do Cursor**. Estende BaseCoder e implementa `command(prompt)`.

- **escapeForBashDoubleQuotes(s):** escapa `\` e `"` para uso seguro dentro de `bash -c "..."`.
- **CursorCoder:** chama `super(options)` e não adiciona estado próprio.
- **command(prompt):** monta a string do comando que será passada ao bash:
  - Base: `agent --trust ...`
  - **debug:** se `options.debug`, adiciona ` -p`.
  - **model:** se `options.model`, adiciona ` --model "<model>"` (escapado).
  - **outputFormat:** o CLI aceita `text`, `json`, `stream-json` (não `"stream"`); o código mapeia `outputFormat === "stream"` para `stream-json` e usa `json` como fallback.
  - **workspace:** se `options.workspace`, adiciona ` --workspace "<path>"` (escapado).
  - Prompt e API key são escapados e inseridos como `"<safePrompt>"` e `--api-key "<safeApiKey>"` (API key vinda de `../../config`).
- **code(prompt, callbacks):** apenas delega para `super.code(prompt, callbacks)`.

Ou seja: **CursorCoder** só define *como* o comando é montado; a execução (spawn, stream, callbacks) é toda herdada de **BaseCoder**.

---

## 5. `backend/src/coder/worktree.js`

**Papel:** Utilitários para **git worktree** por tarefa. Não depende do coder; é usado pelo **worker** para isolar o ambiente de execução (um worktree por tarefa).

- **BRANCH_PREFIX:** `"agent/task-"`.
- **getWorktreeBranchName(taskId):** retorna `agent/task-{taskId}`.
- **findGitRoot(startPath):** sobe a partir de `startPath` (ou `process.cwd()`) até achar um diretório que contenha `.git`; lança se não achar (ex.: "Not a git repository (no .git found from ...)").
- **ensureIsGitRepo(repoRoot):** garante que existe `.git` em `repoRoot`; senão lança.
- **runGit(repoRoot, args, options):** executa `git` com `execFileSync` em `repoRoot`.
- **runGitQuoted(repoRoot, ...args):** executa `git` com argumentos passados entre aspas (via `JSON.stringify`) para evitar que caminhos com espaços quebrem o comando.
- **isWorktreePath(repoRoot, worktreePath):** verifica se `worktreePath` consta em `git worktree list --porcelain`.
- **createWorktree(repoRoot, worktreePath, taskId):** garante repo válido; se já existir algo em `worktreePath` (worktree ou dir), remove; depois executa `git worktree add <worktreePath> -b agent/task-<taskId>`. Retorna `worktreePath` resolvido.
- **mergeWorktree(repoRoot, worktreePath, taskId):** se houver alterações no worktree, faz `add -A` e `commit -m "Agent task <taskId>"`; faz merge da branch no repo principal (`--no-edit`); remove o worktree e deleta a branch.
- **removeWorktree(repoRoot, worktreePath, taskId):** remove o worktree (com `--force` se for worktree) ou apaga o diretório; deleta a branch com `-D`.

O worker usa esse módulo para: antes de rodar o agente, **createWorktree**; em sucesso, **mergeWorktree**; em falha, **removeWorktree**. O path do worktree é o mesmo que é passado ao coder como `workspace`.

---

## 6. Fluxo de uso no worker

1. Worker pega uma tarefa enfileirada e chama o taskProcessor.
2. TaskProcessor obtém o path do workspace da tarefa (ex.: `tasks/workspaces/{taskId}`).
3. **worktree.createWorktree(repoRoot, workspacePath, task.id)** cria o worktree nesse path com branch `agent/task-{id}`.
4. **createCoder({ workspace: workspacePath, outputFormat: 'stream' })** cria um CursorCoder que rodará o CLI com `--workspace "<workspacePath>"` e `--output-format "stream-json"`.
5. O prompt (contexto + body) é enviado ao coder; **code(prompt, { onChunk, onDone })** dispara o processo; cada linha de saída vai para o log da tarefa (appendEvent) e para os callbacks.
6. Se der certo: **worktree.mergeWorktree(...)** faz commit no worktree, merge no repo principal e remove worktree e branch.
7. Se der erro: **worktree.removeWorktree(...)** descarta worktree e branch.

Assim, **worktree** e **coder** se relacionam pelo **workspace**: o worktree define *onde* o código roda; o coder recebe esse path e repassa ao CLI do Cursor para o agente operar naquele diretório isolado.

---

## 7. Resumo das dependências

| Arquivo      | Depende de                          | Usado por                    |
|-------------|--------------------------------------|------------------------------|
| index.js    | CursorCoder (cursor.js)              | Worker, testes, API           |
| base.js     | node:child_process (spawn)          | cursor.js                    |
| cursor.js   | base.js, config (cursorApiKey)       | index.js                     |
| worktree.js | fs, path, node:child_process (exec)  | worker/taskProcessor (não coder) |

O **coder** (index + providers) é responsável por **invocar o agente** (CLI Cursor) e expor o resultado via Promise e callbacks. O **worktree** é responsável por **preparar e limpar** o diretório Git onde essa invocação acontece.
