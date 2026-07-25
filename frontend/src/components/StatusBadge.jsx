const COLORS = {
  pending: '#a3853a',
  running: '#3a6ea3',
  success: '#2f8f4e',
  failed: '#b3423e',
};

export default function StatusBadge({ status }) {
  return (
    <span className="status-badge" style={{ backgroundColor: COLORS[status] || '#666' }}>
      {status}
    </span>
  );
}
