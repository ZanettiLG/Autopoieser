import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { AppBar, Toolbar, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useGetTasksQuery, useUpdateTaskMutation } from '../../app/api/tasksApi';
import { STATUS_ORDER, groupTasksByStatus } from './statusLabels';
import Column from './Column';
import TaskDetailOverlay from './TaskDetailOverlay';
import TaskFormOverlay from './TaskFormOverlay';

/**
 * Board Kanban: 4 colunas por status, cards arrastáveis, overlays para detalhe e formulário.
 * openTaskId: quando vindo de /tasks/:id, abre o detalhe dessa tarefa.
 */
function Board({ onSnackbar, openTaskId }) {
  const navigate = useNavigate();
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [formState, setFormState] = useState({
    open: false,
    status: 'open',
    taskId: null,
  });

  useEffect(() => {
    if (openTaskId) setDetailTaskId(Number(openTaskId));
  }, [openTaskId]);

  const { data: tasks, isLoading, error } = useGetTasksQuery();
  const [updateTask] = useUpdateTaskMutation();
  const byStatus = groupTasksByStatus(tasks ?? []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over) return;
      const task = active.data.current?.task;
      if (!task) return;
      const newStatus = over.id;
      if (
        typeof newStatus === 'string' &&
        STATUS_ORDER.includes(newStatus) &&
        newStatus !== task.status
      ) {
        updateTask({ id: task.id, status: newStatus })
          .unwrap()
          .then(() => onSnackbar?.({ message: 'Tarefa movida', severity: 'success' }))
          .catch((err) =>
            onSnackbar?.({
              message: err?.data?.error ?? 'Falha ao mover tarefa',
              severity: 'error',
            })
          );
      }
    },
    [updateTask, onSnackbar]
  );

  const handleCardClick = useCallback((task) => {
    setDetailTaskId(task?.id ?? null);
  }, []);

  const handleAddCard = useCallback((status) => {
    setFormState({ open: true, status, taskId: null });
  }, []);

  const handleEditFromDetail = useCallback((taskId) => {
    setDetailTaskId(null);
    setFormState((s) => ({ ...s, open: true, taskId }));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailTaskId(null);
    if (openTaskId) navigate('/', { replace: true });
  }, [openTaskId, navigate]);
  const handleCloseForm = useCallback(() => setFormState((s) => ({ ...s, open: false })), []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Falha ao carregar tarefas: {error?.data?.error ?? error?.message}
      </Alert>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Tarefas
          </Typography>
        </Toolbar>
      </AppBar>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            minHeight: 'calc(100vh - 64px)',
            alignItems: 'flex-start',
          }}
        >
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={byStatus[status] ?? []}
              onAddCard={handleAddCard}
              onCardClick={handleCardClick}
            />
          ))}
        </Box>
      </DndContext>

      <TaskDetailOverlay
        taskId={detailTaskId}
        open={Boolean(detailTaskId)}
        onClose={handleCloseDetail}
        onEdit={handleEditFromDetail}
        onSnackbar={onSnackbar}
      />

      <TaskFormOverlay
        open={formState.open}
        taskId={formState.taskId}
        initialStatus={formState.status}
        onClose={handleCloseForm}
        onSuccess={() => {}}
        onSnackbar={onSnackbar}
      />
    </>
  );
}

export default Board;
