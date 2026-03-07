import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Snackbar, Alert } from '@mui/material';
import { io } from 'socket.io-client';
import { tasksApi } from './app/api/tasksApi';
import Board from './features/tasks/Board';

function BoardWithDeepLink({ onSnackbar }) {
  const { id } = useParams();
  return <Board onSnackbar={onSnackbar} openTaskId={id} />;
}

function App() {
  const dispatch = useDispatch();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const socket = io(window.location.origin, { path: '/socket.io' });
    socket.on('task:updated', (data) => {
      if (data?.id != null) {
        dispatch(
          tasksApi.util.invalidateTags([
            { type: 'Task', id: data.id },
            { type: 'TaskList', id: 'LIST' },
            { type: 'TaskComments', id: data.id },
          ])
        );
      }
    });
    socket.on('task:deleted', (data) => {
      if (data?.id != null) {
        dispatch(
          tasksApi.util.invalidateTags([
            { type: 'Task', id: data.id },
            { type: 'TaskList', id: 'LIST' },
          ])
        );
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

  const showSnackbar = useCallback(({ message, severity = 'info' }) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((s) => ({ ...s, open: false }));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Board onSnackbar={showSnackbar} />} />
        <Route path="/tasks/:id" element={<BoardWithDeepLink onSnackbar={showSnackbar} />} />
      </Routes>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </BrowserRouter>
  );
}

export default App;
