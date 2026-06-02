import { useState, useEffect } from 'react'
import { getRecipes, getThisWeeksPlan, saveWeeklyPlan } from '../lib/airtable.js'

export default function WeeklyPlan() {
  const [allRecipes, setAllRecipes] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    async function load() {
      const [recipes, plan] = await Promise.all([getRecipes(), getThisWeeksPlan()])
      setAllRecipes(recipes)
      const ids = new Set(plan.flatMap(p => (Array.isArray(p.Recipes) ? p.Recipes : [])))
      setSelectedIds(ids)
      setLoading(false)
    }
    load()
  }, [])

  function toggle(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    await saveWeeklyPlan([...selectedIds])
    setSaving(false)
    setSaved(true)
    setShowPicker(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const planned = allRecipes.filter(r => selectedIds.has(r.id))

  const weekLabel = (() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(new Date().setDate(diff))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  })()

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>This Week</h1>
        <span className="badge">{weekLabel}</span>
      </div>

      {planned.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📅</div>
          <p>No meals planned yet.</p>
        </div>
      ) : (
        <div className="card">
          {planned.map(r => (
            <div key={r.id} className="plan-recipe">
              {r['Image URL'] ? (
                <img style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} src={r['Image URL']} alt="" onError={e => e.target.style.display='none'} />
              ) : (
                <span style={{ fontSize: '1.5rem' }}>🍽️</span>
              )}
              <span style={{ fontWeight: 500 }}>{r.Name}</span>
              <button className="remove-btn" onClick={() => toggle(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowPicker(true)}>
          + Add Recipes
        </button>
        <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Plan'}
        </button>
      </div>

      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>Choose recipes</h2>
            {allRecipes.map(r => (
              <label key={r.id} className="check-row" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggle(r.id)}
                />
                {r['Image URL'] ? (
                  <img style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} src={r['Image URL']} alt="" onError={e => e.target.style.display='none'} />
                ) : (
                  <span style={{ fontSize: '1.3rem' }}>🍽️</span>
                )}
                <span>{r.Name}</span>
              </label>
            ))}
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowPicker(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
