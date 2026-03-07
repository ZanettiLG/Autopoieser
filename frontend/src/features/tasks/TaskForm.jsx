import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from '../../app/api/tasksApi';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Aberta' },
  { value: 'queued', label: 'Na fila' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'done', label: 'Concluída' },
  { value: 'rejected', label: 'Rejeitada' },
];

function TaskForm({ onSnackbar }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('open');
  const [body, setBody] = useState('');

  const { data: task, isLoading: loadingTask } = useGetTaskQuery(id, {
    skip: !isEdit,
  });
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();

  useEffect(() => {
    if (task) {
      setTitle(task.title ?? '');
      setStatus(task.status ?? 'open');
      setBody(task.body ?? '');
    }
  }, [task]);

  const isSubmitting = isCreating || isUpdating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { title: title.trim(), status, body };
    try {
      if (isEdit) {
        await updateTask({ id: Number(id), ...payload }).unwrap();
        onSnackbar?.({ message: 'Tarefa atualizada', severity: 'success' });
      } else {
        await createTask(payload).unwrap();
        onSnackbar?.({ message: 'Tarefa criada', severity: 'success' });
      }
      navigate('/');
    } catch (err) {
      onSnackbar?.({
        message: err?.data?.error ?? 'Falha ao salvar',
        severity: 'error',
      });
    }
  };

  if (isEdit && loadingTask) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ mb: 2 }}>
        <Button
          component={Link}
          to={isEdit ? `/tasks/${id}` : '/'}
          startIcon={<ArrowBackIcon />}
          size="small"
        >
          Voltar
        </Button>
      </Box>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          margin="normal"
          placeholder="Título da tarefa"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel id="task-status-label">Status</InputLabel>
          <Select
            labelId="task-status-label"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Conteúdo (Markdown)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          rows={12}
          margin="normal"
          placeholder="Conteúdo da tarefa em Markdown..."
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button component={Link} to={isEdit ? `/tasks/${id}` : '/'}>
            Cancelar
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default TaskForm;
