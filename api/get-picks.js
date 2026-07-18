export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Fetch directly from the public blob URL
    const storeId = process.env.BLOB_STORE_ID;
    const blobUrl = `https://${storeId}.public.blob.vercel-storage.com/daily-picks.json`;
    
    const dataRes = await fetch(blobUrl, {
      headers: { "Cache-Control": "no-cache" }
    });

    if (!dataRes.ok) {
      console.log("Blob fetch failed:", dataRes.status, blobUrl);
      return res.status(404).json({ error: "No picks available yet" });
    }

    const picks = await dataRes.json();
    console.log("Picks fetched successfully:", JSON.stringify(picks).slice(0, 100));

    // Set cache headers to avoid stale data
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(picks);

  } catch (error) {
    console.error("Get picks error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
