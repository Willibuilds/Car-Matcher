export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { budget, use, fuel } = req.body;

    // Validation
    if (!budget || !use || !fuel) {
      return res.status(400).json({
        error: "Please complete all fields"
      });
    }

    const budgetNumber = Number(budget);

    if (
      Number.isNaN(budgetNumber) ||
      budgetNumber < 1000 ||
      budgetNumber > 500000
    ) {
      return res.status(400).json({
        error: "Invalid budget"
      });
    }

    const prompt = `
You are an expert UK automotive advisor.

Recommend ONE real vehicle available on the UK market.

Customer:
- Budget: £${budgetNumber}
- Primary use: ${use}
- Fuel preference: ${fuel}

Requirements:
- Stay realistically within budget
- Prioritise reliability, value for money and suitability
- Include a sensible model year
- Consider UK ownership costs
- Avoid luxury or exotic vehicles unless budget exceeds £50,000
- Keep description concise and professional
- No emojis

Respond ONLY with a JSON object:

{
  "car": "Make Model Year",
  "description": "Short explanation",
  "wiki": "Exact Wikipedia article title"
}
`;

    // 15 second timeout
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: {
            type: "json_object"
          },
          temperature: 0.5
        })
      }
    );

    clearTimeout(timeout);

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq Error:", groqData);

      return res.status(500).json({
        error: "AI recommendation service unavailable"
      });
    }

    const rawContent =
      groqData.choices?.[0]?.message?.content || "{}";

    let parsed;

    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      console.error("JSON Parse Error:", err);

      parsed = {
        car: "Recommendation unavailable",
        description:
          "Unable to generate a recommendation at this time."
      };
    }

    // Wikipedia image lookup
    let imageUrl = null;

    if (parsed.wiki) {
      try {
        const wikiResponse = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            parsed.wiki
          )}`
        );

        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();

          imageUrl =
            wikiData?.originalimage?.source ||
            wikiData?.thumbnail?.source ||
            null;
        }
      } catch (wikiError) {
        console.error("Wikipedia Error:", wikiError);
      }
    }

    return res.status(200).json({
      car: parsed.car || "Unknown vehicle",
      recommendation:
        parsed.description ||
        "No recommendation available.",
      imageUrl
    });

  } catch (error) {
    console.error("API Error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
