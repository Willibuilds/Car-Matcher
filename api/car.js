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

    // Improved Wikipedia image fetch — search first, then get image
    let imageUrl = null;

    if (parsed.searchTerm || parsed.car) {
      const searchQuery = parsed.searchTerm || parsed.car;

      try {
        // Step 1: Search Wikipedia for the best matching article
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*&srlimit=3`
        );
        const searchData = await searchRes.json();
        const topResult = searchData?.query?.search?.[0];

        if (topResult) {
          // Step 2: Fetch the page summary and image for the top result
          const pageTitle = encodeURIComponent(topResult.title);
          const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`
          );
          const summaryData = await summaryRes.json();
          imageUrl = summaryData?.originalimage?.source || summaryData?.thumbnail?.source || null;

          // Step 3: If no image in summary, try the page images API
          if (!imageUrl) {
            const imgRes = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&titles=${pageTitle}&prop=pageimages&format=json&pithumbsize=800&origin=*`
            );
            const imgData = await imgRes.json();
            const pages = imgData?.query?.pages;
            if (pages) {
              const page = Object.values(pages)[0];
              imageUrl = page?.thumbnail?.source || null;
            }
          }
        }
      } catch (imgErr) {
        console.error("Image fetch failed:", imgErr);
        imageUrl = null;
      }
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
