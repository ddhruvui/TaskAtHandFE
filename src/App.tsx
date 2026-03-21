import { useState } from 'react'
import { TodoCard } from './components/TodoCard'
import { ConfirmModal } from './components/ConfirmModal'
import type { Todo } from './components/TodoCard'
import './App.css'

const initialTodos: Todo[] = [
  {
    id: '1',
    name: 'Design landing page',
    notes: 'Use the new brand colours and ensure mobile responsiveness.',
    done: false,
    priority: 2,
    createdAt: '2026-03-15T09:00:00Z',
    updatedAt: '2026-03-20T14:30:00Z',
    ecd: '2026-03-28T00:00:00Z',
  },
  {
    id: '2',
    name: 'Set up CI/CD pipeline',
    notes: '',
    done: true,
    priority: 1,
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-18T11:00:00Z',
    ecd: '2026-03-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'Write unit tests for auth module',
    notes: 'Cover login, signup, and token refresh flows.',
    done: false,
    priority: 3,
    createdAt: '2026-03-19T10:00:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
    ecd: '2026-04-01T00:00:00Z',
  },
]

function App() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const todoToDelete = deleteId ? todos.find((t) => t.id === deleteId) : null

  const handleToggleDone = (id: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done, updatedAt: new Date().toISOString() } : t,
      ),
    )
  }

  const handleNotesChange = (id: string, notes: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, notes, updatedAt: new Date().toISOString() } : t,
      ),
    )
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = () => {
    if (deleteId) {
      setTodos((prev) => prev.filter((t) => t.id !== deleteId))
      setDeleteId(null)
    }
  }

  const handlePriorityChange = (id: string, direction: 'up' | 'down') => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const next = direction === 'up' ? t.priority - 1 : t.priority + 1
        if (next < 1 || next > 5) return t
        return { ...t, priority: next, updatedAt: new Date().toISOString() }
      }),
    )
  }

  return (
    <div className="app-container">
      <h1>Task At Hand</h1>
      <div className="todo-grid">
        {todos.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            onToggleDone={handleToggleDone}
            onNotesChange={handleNotesChange}
            onPriorityChange={handlePriorityChange}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {todoToDelete && (
        <ConfirmModal
          message={`Delete "${todoToDelete.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}

export default App
