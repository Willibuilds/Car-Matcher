export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Fetch from Vercel Blob
    const blobRes = await fetch("https://blob.vercel-storage.com/daily-picks.json", {
      headers: {
        "Authorization": `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    if (!blobRes.ok) {
      return res.status(404).json({ error: "No picks available yet" });
    }

    const picks = await blobRes.json();
    res.status(200).json(picks);

  } catch (error) {
    console.error("Get picks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
