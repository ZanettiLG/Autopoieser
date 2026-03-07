import { Box, Typography, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useDroppable } from '@dnd-kit/core';
import DraggableCard from './DraggableCard';
import { getStatusLabel } from './statusLabels';

/**
 * Coluna do board Kanban: título do status, lista de cards (droppable) e botão "Adicionar card".
 */
function Column({ status, tasks, onAddCard, onCardClick }) {
  const label = getStatusLabel(status);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <Paper
      variant="outlined"
      sx={{
        minWidth: 280,
        maxWidth: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'hidden',
        bgcolor: isOver ? 'action.hover' : undefined,
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
        </Typography>
      </Box>
      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          minHeight: 40,
        }}
      >
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} onCardClick={onCardClick} />
        ))}
      </Box>
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onAddCard?.(status)}
          sx={{ justifyContent: 'flex-start' }}
        >
          Adicionar card
        </Button>
      </Box>
    </Paper>
  );
}

export default Column;
