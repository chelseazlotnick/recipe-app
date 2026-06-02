import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { url } = await req.json()
  if (!url) {
    return new Response(JSON.stringify({ error: 'URL required' }), { status: 400 })
  }

  // Fetch the page HTML
  let html
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)' },
    })
    html = await res.text()
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Could not fetch that URL' }), { status: 422 })
  }

  // Strip heavy markup to stay within token limits
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 30000)

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from the following webpage text and return ONLY valid JSON with no markdown or explanation.

JSON shape:
{
  "name": "Recipe Name",
  "imageUrl": "https://...",
  "instructions": "Step 1: ...\nStep 2: ...",
  "ingredients": [
    { "name": "flour", "quantity": "2", "unit": "cups", "category": "Dry Goods" }
  ]
}

Use these grocery categories: Produce, Meat & Seafood, Dairy & Eggs, Dry Goods, Canned & Jarred, Frozen, Bakery, Condiments & Sauces, Spices & Herbs, Beverages, Other.

If a field is unknown use an empty string. Instructions should be a single string with steps separated by newlines.

Webpage text:
${stripped}`,
      },
    ],
  })

  let parsed
  try {
    const text = message.content[0].text.trim()
    // Strip any accidental ```json fencing
    const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(jsonStr)
  } catch {
    return new Response(JSON.stringify({ error: 'Claude returned unparseable data' }), { status: 500 })
  }

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/parse-recipe' }
