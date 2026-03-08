export const STATUS_LABELS = {
  open: 'Aberta',
  queued: 'Na fila',
  in_progress: 'Em progresso',
  done: 'Concluída',
  rejected: 'Rejeitada',
};

/** Ordem das colunas no board Kanban (fluxo do pipeline). */
export const STATUS_ORDER = ['open', 'queued', 'in_progress', 'done', 'rejected'];

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Cor do Chip MUI por status (exibição consistente no board e detalhes).
 * @param {string} status
 * @returns {'success'|'primary'|'warning'|'error'|'default'}
 */
export function getStatusChipColor(status) {
  const map = {
    done: 'success',
    in_progress: 'primary',
    queued: 'warning',
    rejected: 'error',
    open: 'default',
  };
  return map[status] ?? 'default';
}

/** Opções para selects de status: { value, label } em ordem do pipeline. */
export const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({
  value,
  label: getStatusLabel(value),
}));

/**
 * Agrupa tarefas por status para as colunas do Kanban.
 * @param {Array<{ id: number, status: string, [key: string]: unknown }>} tasks
 * @returns {Record<string, typeof tasks>}
 */
export function groupTasksByStatus(tasks) {
  const groups = { open: [], queued: [], in_progress: [], done: [], rejected: [] };
  if (!tasks?.length) return groups;
  for (const task of tasks) {
    const status = task.status in groups ? task.status : 'open';
    groups[status].push(task);
  }
  return groups;
}
