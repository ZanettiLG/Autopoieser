import { describe, it, expect } from 'vitest';
import {
  getStatusLabel,
  getStatusChipColor,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_OPTIONS,
  groupTasksByStatus,
} from './statusLabels';

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

  it('returns correct label for rejected', () => {
    expect(getStatusLabel('rejected')).toBe('Rejeitada');
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
      rejected: 'Rejeitada',
    });
  });

  it('STATUS_ORDER has five columns in pipeline order', () => {
    expect(STATUS_ORDER).toEqual(['open', 'queued', 'in_progress', 'done', 'rejected']);
  });

  it('groupTasksByStatus returns empty groups when no tasks', () => {
    expect(groupTasksByStatus([])).toEqual({
      open: [],
      queued: [],
      in_progress: [],
      done: [],
      rejected: [],
    });
    expect(groupTasksByStatus(undefined)).toEqual({
      open: [],
      queued: [],
      in_progress: [],
      done: [],
      rejected: [],
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
    expect(out.rejected).toHaveLength(0);
  });

  it('groupTasksByStatus puts rejected tasks in rejected group', () => {
    const tasks = [
      { id: 1, status: 'rejected', title: 'X', failure_reason: 'Erro' },
      { id: 2, status: 'done', title: 'Y' },
    ];
    const out = groupTasksByStatus(tasks);
    expect(out.rejected).toHaveLength(1);
    expect(out.rejected[0].id).toBe(1);
    expect(out.done).toHaveLength(1);
  });

  it('groupTasksByStatus treats unknown status as open', () => {
    const tasks = [{ id: 1, status: 'unknown', title: 'X' }];
    const out = groupTasksByStatus(tasks);
    expect(out.open).toHaveLength(1);
    expect(out.open[0].id).toBe(1);
  });

  describe('getStatusChipColor', () => {
    it('returns success for done', () => {
      expect(getStatusChipColor('done')).toBe('success');
    });
    it('returns primary for in_progress', () => {
      expect(getStatusChipColor('in_progress')).toBe('primary');
    });
    it('returns warning for queued', () => {
      expect(getStatusChipColor('queued')).toBe('warning');
    });
    it('returns error for rejected', () => {
      expect(getStatusChipColor('rejected')).toBe('error');
    });
    it('returns default for open', () => {
      expect(getStatusChipColor('open')).toBe('default');
    });
    it('returns default for unknown status', () => {
      expect(getStatusChipColor('unknown')).toBe('default');
    });
  });

  describe('STATUS_OPTIONS', () => {
    it('has five options in pipeline order', () => {
      expect(STATUS_OPTIONS).toHaveLength(5);
      expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(STATUS_ORDER);
    });
    it('each option has value and label from getStatusLabel', () => {
      STATUS_OPTIONS.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('label');
        expect(opt.label).toBe(getStatusLabel(opt.value));
      });
    });
  });
});
