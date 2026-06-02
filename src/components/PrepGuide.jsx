import { useState, useEffect } from 'react'
import { getThisWeeksPlan, getRecipes, getIngredients } from '../lib/airtable.js'

export default function PrepGuide() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [plan, allRecipes] = await Promise.all([getThisWeeksPlan(), getRecipes()])
      const plannedIds = plan.flatMap(p => (Array.isArray(p.Recipes) ? p.Recipes : []))
      const plannedRecipes = allRecipes.filter(r => plannedIds.includes(r.id))

      const results = await Promise.all(
        plannedRecipes.map(async r => {
          const ings = await getIngredients(r.Ingredients || [])
          return { recipe: r, ingredients: ings }
        })
      )
      setSections(results)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>

  if (sections.length === 0) return (
    <div className="page">
      <h1>Prep Guide</h1>
      <div className="empty">
        <div className="empty-icon">👨‍🍳</div>
        <p>No recipes planned this week.</p>
      </div>
    </div>
  )

  return (
    <div className="page">
      <h1>Prep Guide</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: '0.9rem' }}>
        Everything you need to prep for this week's meals.
      </p>

      {sections.map(({ recipe, ingredients }) => {
        const steps = (recipe.Instructions || '').split('\n').filter(Boolean)
        const prepSteps = steps.filter(s =>
          /chop|dice|mince|slice|marinate|soak|peel|trim|grate|crush|blend|mix|whisk|drain|rinse|thaw|defrost|prep|prepare|cut/i.test(s)
        )

        return (
          <div key={recipe.id} className="card prep-section" style={{ marginBottom: 16 }}>
            <h3>{recipe.Name}</h3>

            {ingredients.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 12 }}>Ingredients needed</div>
                <ul className="prep-steps">
                  {ingredients.map(ing => (
                    <li key={ing.id}>
                      {[ing.Quantity, ing.Unit, ing['Ingredient Name']].filter(Boolean).join(' ')}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {prepSteps.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 12 }}>Prep tasks</div>
                <ul className="prep-steps">
                  {prepSteps.map((s, i) => (
                    <li key={i}>{s.replace(/^\d+\.\s*/, '')}</li>
                  ))}
                </ul>
              </>
            )}

            {prepSteps.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 8 }}>
                No specific prep steps detected. Check the full instructions.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
