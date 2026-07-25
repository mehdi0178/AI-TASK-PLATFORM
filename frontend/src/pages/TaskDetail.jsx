import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATES = ['success', 'failed'];

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let interval;

    const fetchTask = async () => {
      try {
        const { data } = await api.get(`/tasks/${id}`);
        setTask(data);
        if (TERMINAL_STATES.includes(data.status)) {
          clearInterval(interval);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load task');
        clearInterval(interval);
      }
    };

    fetchTask();
    interval = setInterval(fetchTask, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id]);

  if (error) return <p className="error-text">{error}</p>;
  if (!task) return <p className="muted">Loading...</p>;

  return (
    <div className="card task-detail">
      <Link to="/" className="back-link">
        &larr; Back to tasks
      </Link>
      <h1>{task.title}</h1>
      <p>
        Operation: <strong>{task.operation}</strong> &nbsp; Status: <StatusBadge status={task.status} />
      </p>

      <h3>Input</h3>
      <pre className="text-block">{task.inputText}</pre>

      <h3>Result</h3>
      <pre className="text-block">{task.result ?? '(not yet available)'}</pre>

      <h3>Execution logs</h3>
      <ul className="log-list">
        {task.logs.map((log, idx) => (
          <li key={idx}>{log}</li>
        ))}
      </ul>
    </div>
  );
}
