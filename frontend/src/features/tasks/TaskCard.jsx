import { Card, CardContent, Typography } from '@mui/material';

/**
 * Card de tarefa no board Kanban. Exibe título e opcionalmente data de atualização.
 */
function TaskCard({ task, onClick }) {
  return (
    <Card
      variant="outlined"
      sx={{
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
        mb: 1,
      }}
      onClick={() => onClick?.(task)}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight={500} noWrap title={task.title}>
          {task.title || '(Sem título)'}
        </Typography>
        {task.updated_at && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {new Date(task.updated_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default TaskCard;
