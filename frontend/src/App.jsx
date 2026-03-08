import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { tasksApi } from './app/api/tasksApi';
import Board from './features/tasks/Board';

function BoardWithDeepLink() {
  const { id } = useParams();
  return <Board openTaskId={id} />;
}

function App() {
  const dispatch = useDispatch();

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/tasks/:id" element={<BoardWithDeepLink />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
