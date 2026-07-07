import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Define the Cloudflare environment bindings
type Bindings = {
  userkey: KVNamespace // The KV Namespace you mentioned
}

const app = new Hono<{ Bindings: Bindings }>()

// Allow CORS so the frontend can interact with this API
app.use('/*', cors())

// 1. Endpoint to get all saved users from KV
app.get('/api/users', async (c) => {
  try {
    // We are storing all users in a single KV key called "users_list" for simplicity
    // Alternatively, you can use the ID you mentioned to store specific data
    const usersStr = await c.env.userkey.get('users_list')
    const users = usersStr ? JSON.parse(usersStr) : []
    return c.json(users)
  } catch (error) {
    return c.json({ error: 'Failed to fetch users from KV' }, 500)
  }
})

// 2. Endpoint to save a new user to KV
app.post('/api/users', async (c) => {
  try {
    const newUser = await c.req.json()
    
    // Fetch existing
    const existingStr = await c.env.userkey.get('users_list')
    const existing = existingStr ? JSON.parse(existingStr) : []
    
    // Add new user
    const updatedUsers = [newUser, ...existing]
    
    // Save back to KV
    await c.env.userkey.put('users_list', JSON.stringify(updatedUsers))
    
    // If you specifically want to store using the ID you provided:
    // await c.env.userkey.put('324786888f8a40318c2489d755443036', JSON.stringify(newUser))

    return c.json({ success: true, user: newUser })
  } catch (error) {
    return c.json({ error: 'Failed to save user to KV' }, 500)
  }
})

// 3. Proxy endpoint for Cloudflare AI API
app.post('/api/chat', async (c) => {
  try {
    const { messages, systemPrompt, accountId, token, modelId } = await c.req.json()
    
    if (!accountId || !token) {
      return c.json({ error: 'Missing Cloudflare credentials' }, 400)
    }

    const model = modelId || '@cf/meta/llama-3-8b-instruct'
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
          ...messages
        ]
      })
    })

    const data = await response.json()
    return c.json(data)
  } catch (error) {
    return c.json({ error: 'Failed to communicate with AI' }, 500)
  }
})

export default app
