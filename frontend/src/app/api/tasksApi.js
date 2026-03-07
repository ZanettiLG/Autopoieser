import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Task', 'TaskList', 'TaskComments', 'WorkerStatus'],
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
    getTaskLog: builder.query({
      query: (id) => `/api/tasks/${id}/log`,
      providesTags: (_result, _err, id) => [{ type: 'Task', id }],
    }),
    getWorkerStatus: builder.query({
      query: () => '/api/worker/status',
      providesTags: ['WorkerStatus'],
    }),
    getTaskComments: builder.query({
      query: (id) => `/api/tasks/${id}/comments`,
      providesTags: (_result, _err, id) => [{ type: 'TaskComments', id }],
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
      async onQueryStarted({ id, ...body }, { dispatch, queryFulfilled }) {
        const patches = [];
        const listPatch = dispatch(
          tasksApi.util.updateQueryData('getTasks', undefined, (draft) => {
            const task = draft?.find((t) => t.id === id);
            if (task && body.status != null) task.status = body.status;
          })
        );
        patches.push(listPatch);
        if (body.status != null) {
          const taskPatch = dispatch(
            tasksApi.util.updateQueryData('getTask', id, (draft) => {
              if (draft) draft.status = body.status;
            })
          );
          patches.push(taskPatch);
        }
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
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
    addComment: builder.mutation({
      query: ({ taskId, content }) => ({
        url: `/api/tasks/${taskId}/comments`,
        method: 'POST',
        body: { content, author: 'user' },
      }),
      invalidatesTags: (_result, _err, { taskId }) => [
        { type: 'TaskComments', id: taskId },
        { type: 'Task', id: taskId },
      ],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useGetTaskLogQuery,
  useGetTaskCommentsQuery,
  useGetWorkerStatusQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useQueueTaskMutation,
  useAddCommentMutation,
} = tasksApi;
