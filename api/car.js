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
    {"car": "Make Model Year", "description": "Your recommendation here.", "searchTerm": "the best Wikipedia search term to find this exact car model, e.g. Toyota Corolla E210"}
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

    // Helper: safely fetch + parse JSON, returns null on any failure (never throws)
    async function safeFetchJson(url, label) {
      try {
        const r = await fetch(url, {
          headers: { "User-Agent": "MotorUnite/1.0 (contact@motorunite.com)" }
        });
        const text = await r.text();

        if (!r.ok) {
          console.log(`[${label}] HTTP ${r.status} for ${url}`);
          console.log(`[${label}] Response body (first 200 chars): ${text.slice(0, 200)}`);
          return null;
        }

        try {
          return JSON.parse(text);
        } catch (parseErr) {
          console.log(`[${label}] JSON parse failed for ${url}`);
          console.log(`[${label}] Response body (first 200 chars): ${text.slice(0, 200)}`);
          return null;
        }
      } catch (fetchErr) {
        console.log(`[${label}] Fetch threw: ${fetchErr.message}`);
        return null;
      }
    }

    let imageUrl = null;

    if (parsed.searchTerm || parsed.car) {
      const searchQuery = parsed.searchTerm || parsed.car;

      // Step 1: Search Wikipedia for the best matching article
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*&srlimit=3`;
      const searchData = await safeFetchJson(searchUrl, "search");
      const topResult = searchData?.query?.search?.[0];

      if (topResult) {
        console.log("Top Wikipedia match:", topResult.title);

        // Step 2: Fetch the page summary (REST API needs underscores for spaces)
        const restTitle = encodeURIComponent(topResult.title.replace(/ /g, "_"));
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${restTitle}`;
        const summaryData = await safeFetchJson(summaryUrl, "summary");

        if (summaryData) {
          imageUrl = summaryData?.originalimage?.source || summaryData?.thumbnail?.source || null;
        }

        // Step 3: Fallback to pageimages API if summary had no image
        if (!imageUrl) {
          const actionTitle = encodeURIComponent(topResult.title);
          const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${actionTitle}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
          const imgData = await safeFetchJson(imgUrl, "pageimages");

          const pages = imgData?.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0];
            imageUrl = page?.thumbnail?.source || null;
          }
        }
      } else {
        console.log("No Wikipedia search results for:", searchQuery);
      }
    }

    console.log("Final image result for", parsed.car, "→", imageUrl ? imageUrl : "NONE");

    res.status(200).json({
      car: parsed.car || "Unknown",
      recommendation: parsed.description || "No recommendation available",
      imageUrl
    });

  } catch (error) {
    console.error("Top level error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
