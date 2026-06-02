import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { getRecipes, createRecipe, createIngredient, getIngredients, getRatings, saveRating } from '../lib/airtable.js'

export default function RecipeLibrary({ user }) {
  return (
    <Routes>
      <Route index element={<LibraryList user={user} />} />
      <Route path=":id" element={<RecipeDetail user={user} />} />
    </Routes>
  )
}

// ── Library list ──────────────────────────────────────────────────────────────

function LibraryList({ user }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadRecipes()
  }, [])

  async function loadRecipes() {
    setLoading(true)
    try { setRecipes(await getRecipes()) } finally { setLoading(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Library</h1>
        <span className="badge">{user.Name}</span>
      </div>

      <button className="add-recipe-toggle" onClick={() => setShowAdd(s => !s)}>
        <span style={{ fontSize: '1.3rem' }}>+</span>
        {showAdd ? 'Cancel' : 'Add Recipe from URL'}
      </button>

      {showAdd && (
        <AddRecipeForm
          onSaved={(r) => { setRecipes(prev => [...prev, r]); setShowAdd(false) }}
        />
      )}

      {loading && <div className="loading"><div className="spinner" /></div>}

      {!loading && recipes.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📖</div>
          <p>No recipes yet. Add one above!</p>
        </div>
      )}

      {recipes.map(r => (
        <div key={r.id} className="card" onClick={() => navigate(`/library/${r.id}`)} style={{ cursor: 'pointer' }}>
          <RecipeRow recipe={r} />
        </div>
      ))}
    </div>
  )
}

function RecipeRow({ recipe }) {
  return (
    <div className="recipe-card">
      {recipe['Image URL'] ? (
        <img className="recipe-thumb" src={recipe['Image URL']} alt={recipe.Name} onError={e => e.target.style.display = 'none'} />
      ) : (
        <div className="recipe-thumb-placeholder">🍽️</div>
      )}
      <div className="recipe-meta">
        <div className="recipe-name">{recipe.Name}</div>
        {recipe['Source URL'] && (
          <div className="recipe-source">{new URL(recipe['Source URL']).hostname.replace('www.', '')}</div>
        )}
      </div>
    </div>
  )
}

// ── Add Recipe form ───────────────────────────────────────────────────────────

function AddRecipeForm({ onSaved }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle | fetching | saving | done
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setStatus('fetching')

    try {
      const res = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parse failed')

      setStatus('saving')
      const recipe = await createRecipe({
        name: data.name,
        sourceUrl: url,
        instructions: data.instructions,
        imageUrl: data.imageUrl,
      })

      await Promise.all((data.ingredients || []).map(ing =>
        createIngredient({
          recipeId: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category,
        })
      ))

      setStatus('done')
      onSaved(recipe)
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  const busy = status === 'fetching' || status === 'saving'

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Recipe URL</label>
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
          />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn-primary" type="submit" disabled={busy}>
          {status === 'fetching' ? 'Fetching recipe…' : status === 'saving' ? 'Saving…' : 'Import Recipe'}
        </button>
      </form>
    </div>
  )
}

// ── Recipe detail ─────────────────────────────────────────────────────────────

function RecipeDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('recipe') // recipe | rate

  useEffect(() => {
    async function load() {
      const [recipes, ings, rats] = await Promise.all([
        getRecipes(),
        getIngredients(id),
        getRatings(id),
      ])
      setRecipe(recipes.find(r => r.id === id))
      setIngredients(ings)
      setRatings(rats)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>
  if (!recipe) return <div className="page"><p>Recipe not found.</p></div>

  const steps = (recipe.Instructions || '').split('\n').filter(Boolean)
  const myRating = ratings.find(r => {
    const uid = Array.isArray(r.User) ? r.User[0] : r.User
    return uid === user.id
  })

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/library')}>← Library</button>

      {recipe['Image URL'] && (
        <img className="recipe-hero" src={recipe['Image URL']} alt={recipe.Name}
          onError={e => e.target.style.display = 'none'} />
      )}

      <h1 style={{ marginBottom: 4 }}>{recipe.Name}</h1>
      {recipe['Source URL'] && (
        <a href={recipe['Source URL']} target="_blank" rel="noreferrer"
          style={{ fontSize: '0.85rem', color: 'var(--green)', display: 'block', marginBottom: 16 }}>
          {new URL(recipe['Source URL']).hostname.replace('www.', '')} ↗
        </a>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={tab === 'recipe' ? 'btn-secondary' : 'btn-ghost'}
          onClick={() => setTab('recipe')}
          style={{ flex: 1 }}
        >Recipe</button>
        <button
          className={tab === 'rate' ? 'btn-secondary' : 'btn-ghost'}
          onClick={() => setTab('rate')}
          style={{ flex: 1 }}
        >Rate {myRating ? `(${myRating.Stars}★)` : ''}</button>
      </div>

      {tab === 'recipe' && (
        <>
          {ingredients.length > 0 && (
            <>
              <div className="section-title">Ingredients</div>
              {ingredients.map(ing => (
                <div key={ing.id} className="ingredient-row">
                  <span className="ingredient-qty">{[ing.Quantity, ing.Unit].filter(Boolean).join(' ')}</span>
                  <span>{ing['Ingredient Name']}</span>
                </div>
              ))}
            </>
          )}

          {steps.length > 0 && (
            <>
              <div className="section-title">Instructions</div>
              {steps.map((step, i) => (
                <div key={i} className="instruction-step">
                  <div className="step-num">{i + 1}</div>
                  <div>{step.replace(/^\d+\.\s*/, '')}</div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {tab === 'rate' && (
        <RateRecipe recipeId={id} userId={user.id} existing={myRating} ratings={ratings} />
      )}
    </div>
  )
}

// ── Rate Recipe ───────────────────────────────────────────────────────────────

function RateRecipe({ recipeId, userId, existing, ratings }) {
  const [stars, setStars] = useState(existing?.Stars || 0)
  const [comment, setComment] = useState(existing?.Comment || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await saveRating({ recipeId, userId, stars, comment })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const otherRatings = ratings.filter(r => {
    const uid = Array.isArray(r.User) ? r.User[0] : r.User
    return uid !== userId
  })

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Your rating</label>
          <div className="star-row">
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} onClick={() => setStars(n)} style={{ cursor: 'pointer' }}>
                {n <= stars ? '★' : '☆'}
              </span>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Comment</label>
          <textarea
            placeholder="What did you think?"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={saving || stars === 0}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Rating'}
        </button>
      </form>

      {otherRatings.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 24 }}>Other ratings</div>
          {otherRatings.map(r => (
            <div key={r.id} className="card" style={{ marginTop: 8 }}>
              <div className="stars">{'★'.repeat(r.Stars)}{'☆'.repeat(5 - r.Stars)}</div>
              {r.Comment && <p style={{ marginTop: 6, fontSize: '0.9rem' }}>{r.Comment}</p>}
            </div>
          ))}
        </>
      )}
    </>
  )
}
