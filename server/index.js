const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// OpenRouter client
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------- rate limits ----------
const LIMITS = {
  perIpWindowMs: 60 * 1000,  // 1 minute
  perIpMax: 10,              // 10 requests per minute per IP
  dailyGlobalMax: 1000       // total per day
};

let dailyCount = 0;
const ipHits = new Map();

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim() || req.socket.remoteAddress || 'unknown';
}

function rateLimit(req, res, next) {
  if (dailyCount >= LIMITS.dailyGlobalMax) {
    return res.status(429).json({ error: 'Daily limit reached. Please try again tomorrow.' });
  }

  const now = Date.now();
  const ip = clientIp(req);
  const rec = ipHits.get(ip) || { count: 0, resetAt: now + LIMITS.perIpWindowMs };

  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + LIMITS.perIpWindowMs;
  }

  if (rec.count >= LIMITS.perIpMax) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  rec.count += 1;
  ipHits.set(ip, rec);
  dailyCount += 1;
  next();
}

// reset global counter at local midnight
function msUntilMidnight() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime() - Date.now();
}
setTimeout(() => {
  dailyCount = 0;
  setInterval(() => { dailyCount = 0; }, 24 * 60 * 60 * 1000);
}, msUntilMidnight());

// ---------- helpers ----------
function cleanCommand(text = "") {
  let t = String(text).trim();
  t = t.replace(/```[a-z]*\s*([\s\S]*?)```/gi, '$1'); // fenced code blocks
  t = t.replace(/`+/g, '');                           // inline backticks
  t = t.replace(/^\s*(bash|sh|shell)\s*/i, '');       // language labels
  t = t.replace(/^\s*(command:)\s*/i, '');            // prefixes
  t = t.replace(/^\s*>?\s*\$\s*/gm, '');              // prompts
  const first = t.split(/\r?\n/).find(line => line.trim()) || '';
  return first.trim();
}

// ---------- API ----------
app.post('/api/convert', rateLimit, async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error: 'No instruction provided' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a terminal expert. Convert the given English instruction into a valid and safe terminal command. Output only the command. No quotes. No backticks. No markdown. No explanation.'
        },
        { role: 'user', content: instruction }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const command = cleanCommand(raw);
    return res.json({ command });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong with OpenRouter API' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
