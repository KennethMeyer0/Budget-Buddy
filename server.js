// server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const AI21_API_KEY = "010104bf-aea3-42df-80ef-4da267f74645";

app.post('/api/ai21', async (req, res) => {
  try {
    const { prompt } = req.body;
    const aiRes = await fetch(
      "https://api.ai21.com/studio/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AI21_API_KEY}`
        },
        body: JSON.stringify({
          model: "jamba-instruct-preview",  // or "jamba-instruct" if production-ready
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150
        })
      }
    );

    const text = await aiRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("AI21 returned non-JSON:", text);
      return res
        .status(aiRes.status)
        .json({ error: `AI21 error (${aiRes.status}): ${text.trim()}` });
    }

    res.status(aiRes.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "AI21 proxy internal error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running at http://localhost:${PORT}`));
