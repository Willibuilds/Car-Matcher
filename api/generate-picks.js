import { put } from "@vercel/blob";

export default async function handler(req, res) {
  const ADMIN_PASSWORD = "ClaudeCode123!";

  if (req.method === "GET" && req.query.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    const prompt = `
    You are an expert automotive advisor for the UK market.
    Generate exactly 3 great daily car recommendations for UK drivers.
    Mix it up — include a mix of budgets and car types (one budget pick, one mid-range, one premium).
    Focus on cars that are well-suited to UK roads, pricing, and lifestyle.
    Respond ONLY with a JSON object in this exact format, no other text:
    {
      "date": "${new Date().toISOString().split("T")[0]}",
      "picks": [
        {
          "car": "Make Model Year",
          "price": "£X,000 - £X,000",
          "category": "Budget Pick",
          "description": "Two sentence description of why this is a great car for UK drivers.",
          "searchTerm": "Wikipedia search term for this car model"
        },
        {
          "car": "Make Model Year",
          "price": "£X,000 - £X,000",
          "category": "Best Value",
          "description": "Two sentence description of why this is a great car for UK drivers.",
          "searchTerm": "Wikipedia search term for this car model"
        },
        {
          "car": "Make Model Year",
          "price": "£X,000 - £X,000",
          "category": "Premium Choice",
          "description": "Two sentence description of why this is a great car for UK drivers.",
          "searchTerm": "Wikipedia search term for this car model"
        }
      ]
    }
    `;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    const groqData = await groqRes.json();
    const raw = groqData.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    // Save to Vercel Blob using SDK
    await put("daily-picks.json", JSON.stringify(parsed), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json"
    });

    console.log("Daily picks generated and saved for", parsed.date);
    res.status(200).json({ success: true, picks: parsed });

  } catch (error) {
    console.error("Generate picks error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
