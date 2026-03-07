import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetTasksQuery } from '../../app/api/tasksApi';
import { getStatusLabel } from './statusLabels';

function TaskList() {
  const { data: tasks, isLoading, error } = useGetTasksQuery();

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
          <Button
            color="inherit"
            component={Link}
            to="/tasks/new"
            startIcon={<AddIcon />}
          >
            Nova tarefa
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2, maxWidth: 720, mx: 'auto' }}>
        {!tasks?.length ? (
          <Typography color="text.secondary">
            Nenhuma tarefa. Clique em &quot;Nova tarefa&quot;.
          </Typography>
        ) : (
          <List disablePadding>
            {tasks.map((task) => (
              <ListItem key={task.id} disablePadding divider>
                <ListItemButton component={Link} to={`/tasks/${task.id}`}>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      task.updated_at
                        ? new Date(task.updated_at).toLocaleString('pt-BR')
                        : null
                    }
                  />
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
                    sx={{ ml: 1 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </>
  );
}

export default TaskList;
