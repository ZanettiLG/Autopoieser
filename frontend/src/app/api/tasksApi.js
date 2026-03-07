import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Task', 'TaskList'],
  endpoints: (builder) => ({
    getTasks: builder.query({
      query: () => '/api/tasks',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'TaskList', id })),
              { type: 'TaskList', id: 'LIST' },
            ]
          : [{ type: 'TaskList', id: 'LIST' }],
    }),
    getTask: builder.query({
      query: (id) => `/api/tasks/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation({
      query: (body) => ({
        url: '/api/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'TaskList', id: 'LIST' }],
    }),
    updateTask: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/tasks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Task', id },
        { type: 'TaskList', id: 'LIST' },
      ],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `/api/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Task', id },
        { type: 'TaskList', id: 'LIST' },
      ],
    }),
    queueTask: builder.mutation({
      query: (id) => ({
        url: `/api/tasks/${id}/queue`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Task', id },
        { type: 'TaskList', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useQueueTaskMutation,
} = tasksApi;
