import { useState, useEffect } from 'react'
import { getThisWeeksPlan, getRecipes, getIngredientsByRecipes } from '../lib/airtable.js'

export default function GroceryList() {
  const [grouped, setGrouped] = useState({})
  const [checked, setChecked] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [plan, allRecipes] = await Promise.all([getThisWeeksPlan(), getRecipes()])
      const plannedRecipeIds = plan.flatMap(p => (Array.isArray(p.Recipes) ? p.Recipes : []))
      const plannedRecipes = allRecipes.filter(r => plannedRecipeIds.includes(r.id))
      const ingredientIds = plannedRecipes.flatMap(r => r.Ingredients || [])
      const ingredients = await getIngredientsByRecipes(ingredientIds)

      const groups = {}
      for (const ing of ingredients) {
        const cat = ing['Grocery Category'] || 'Other'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(ing)
      }
      // Sort categories alphabetically, Other last
      const sorted = Object.fromEntries(
        Object.entries(groups).sort(([a], [b]) => {
          if (a === 'Other') return 1
          if (b === 'Other') return -1
          return a.localeCompare(b)
        })
      )
      setGrouped(sorted)
      setLoading(false)
    }
    load()
  }, [])

  function toggleItem(id) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalItems = Object.values(grouped).flat().length
  const checkedCount = checked.size

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>

  if (totalItems === 0) return (
    <div className="page">
      <h1>Grocery List</h1>
      <div className="empty">
        <div className="empty-icon">🛒</div>
        <p>No ingredients yet. Plan some recipes first!</p>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1>Grocery List</h1>
        <span className="badge">{checkedCount}/{totalItems}</span>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="grocery-category">
          <h3>{category}</h3>
          {items.map(ing => (
            <div
              key={ing.id}
              className={`grocery-item${checked.has(ing.id) ? ' checked' : ''}`}
              onClick={() => toggleItem(ing.id)}
            >
              <input
                type="checkbox"
                checked={checked.has(ing.id)}
                onChange={() => toggleItem(ing.id)}
                onClick={e => e.stopPropagation()}
              />
              <span>
                {[ing.Quantity, ing.Unit].filter(Boolean).join(' ')}{' '}
                {ing['Ingredient Name']}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
