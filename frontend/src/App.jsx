import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import Board from './features/tasks/Board';

function BoardWithDeepLink({ onSnackbar }) {
  const { id } = useParams();
  return <Board onSnackbar={onSnackbar} openTaskId={id} />;
}

function App() {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

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
