const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.post('/api/convert', async (req, res) => {
  const { instruction } = req.body;

  if (!instruction) {
    return res.status(400).json({ error: 'No instruction provided' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a terminal expert. Convert the given English instruction into a valid and safe terminal command. Only output the command — no explanation.'
        },
        {
          role: 'user',
          content: instruction
        }
      ]
    });

    const command = completion.choices[0].message.content.trim();
    res.json({ command });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
