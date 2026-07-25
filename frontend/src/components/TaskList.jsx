import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function TaskList({ tasks }) {
  if (!tasks.length) {
    return <p className="muted">No tasks yet. Create one to get started.</p>;
  }

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Operation</th>
          <th>Status</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task._id}>
            <td>{task.title}</td>
            <td>{task.operation}</td>
            <td>
              <StatusBadge status={task.status} />
            </td>
            <td>{new Date(task.createdAt).toLocaleString()}</td>
            <td>
              <Link to={`/tasks/${task._id}`}>View</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
