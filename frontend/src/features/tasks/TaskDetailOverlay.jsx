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
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { useGetTaskQuery, useGetTaskLogQuery, useGetTaskCommentsQuery, useDeleteTaskMutation, useQueueTaskMutation, useAddCommentMutation } from '../../app/api/tasksApi';
import { useSnackbar } from '../../app/SnackbarContext';
import { getStatusLabel, getStatusChipColor } from './statusLabels';
import { formatAgentLogEvents } from './agentLogUtils';

/**
 * Detalhe da tarefa em overlay (drawer). Usado no board Kanban.
 * Recebe taskId, onClose e onEdit(taskId) para abrir o formulário de edição.
 */
function TaskDetailOverlay({ taskId, open, onClose, onEdit }) {
  const { showSnackbar } = useSnackbar();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const { data: task, isLoading, error } = useGetTaskQuery(taskId, { skip: !open || !taskId });
  const { data: log = [], isLoading: logLoading } = useGetTaskLogQuery(taskId, {
    skip: !open || !taskId,
    refetchInterval: task?.status === 'in_progress' ? 3000 : false,
  });
  const { data: comments = [] } = useGetTaskCommentsQuery(taskId, { skip: !open || !taskId });
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [queueTask, { isLoading: isQueuing }] = useQueueTaskMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();

  const handleDeleteConfirm = async () => {
    try {
      await deleteTask(taskId).unwrap();
      setDeleteDialogOpen(false);
      showSnackbar({ message: 'Tarefa excluída', severity: 'success' });
      onClose?.();
    } catch (err) {
      showSnackbar({
        message: err?.data?.error ?? 'Falha ao excluir',
        severity: 'error',
      });
    }
  };

  const handleQueue = async () => {
    try {
      await queueTask(taskId).unwrap();
      showSnackbar({ message: 'Tarefa enfileirada', severity: 'success' });
      onClose?.();
    } catch (err) {
      showSnackbar({
        message: err?.data?.error ?? 'Falha ao enfileirar',
        severity: 'error',
      });
    }
  };

  const handleEdit = () => {
    if (task?.id) onEdit?.(task.id);
  };

  const handleAddComment = async () => {
    const content = newComment?.trim();
    if (!content) return;
    try {
      await addComment({ taskId, content }).unwrap();
      setNewComment('');
      showSnackbar({ message: 'Comentário adicionado', severity: 'success' });
    } catch (err) {
      showSnackbar({
        message: err?.data?.error ?? 'Falha ao adicionar comentário',
        severity: 'error',
      });
    }
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
              color={getStatusChipColor(task.status)}
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

        {Array.isArray(task.context) && task.context.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Contexto
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {task.context.map((ref, i) => (
                <Chip
                  key={i}
                  size="small"
                  variant="outlined"
                  label={
                    ref.type === 'file'
                      ? `@file ${ref.path}`
                      : ref.type === 'folder'
                        ? `@folder ${ref.path}`
                        : ref.type === 'codebase'
                          ? '@codebase'
                          : ref.type === 'git'
                            ? `@git ${ref.scope || 'working'}`
                            : ref.type === 'skill' || ref.type === 'rule'
                              ? '@skill/regras'
                              : ref.type === 'docs'
                                ? (ref.url ? `@docs ${ref.url}` : `@docs ${ref.path || ''}`)
                                : ref.type
                  }
                />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Progresso do agente
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              maxHeight: 320,
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
              <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'none' }}>
                {formatAgentLogEvents(log).map((item) => (
                  <Box
                    component="li"
                    key={item.id}
                    sx={{
                      py: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                      <Chip
                        label={item.label}
                        size="small"
                        variant="outlined"
                        color={item.severity === 'error' ? 'error' : item.severity === 'success' ? 'success' : 'default'}
                        sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                    <Typography
                      component="pre"
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: item.severity === 'error' ? 'error.main' : 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {item.content}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Comentários
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum comentário ainda.
              </Typography>
            ) : (
              comments.map((c) => (
                <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={c.author === 'agent' ? 'Agente' : 'Usuário'}
                      size="small"
                      variant="outlined"
                      color={c.author === 'agent' ? 'primary' : 'default'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {c.content}
                  </Typography>
                </Paper>
              ))
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'flex-start' }}>
            <TextField
              placeholder="Novo comentário..."
              multiline
              minRows={2}
              maxRows={4}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              size="small"
              fullWidth
              disabled={isAddingComment}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAddComment}
              disabled={!newComment?.trim() || isAddingComment}
            >
              {isAddingComment ? 'Enviando…' : 'Enviar'}
            </Button>
          </Box>
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
