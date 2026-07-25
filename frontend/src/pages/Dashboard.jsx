import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import NewTaskForm from '../components/NewTaskForm';
import TaskList from '../components/TaskList';

const POLL_INTERVAL_MS = 4000;

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks');
      setTasks(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // Poll for status updates rather than adding websockets, since the
    // assignment's workflow is short-lived string operations, not
    // long-running jobs that would justify push updates.
    const interval = setInterval(fetchTasks, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleCreated = (task) => {
    setTasks((prev) => [task, ...prev]);
  };

  return (
    <div className="dashboard">
      <NewTaskForm onCreated={handleCreated} />
      <div className="card task-list-card">
        <h2>Your tasks</h2>
        {error && <p className="error-text">{error}</p>}
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
}
