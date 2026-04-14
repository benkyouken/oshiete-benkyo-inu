import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action } = req.body || {};

  // ログ取得
  if (action === 'getLogs') {
    try {
      const logs = await redis.get('qa-logs') || [];
      res.status(200).json({ logs });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // ログ保存
  if (action === 'saveLog') {
    try {
      const { entry } = req.body;
      const logs = await redis.get('qa-logs') || [];
      logs.unshift(entry);
      await redis.set('qa-logs', logs.slice(0, 200));
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // ログ更新
  if (action === 'updateLog') {
    try {
      const { id, patch } = req.body;
      const logs = await redis.get('qa-logs') || [];
      const idx = logs.findIndex(l => l.id === id);
      if (idx !== -1) logs[idx] = { ...logs[idx], ...patch };
      await redis.set('qa-logs', logs);
      res.status(200).json({ logs });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // Claude API呼び出し
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
