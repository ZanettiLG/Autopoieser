import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { tasksApi } from './tasksApi';

describe('tasksApi', () => {
  it('has reducerPath tasksApi', () => {
    expect(tasksApi.reducerPath).toBe('tasksApi');
  });

  it('has getTasks, getTask, getTaskLog, createTask, updateTask, deleteTask, queueTask endpoints', () => {
    const names = Object.keys(tasksApi.endpoints);
    expect(names).toContain('getTasks');
    expect(names).toContain('getTask');
    expect(names).toContain('getTaskLog');
    expect(names).toContain('createTask');
    expect(names).toContain('updateTask');
    expect(names).toContain('deleteTask');
    expect(names).toContain('queueTask');
  });

  it('store accepts tasksApi reducer and middleware', () => {
    const store = configureStore({
      reducer: {
        [tasksApi.reducerPath]: tasksApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(tasksApi.middleware),
    });
    expect(store.getState()[tasksApi.reducerPath]).toBeDefined();
  });
});
