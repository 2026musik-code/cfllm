import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for scripts (for demo/stateless purposes)
  const scriptStore = new Map<string, string>();

  // Endpoint to save script
  app.post('/api/save-script', (req, res) => {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: 'No script provided' });
    const id = Math.random().toString(36).substring(2, 10);
    scriptStore.set(id, script);
    
    // Auto-cleanup after 1 hour to prevent memory leaks
    setTimeout(() => {
      scriptStore.delete(id);
    }, 60 * 60 * 1000);

    res.json({ id });
  });

  // Endpoint to download script
  app.get('/api/script/:id', (req, res) => {
    const script = scriptStore.get(req.params.id);
    if (!script) return res.status(404).send('Script not found or expired');
    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
  });

  // Simulate KV storage in memory for preview environment
  let usersStore: any[] = [];
  const usersFile = path.join(process.cwd(), 'users.json');
  if (fs.existsSync(usersFile)) {
    try {
      usersStore = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch (e) {
      console.error('Failed to parse users.json', e);
    }
  }

  let requestLogs: any[] = [];
  const logsFile = path.join(process.cwd(), 'logs.json');
  if (fs.existsSync(logsFile)) {
    try {
      requestLogs = JSON.parse(fs.readFileSync(logsFile, 'utf8'));
    } catch (e) {
      console.error('Failed to parse logs.json', e);
    }
  }

  // API Route to save user
  app.post('/api/users', express.json(), (req, res) => {
    const user = { ...req.body, requestCount: 0 };
    // Check if user already exists
    const existingIndex = usersStore.findIndex(u => u.accountId === user.accountId && u.apiToken === user.apiToken);
    if (existingIndex !== -1) {
      // Update existing user but keep request count
      usersStore[existingIndex] = { ...usersStore[existingIndex], ...user, requestCount: usersStore[existingIndex].requestCount || 0 };
    } else {
      usersStore = [user, ...usersStore];
    }
    fs.writeFileSync(usersFile, JSON.stringify(usersStore, null, 2));
    res.json({ success: true });
  });

  // API Route to get users
  app.get('/api/users', (req, res) => {
    res.json(usersStore);
  });

  // API Route to get logs
  app.get('/api/logs', (req, res) => {
    res.json(requestLogs.slice(0, 100)); // Return last 100 logs
  });

  // Proxy endpoint for Cloudflare AI
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemPrompt, accountId, token, modelId } = req.body;
      
      // Log request and update count
      if (accountId && token) {
        const userIndex = usersStore.findIndex(u => u.accountId === accountId && u.apiToken === token);
        if (userIndex !== -1) {
          usersStore[userIndex].requestCount = (usersStore[userIndex].requestCount || 0) + 1;
          fs.writeFileSync(usersFile, JSON.stringify(usersStore, null, 2));
        }

        requestLogs = [{
          time: new Date().toISOString(),
          accountId: accountId,
          model: modelId || '@cf/meta/llama-3.1-8b-instruct',
          messageCount: messages?.length || 0,
        }, ...requestLogs].slice(0, 500); // keep max 500 logs
        fs.writeFileSync(logsFile, JSON.stringify(requestLogs, null, 2));
      }

      if (!accountId || !token) {
        return res.status(400).json({ error: 'Missing Cloudflare credentials (accountId and token)' });
      }

      const cleanAccountId = accountId.trim().replace(/^["']|["']$/g, '');
      let cleanToken = token.trim().replace(/^["']|["']$/g, '');
      if (cleanToken.toLowerCase().startsWith('bearer ')) {
        cleanToken = cleanToken.substring(7).trim().replace(/^["']|["']$/g, '');
      }

      const model = modelId || '@cf/meta/llama-3-8b-instruct'; // Use provided model or default
      
      const url = `https://api.cloudflare.com/client/v4/accounts/${cleanAccountId}/ai/run/${model}`;

      const formattedMessages = [];
      if (systemPrompt) {
        formattedMessages.push({ role: 'system', content: systemPrompt });
      }
      
      if (messages && Array.isArray(messages)) {
        formattedMessages.push(...messages);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: formattedMessages })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudflare API Error:', response.status, errorText);
        return res.status(response.status).json({ error: 'Cloudflare API error' });
      }

      const data = await response.json();
      
      res.json({ response: data.result?.response || '' });
    } catch (error) {
      console.error('Server proxy error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
