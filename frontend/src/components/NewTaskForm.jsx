import { useState } from 'react';
import { api } from '../api';

const OPERATIONS = [
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'reverse', label: 'Reverse String' },
  { value: 'word_count', label: 'Word Count' },
];

export default function NewTaskForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operation, setOperation] = useState(OPERATIONS[0].value);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/tasks', { title, inputText, operation });
      setTitle('');
      setInputText('');
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card new-task-form" onSubmit={handleSubmit}>
      <h2>New task</h2>
      {error && <p className="error-text">{error}</p>}
      <label>
        Task title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Input text
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={4}
          required
        />
      </label>
      <label>
        Operation
        <select value={operation} onChange={(e) => setOperation(e.target.value)}>
          {OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Running...' : 'Run Task'}
      </button>
    </form>
  );
}
