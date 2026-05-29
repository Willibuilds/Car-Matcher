export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { budget, use, fuel } = req.body;
    const prompt = `
    You are an expert automotive advisor.
    Recommend the ideal car for this person based on:
    Budget: £${budget}
    Primary use: ${use}
    Fuel preference: ${fuel}

    Requirements:
    - Give ONE car recommendation
    - Keep it short and premium
    - No emojis
    - Respond ONLY with a JSON object in this exact format, no other text:
    {"car": "Make Model Year", "description": "Your recommendation here.", "wiki": "Wikipedia article title for this exact car model"}
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    // Fetch image from Wikipedia
    let imageUrl = null;
    if (parsed.wiki) {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(parsed.wiki)}`
      );
      const wikiData = await wikiRes.json();
      imageUrl = wikiData?.originalimage?.source || wikiData?.thumbnail?.source || null;
    }

    res.status(200).json({
      car: parsed.car || "Unknown",
      recommendation: parsed.description || "No recommendation available",
      imageUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
