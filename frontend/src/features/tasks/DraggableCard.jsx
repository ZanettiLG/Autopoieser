import { useDraggable } from '@dnd-kit/core';
import { Box } from '@mui/material';
import TaskCard from './TaskCard';

/**
 * Envolve TaskCard com useDraggable para arrastar entre colunas no board.
 */
function DraggableCard({ task, onCardClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        mb: 1,
      }}
    >
      <TaskCard task={task} onClick={onCardClick} />
    </Box>
  );
}

export default DraggableCard;
