import Airtable from 'airtable'

const base = new Airtable({ apiKey: import.meta.env.VITE_AIRTABLE_API_KEY })
  .base(import.meta.env.VITE_AIRTABLE_BASE_ID)

// ── helpers ──────────────────────────────────────────────────────────────────

function fields(record) {
  return { id: record.id, ...record.fields }
}

async function all(table, opts = {}) {
  return new Promise((resolve, reject) => {
    const records = []
    base(table).select(opts).eachPage(
      (page, next) => { page.forEach(r => records.push(fields(r))); next() },
      err => err ? reject(err) : resolve(records)
    )
  })
}

async function create(table, data) {
  const record = await base(table).create(data)
  return fields(record)
}

async function update(table, id, data) {
  const record = await base(table).update(id, data)
  return fields(record)
}

async function destroy(table, id) {
  return base(table).destroy(id)
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUsers() {
  return all('Users')
}

// ── Recipes ───────────────────────────────────────────────────────────────────

export async function getRecipes() {
  return all('Recipes', { sort: [{ field: 'Name', direction: 'asc' }] })
}

export async function createRecipe(data) {
  return create('Recipes', {
    Name: data.name,
    'Source URL': data.sourceUrl,
    Instructions: data.instructions,
    'Image URL': data.imageUrl || '',
  })
}

// ── Ingredients ───────────────────────────────────────────────────────────────

// ingredientIds comes from the recipe's linked `Ingredients` field
export async function getIngredients(ingredientIds) {
  if (!ingredientIds || !ingredientIds.length) return []
  const formula = `OR(${ingredientIds.map(id => `RECORD_ID()="${id}"`).join(',')})`
  return all('Ingredients', { filterByFormula: formula })
}

export async function getIngredientsByRecipes(ingredientIds) {
  if (!ingredientIds || !ingredientIds.length) return []
  const formula = `OR(${ingredientIds.map(id => `RECORD_ID()="${id}"`).join(',')})`
  return all('Ingredients', { filterByFormula: formula })
}

export async function createIngredient(data) {
  return create('Ingredients', {
    Recipe: [data.recipeId],
    'Ingredient Name': data.name,
    Quantity: data.quantity,
    Unit: data.unit,
    'Grocery Category': data.category,
  })
}

// ── Weekly Plan ───────────────────────────────────────────────────────────────

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export async function getThisWeeksPlan() {
  const weekStart = getWeekStart()
  const records = await all('Weekly Plan', {
    filterByFormula: `IS_SAME({Week Start Date}, "${weekStart}", "day")`,
  })
  return records
}

export async function saveWeeklyPlan(recipeIds) {
  const weekStart = getWeekStart()

  // Remove existing entries for this week
  const existing = await getThisWeeksPlan()
  await Promise.all(existing.map(r => destroy('Weekly Plan', r.id)))

  // Create new entries (one record per recipe)
  await Promise.all(recipeIds.map(id =>
    create('Weekly Plan', {
      Recipes: [id],
      'Week Start Date': weekStart,
    })
  ))
}

// ── Ratings ───────────────────────────────────────────────────────────────────

export async function getRatings(recipeId) {
  return all('Ratings', {
    filterByFormula: `FIND("${recipeId}", ARRAYJOIN({Recipe}))`,
  })
}

export async function saveRating(data) {
  // Check for existing rating by this user for this recipe
  const existing = await all('Ratings', {
    filterByFormula: `AND(FIND("${data.recipeId}", ARRAYJOIN({Recipe})), FIND("${data.userId}", ARRAYJOIN({User})))`,
  })

  if (existing.length) {
    return update('Ratings', existing[0].id, {
      Stars: data.stars,
      Comment: data.comment,
    })
  }

  return create('Ratings', {
    Recipe: [data.recipeId],
    User: [data.userId],
    Stars: data.stars,
    Comment: data.comment,
  })
}
