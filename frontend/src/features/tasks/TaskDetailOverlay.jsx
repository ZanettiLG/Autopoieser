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
import { getStatusLabel } from './statusLabels';

const MAX_PREVIEW_LEN = 200;

/**
 * Converte eventos brutos do log do agente em itens de exibição (label + conteúdo resumido).
 * Agrupa deltas de "thinking" em um único bloco e formata eventos "done" por result.type.
 */
function formatAgentLogEvents(events) {
  const items = [];
  let thinkingBuf = [];
  let idx = 0;

  function flushThinking() {
    if (thinkingBuf.length === 0) return;
    const text = thinkingBuf.map((e) => e.result?.text ?? '').join('').trim();
    thinkingBuf = [];
    if (text) {
      items.push({
        id: `thinking-${idx++}`,
        kind: 'thinking',
        label: 'Pensando',
        content: text.length > MAX_PREVIEW_LEN ? `${text.slice(0, MAX_PREVIEW_LEN)}…` : text,
        severity: 'info',
      });
    }
  }

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    if (ev.type === 'worker_start') {
      flushThinking();
      items.push({ id: `wstart-${idx++}`, kind: 'worker', label: 'Worker', content: 'Iniciou a tarefa.', severity: 'info' });
      continue;
    }
    if (ev.type === 'worker_end') {
      flushThinking();
      const duration = ev.durationMs != null ? ` (${(ev.durationMs / 1000).toFixed(1)}s)` : '';
      items.push({ id: `wend-${idx++}`, kind: 'worker', label: 'Worker', content: `Finalizou.${duration}`, severity: 'success' });
      continue;
    }
    if (ev.type === 'started') {
      flushThinking();
      items.push({ id: `started-${idx++}`, kind: 'agent', label: 'Agente', content: ev.text || 'Iniciou.', severity: 'info' });
      continue;
    }
    if (ev.type === 'error') {
      flushThinking();
      const text = [ev.text, ev.stack].filter(Boolean).join('\n');
      const content = text.length > MAX_PREVIEW_LEN ? `${text.slice(0, MAX_PREVIEW_LEN)}…` : text;
      items.push({ id: `err-${idx++}`, kind: 'error', label: 'Erro', content: content || 'Erro desconhecido', severity: 'error' });
      continue;
    }
    if (ev.type === 'chunk') {
      flushThinking();
      const text = (ev.text ?? '').trim();
      if (text) items.push({ id: `chunk-${idx++}`, kind: 'chunk', label: 'Saída', content: text.length > MAX_PREVIEW_LEN ? `${text.slice(0, MAX_PREVIEW_LEN)}…` : text, severity: 'info' });
      continue;
    }
    if (ev.type === 'done') {
      const r = ev.result;
      if (r && typeof r === 'object') {
        if (r.type === 'thinking') {
          if (r.subtype === 'delta' && r.text != null) {
            thinkingBuf.push(ev);
            continue;
          }
          if (r.subtype === 'completed') {
            flushThinking();
            items.push({ id: `think-done-${idx++}`, kind: 'thinking', label: 'Pensando', content: 'Concluído.', severity: 'info' });
            continue;
          }
        }
        flushThinking();

        if (r.type === 'system') {
          items.push({ id: `sys-${idx++}`, kind: 'system', label: 'Sistema', content: r.subtype || 'init', severity: 'info' });
          continue;
        }
        if (r.type === 'user') {
          const msg = r.message?.content;
          const str = Array.isArray(msg) ? msg.map((c) => (c?.text ?? '')).join('') : (msg?.text ?? JSON.stringify(msg ?? ''));
          const content = str.length > MAX_PREVIEW_LEN ? `${str.slice(0, MAX_PREVIEW_LEN)}…` : str;
          items.push({ id: `user-${idx++}`, kind: 'user', label: 'Usuário', content: content || '—', severity: 'info' });
          continue;
        }
        if (r.type === 'assistant') {
          const msg = r.message?.content;
          const str = Array.isArray(msg) ? msg.map((c) => (c?.text ?? '')).join('') : (msg?.text ?? JSON.stringify(msg ?? ''));
          const content = str.length > MAX_PREVIEW_LEN ? `${str.slice(0, MAX_PREVIEW_LEN)}…` : str;
          items.push({ id: `assist-${idx++}`, kind: 'assistant', label: 'Resposta', content: content || '—', severity: 'info' });
          continue;
        }
        if (r.type === 'tool_call') {
          const sub = r.subtype === 'completed' ? 'concluída' : 'em execução';
          const tc = r.tool_call?.tool_call ?? r.tool_call;
          const name = tc?.readToolCall ? 'read' : tc?.grepToolCall ? 'grep' : tc?.editToolCall ? 'edit' : Object.keys(tc || {})[0] || 'ferramenta';
          items.push({ id: `tool-${idx++}`, kind: 'tool', label: 'Ferramenta', content: `${name}: ${sub}`, severity: 'info' });
          continue;
        }
        items.push({ id: `done-${idx++}`, kind: 'done', label: r.type || 'done', content: r.subtype ? `${r.subtype}` : '—', severity: 'info' });
      } else {
        flushThinking();
        items.push({ id: `done-${idx++}`, kind: 'done', label: 'Concluído', content: '—', severity: 'info' });
      }
      continue;
    }
    flushThinking();
    items.push({ id: `raw-${idx++}`, kind: 'raw', label: ev.type, content: JSON.stringify(ev).slice(0, MAX_PREVIEW_LEN) + (JSON.stringify(ev).length > MAX_PREVIEW_LEN ? '…' : ''), severity: 'info' });
  }
  flushThinking();
  return items;
}

/**
 * Detalhe da tarefa em overlay (drawer). Usado no board Kanban.
 * Recebe taskId, onClose, onSnackbar e onEdit(taskId) para abrir o formulário de edição.
 */
function TaskDetailOverlay({ taskId, open, onClose, onEdit, onSnackbar }) {
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

  const handleAddComment = async () => {
    const content = newComment?.trim();
    if (!content) return;
    try {
      await addComment({ taskId, content }).unwrap();
      setNewComment('');
      onSnackbar?.({ message: 'Comentário adicionado', severity: 'success' });
    } catch (err) {
      onSnackbar?.({
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
