export const STATUS_LABELS = {
  open: 'Aberta',
  queued: 'Na fila',
  in_progress: 'Em progresso',
  done: 'Concluída',
};

/** Ordem das colunas no board Kanban (fluxo do pipeline). */
export const STATUS_ORDER = ['open', 'queued', 'in_progress', 'done'];

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Agrupa tarefas por status para as colunas do Kanban.
 * @param {Array<{ id: number, status: string, [key: string]: unknown }>} tasks
 * @returns {Record<string, typeof tasks>}
 */
export function groupTasksByStatus(tasks) {
  const groups = { open: [], queued: [], in_progress: [], done: [] };
  if (!tasks?.length) return groups;
  for (const task of tasks) {
    const status = task.status in groups ? task.status : 'open';
    groups[status].push(task);
  }
  return groups;
}
