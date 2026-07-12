export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, picks } = req.body;

  if (password !== "ClaudeCode123!") {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    const payload = {
      date: new Date().toISOString().split("T")[0],
      picks
    };

    const blobRes = await fetch("https://blob.vercel-storage.com/daily-picks.json", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        "Content-Type": "application/json",
        "x-content-type": "application/json",
        "x-add-random-suffix": "0"
      },
      body: JSON.stringify(payload)
    });

    if (!blobRes.ok) {
      const err = await blobRes.text();
      console.error("Blob save failed:", err);
      return res.status(500).json({ error: "Failed to save picks" });
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Save picks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
