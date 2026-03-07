import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { useGetTaskQuery, useDeleteTaskMutation, useQueueTaskMutation } from '../../app/api/tasksApi';
import { getStatusLabel } from './statusLabels';

function TaskDetail({ onSnackbar }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: task, isLoading, error } = useGetTaskQuery(id);
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [queueTask, { isLoading: isQueuing }] = useQueueTaskMutation();

  const handleDeleteConfirm = async () => {
    try {
      await deleteTask(id).unwrap();
      setDeleteDialogOpen(false);
      onSnackbar?.({ message: 'Tarefa excluída', severity: 'success' });
      navigate('/');
    } catch (err) {
      onSnackbar?.({
        message: err?.data?.error ?? 'Falha ao excluir',
        severity: 'error',
      });
    }
  };

  const handleQueue = async () => {
    try {
      await queueTask(id).unwrap();
      onSnackbar?.({ message: 'Tarefa enfileirada', severity: 'success' });
    } catch (err) {
      onSnackbar?.({
        message: err?.data?.error ?? 'Falha ao enfileirar',
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !task) {
    return (
      <Alert severity="error">
        {error?.data?.error ?? 'Tarefa não encontrada'}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBackIcon />}
          size="small"
        >
          Voltar
        </Button>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
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
                    : 'default'
            }
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {task.status === 'open' && (
            <Button
              variant="contained"
              startIcon={<PlaylistAddIcon />}
              onClick={handleQueue}
              disabled={isQueuing}
            >
              {isQueuing ? 'Enfileirando…' : 'Enfileirar'}
            </Button>
          )}
          <Button
            variant="outlined"
            component={Link}
            to={`/tasks/${id}/edit`}
            startIcon={<EditIcon />}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Excluir
          </Button>
        </Box>
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography component="div" sx={{ '& p': { mb: 1 }, '& ul, & ol': { pl: 2 } }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {task.body || '(sem conteúdo)'}
          </ReactMarkdown>
        </Typography>
      </Paper>

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
}

export default TaskDetail;
