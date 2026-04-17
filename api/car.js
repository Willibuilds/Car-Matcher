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
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    const recommendation = data.choices?.[0]?.message?.content || "No recommendation available";

    res.status(200).json({ recommendation });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

