import { Redis } from '@upstash/redis';
import { Resend } from 'resend';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action } = req.body || {};

  if (action === 'getLogs') {
    try {
      const logs = await redis.get('qa-logs') || [];
      res.status(200).json({ logs });
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

  if (action === 'saveLog') {
    try {
      const { entry } = req.body;
      const logs = await redis.get('qa-logs') || [];
      logs.unshift(entry);
      await redis.set('qa-logs', logs.slice(0, 200));

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: process.env.NOTIFY_EMAIL,
        subject: `【教えて！勉強犬】${entry.grade}・${entry.subject}の質問が届きました`,
        html: `
          <h2>新しい質問が届きました🐶</h2>
          <p><strong>生徒名：</strong>${entry.studentName || '（未入力）'}</p>
          <p><strong>学年：</strong>${entry.grade}</p>
          <p><strong>科目：</strong>${entry.subject}</p>
          <p><strong>質問：</strong>${entry.question || '（画像のみ）'}</p>
          <p><strong>時間：</strong>${entry.time}</p>
          <hr>
          <p><strong>AIの回答：</strong></p>
          <p>${entry.answer ? entry.answer.substring(0, 300) : ''}...</p>
          <hr>
          <p><a href="https://oshiete-benkyo-inu-2.vercel.app">先生用ダッシュボードを開く</a></p>
        `
      });

      res.status(200).json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

  if (action === 'updateLog') {
    try {
      const { id, patch } = req.body;
      const logs = await redis.get('qa-logs') || [];
      const idx = logs.findIndex(l => l.id === id);
      if (idx !== -1) logs[idx] = { ...logs[idx], ...patch };
      await redis.set('qa-logs', logs);
      res.status(200).json({ logs });
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

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
  } catch (e) { res.status(500).json({ error: e.message }); }
}
