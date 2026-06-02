import { useState, useEffect } from 'react'
import { getUsers } from '../lib/airtable.js'

export default function UserSelect({ onSelect }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setError('Could not load users from Airtable. Check your API key and table setup.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="user-select-screen">
      <div>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🍳</div>
        <h1>Recipe App</h1>
        <p>Who's cooking today?</p>
      </div>

      {loading && <div className="spinner" />}

      {error && <p style={{ color: '#b91c1c', fontSize: '0.9rem', maxWidth: 300 }}>{error}</p>}

      {!loading && !error && (
        <div className="user-buttons">
          {users.map(u => (
            <button key={u.id} className="user-btn" onClick={() => onSelect(u)}>
              {u.Name}
            </button>
          ))}
          {users.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              No users found. Add users to the Users table in Airtable.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
