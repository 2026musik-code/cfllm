import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Define the Cloudflare environment bindings
type Bindings = {
  userkey: KVNamespace // KV Namespace "userkey"
}

const app = new Hono<{ Bindings: Bindings }>()

// Allow CORS so the frontend can interact with this API
app.use('/*', cors())

// --- User Management API ---

// 1. Endpoint to get all saved users from KV
app.get('/api/users', async (c) => {
  try {
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
    
    return c.json({ success: true, user: newUser })
  } catch (error) {
    return c.json({ error: 'Failed to save user to KV' }, 500)
  }
})

// --- Script Generator API ---

// 3. Endpoint to save script temporarily in KV
app.post('/api/save-script', async (c) => {
  try {
    const { script } = await c.req.json()
    if (!script) {
      return c.json({ error: 'No script provided' }, 400)
    }
    
    const id = Math.random().toString(36).substring(2, 10)
    
    // Save script in KV with an expiration of 1 hour (3600 seconds)
    // We add a prefix 'script_' to separate it from other keys
    await c.env.userkey.put(`script_${id}`, script, { expirationTtl: 3600 })

    return c.json({ id })
  } catch (error) {
    return c.json({ error: 'Failed to save script' }, 500)
  }
})

// 4. Endpoint to download script
app.get('/api/script/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const script = await c.env.userkey.get(`script_${id}`)
    
    if (!script) {
      return new Response('Script not found or expired', { status: 404 })
    }
    
    return new Response(script, {
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 })
  }
})

// --- AI Proxy API ---

// 5. Proxy endpoint for Cloudflare AI API
app.post('/api/chat', async (c) => {
  try {
    const { messages, systemPrompt, accountId, token, modelId } = await c.req.json()
    
    if (!accountId || !token) {
      return c.json({ error: 'Missing Cloudflare credentials' }, 400)
    }

    const model = modelId || '@cf/meta/llama-3-8b-instruct'
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`

    const formattedMessages = []
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt })
    }
    if (messages && Array.isArray(messages)) {
      formattedMessages.push(...messages)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: formattedMessages
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return c.json({ error: 'Cloudflare API error', details: errorText }, response.status)
    }

    const data = await response.json()
    
    // Standardize response format with our local dev server
    return c.json({ response: data.result?.response || '' })
  } catch (error) {
    return c.json({ error: 'Failed to communicate with AI' }, 500)
  }
})

// For Hono running on Cloudflare Pages, serving static assets is handled automatically by the Pages build.
// If deployed as a standalone Worker, you would need to host the React dist/ folder somewhere.
// Typically for a full-stack React app, you'd deploy this as Cloudflare Pages with Hono handling the /api routes.

export default app
