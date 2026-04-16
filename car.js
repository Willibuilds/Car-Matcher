import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { budget, use, fuel } = req.body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    const recommendation = response.choices[0].message.content;

    res.status(200).json({ recommendation });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

