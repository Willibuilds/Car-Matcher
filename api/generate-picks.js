import { put } from "@vercel/blob";

export default async function handler(req, res) {
  const ADMIN_PASSWORD = "ClaudeCode123!";

  if (req.method === "GET" && req.query.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    // Check API key exists
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set!");
      return res.status(500).json({ error: "GROQ_API_KEY environment variable is missing" });
    }

    console.log("Calling Groq API...");

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
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    console.log("Groq response status:", groqRes.status);

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", errText);
      return res.status(500).json({ error: "Groq API failed: " + errText });
    }

    const groqData = await groqRes.json();
    console.log("Groq raw response:", JSON.stringify(groqData).slice(0, 300));

    const raw = groqData.choices?.[0]?.message?.content || "{}";
    console.log("Groq content:", raw.slice(0, 300));

    const parsed = JSON.parse(raw);
    console.log("Parsed picks count:", parsed.picks?.length);

    if (!parsed.picks || parsed.picks.length === 0) {
      return res.status(500).json({ error: "Groq returned no picks. Raw: " + raw.slice(0, 200) });
    }

    const blob = await put("daily-picks.json", JSON.stringify(parsed), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json"
    });

    console.log("Daily picks saved to:", blob.url);
    res.status(200).json({ success: true, picks: parsed.picks, date: parsed.date });

  } catch (error) {
    console.error("Generate picks error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
