import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Drawer,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { useGetTaskQuery, useGetTaskLogQuery, useDeleteTaskMutation, useQueueTaskMutation } from '../../app/api/tasksApi';
import { getStatusLabel } from './statusLabels';

/**
 * Detalhe da tarefa em overlay (drawer). Usado no board Kanban.
 * Recebe taskId, onClose, onSnackbar e onEdit(taskId) para abrir o formulário de edição.
 */
function TaskDetailOverlay({ taskId, open, onClose, onEdit, onSnackbar }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: task, isLoading, error } = useGetTaskQuery(taskId, { skip: !open || !taskId });
  const { data: log = [], isLoading: logLoading } = useGetTaskLogQuery(taskId, {
    skip: !open || !taskId,
    refetchInterval: task?.status === 'in_progress' ? 3000 : false,
  });
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [queueTask, { isLoading: isQueuing }] = useQueueTaskMutation();

  const handleDeleteConfirm = async () => {
    try {
      await deleteTask(taskId).unwrap();
      setDeleteDialogOpen(false);
      onSnackbar?.({ message: 'Tarefa excluída', severity: 'success' });
      onClose?.();
    } catch (err) {
      onSnackbar?.({
        message: err?.data?.error ?? 'Falha ao excluir',
        severity: 'error',
      });
    }
  };

  const handleQueue = async () => {
    try {
      await queueTask(taskId).unwrap();
      onSnackbar?.({ message: 'Tarefa enfileirada', severity: 'success' });
    } catch (err) {
      onSnackbar?.({
        message: err?.data?.error ?? 'Falha ao enfileirar',
        severity: 'error',
      });
    }
  };

  const handleEdit = () => {
    if (task?.id) onEdit?.(task.id);
  };

  const content = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }
    if (error || !task) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error?.data?.error ?? 'Tarefa não encontrada'}
        </Alert>
      );
    }
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="h6" component="h2" gutterBottom>
              {task.title}
            </Typography>
            <Chip
              label={getStatusLabel(task.status)}
              size="small"
              color={
                task.status === 'done'
                  ? 'success'
                  : task.status === 'in_progress'
                    ? 'primary'
                    : task.status === 'queued'
                      ? 'warning'
                      : task.status === 'rejected'
                        ? 'error'
                        : 'default'
              }
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {task.status === 'open' && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlaylistAddIcon />}
                onClick={handleQueue}
                disabled={isQueuing}
              >
                {isQueuing ? 'Enfileirando…' : 'Enfileirar'}
              </Button>
            )}
            <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={handleEdit}>
              Editar
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Excluir
            </Button>
          </Box>
        </Box>
        {task.status === 'rejected' && task.failure_reason && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Falha: {task.failure_reason}
          </Alert>
        )}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography component="div" sx={{ '& p': { mb: 1 }, '& ul, & ol': { pl: 2 } }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {task.body || '(sem conteúdo)'}
            </ReactMarkdown>
          </Typography>
        </Paper>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Progresso do agente
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              maxHeight: 220,
              overflow: 'auto',
              bgcolor: 'grey.50',
            }}
          >
            {logLoading && log.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Carregando…
              </Typography>
            ) : log.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Nenhum log ainda. Enfileire a tarefa para o agente executar.
              </Typography>
            ) : (
              <Typography
                component="pre"
                variant="caption"
                sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {log.map((ev, i) => {
                  const line = ev.type === 'chunk' || ev.type === 'started' || ev.type === 'error'
                    ? (ev.text ?? '')
                    : ev.type === 'done'
                      ? (ev.result != null ? `[done] ${JSON.stringify(ev.result)}` : '[done]')
                      : `[${ev.type}] ${JSON.stringify(ev)}`;
                  return line ? `${line}\n` : null;
                }).filter(Boolean).join('')}
              </Typography>
            )}
          </Paper>
        </Box>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Excluir tarefa?</DialogTitle>
          <DialogContentText sx={{ px: 3 }}>
            Esta ação não pode ser desfeita. Deseja realmente excluir &quot;{task.title}&quot;?
          </DialogContentText>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Detalhe da tarefa
        </Typography>
        <IconButton aria-label="Fechar" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      {content()}
    </Drawer>
  );
}

export default TaskDetailOverlay;
