import { describe, it, expect } from 'vitest';
import { getStatusLabel, STATUS_LABELS, STATUS_ORDER, groupTasksByStatus } from './statusLabels';

describe('statusLabels', () => {
  it('returns correct label for open', () => {
    expect(getStatusLabel('open')).toBe('Aberta');
  });

  it('returns correct label for in_progress', () => {
    expect(getStatusLabel('in_progress')).toBe('Em progresso');
  });

  it('returns correct label for done', () => {
    expect(getStatusLabel('done')).toBe('Concluída');
  });

  it('returns correct label for queued', () => {
    expect(getStatusLabel('queued')).toBe('Na fila');
  });

  it('returns raw value for unknown status', () => {
    expect(getStatusLabel('unknown')).toBe('unknown');
  });

  it('STATUS_LABELS has expected keys', () => {
    expect(STATUS_LABELS).toEqual({
      open: 'Aberta',
      queued: 'Na fila',
      in_progress: 'Em progresso',
      done: 'Concluída',
    });
  });

  it('STATUS_ORDER has four columns in pipeline order', () => {
    expect(STATUS_ORDER).toEqual(['open', 'queued', 'in_progress', 'done']);
  });

  it('groupTasksByStatus returns empty groups when no tasks', () => {
    expect(groupTasksByStatus([])).toEqual({
      open: [],
      queued: [],
      in_progress: [],
      done: [],
    });
    expect(groupTasksByStatus(undefined)).toEqual({
      open: [],
      queued: [],
      in_progress: [],
      done: [],
    });
  });

  it('groupTasksByStatus distributes tasks by status', () => {
    const tasks = [
      { id: 1, status: 'open', title: 'A' },
      { id: 2, status: 'done', title: 'B' },
      { id: 3, status: 'open', title: 'C' },
    ];
    const out = groupTasksByStatus(tasks);
    expect(out.open).toHaveLength(2);
    expect(out.open.map((t) => t.id)).toEqual([1, 3]);
    expect(out.done).toHaveLength(1);
    expect(out.done[0].id).toBe(2);
    expect(out.queued).toHaveLength(0);
    expect(out.in_progress).toHaveLength(0);
  });

  it('groupTasksByStatus treats unknown status as open', () => {
    const tasks = [{ id: 1, status: 'unknown', title: 'X' }];
    const out = groupTasksByStatus(tasks);
    expect(out.open).toHaveLength(1);
    expect(out.open[0].id).toBe(1);
  });
});
