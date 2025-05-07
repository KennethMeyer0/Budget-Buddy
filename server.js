// server.js
import express from 'express';
import cors    from 'cors';
import fetch   from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const AI21_API_KEY = "010104bf-aea3-42df-80ef-4da267f74645";

app.post('/api/ai21', async (req, res) => {
  try {
    const { prompt } = req.body;

    // New Chat Completions call:
    const aiRes = await fetch(
      "https://api.ai21.com/studio/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AI21_API_KEY}`
        },
        body: JSON.stringify({
          model: "jamba-large",            // pick jamba-large or jamba-mini
          messages: [
            { role: "system",    content: "You are Budget-Buddy, a friendly budgeting assistant." },
            { role: "user",      content: prompt }
          ],
          max_tokens: 150,                 // adjust as needed
          temperature: 0.7,
          top_p: 1.0,
          n: 1
        })
      }
    );

    const data = await aiRes.json();
    res.status(aiRes.status).json(data);

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "AI21 proxy internal error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running at http://localhost:${PORT}`));
