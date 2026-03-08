import {
  Box,
  TextField,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from '../../app/SnackbarContext';
import { getStatusLabel, STATUS_OPTIONS } from './statusLabels';
import { useTaskForm } from './useTaskForm';

/**
 * Formulário de criar/editar tarefa em overlay (modal). Usado no board Kanban.
 * taskId = null para criar; initialStatus = status da coluna ao clicar "Adicionar card".
 */
function TaskFormOverlay({ open, taskId, initialStatus = 'open', onClose, onSuccess }) {
  const { showSnackbar } = useSnackbar();
  const {
    title,
    setTitle,
    status,
    setStatus,
    body,
    setBody,
    handleSubmit,
    isSubmitting,
    isLoadingTask,
    isEdit,
  } = useTaskForm({ taskId, initialStatus, open });

  const onFormSubmit = async (e) => {
    try {
      await handleSubmit(e);
      showSnackbar({ message: isEdit ? 'Tarefa atualizada' : 'Tarefa criada', severity: 'success' });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      showSnackbar({
        message: err?.data?.error ?? 'Falha ao salvar',
        severity: 'error',
      });
    }
  };

  const bodyContent = () => {
    if (isEdit && isLoadingTask) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <form onSubmit={onFormSubmit} id="task-form-overlay">
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
          <InputLabel id="task-form-status-label">Status</InputLabel>
          <Select
            labelId="task-form-status-label"
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
          rows={10}
          margin="normal"
          placeholder="Conteúdo da tarefa em Markdown..."
        />
      </form>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {isEdit ? 'Editar tarefa' : `Nova tarefa · ${getStatusLabel(initialStatus)}`}
        <IconButton aria-label="Fechar" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {bodyContent()}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="task-form-overlay" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskFormOverlay;
